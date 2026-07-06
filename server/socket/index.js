const jwt = require('jsonwebtoken');
const socketIo = require('socket.io');
const { getMessages, saveMessage, getNicknames, saveNickname, getNickname } = require('../dataStore');
const { supabase } = require('../config/supabase');
const { answerRoomQuestion, generateQuiz } = require('../services/aiService');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

// In-memory presence tracking: Map<roomId, Map<userId, { socketId, user }>>
const roomsPresence = new Map();

// ── PeerBot: trợ giảng AI trong phòng học ──
const BOT_USER = { id: 'peerbot', name: 'PeerBot 🤖', email: '', avatar: '' };
const AI_MENTION = /^@(ai|bot|peerbot)\b/i;

// ── PvP Quiz Battle: match state in-memory (đủ cho 1 instance Render) ──
// Map<battleId, {id, roomId, hostId, folderId, folderName, status, questions,
//                timePerQ, currentIndex, players: Map<userId,{user,score,answered}>, timer}>
const battles = new Map();
let battleSeq = 0;

function setupSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, JWT_SECRET);
      const { data: user } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .eq('id', decoded.id)
        .maybeSingle();
      if (!user) return next(new Error('User not found'));
      socket.userId = user.id;
      socket.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar_url || ''
      };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔵 Socket connected: ${socket.user.name} (${socket.id})`);
    
    // Broadcast total online users to everyone whenever someone connects
    emitGlobalOnlineUsers(io);

    // Join a personal room for private messages
    socket.join(socket.userId);

    // ── Join room ──
    socket.on('join-room', async ({ roomId }) => {
      // Verify membership
      const { data: member } = await supabase
        .from('room_members')
        .select('id, role, peer_points')
        .eq('room_id', roomId)
        .eq('user_id', socket.userId)
        .maybeSingle();

      if (!member) {
        socket.emit('error', { message: 'You are not a member of this room' });
        return;
      }

      socket.join(roomId);
      socket.currentRoom = roomId;

      // Track presence
      if (!roomsPresence.has(roomId)) {
        roomsPresence.set(roomId, new Map());
      }
      
      const savedNick = getNickname(roomId, socket.userId);
      const userObj = { ...socket.user, role: member.role, peer_points: member.peer_points };
      if (savedNick) userObj.nickname = savedNick;
      socket.user = userObj; // ensure socket has it too

      roomsPresence.get(roomId).set(socket.userId, {
        socketId: socket.id,
        user: userObj
      });

      // Broadcast online status to room
      io.to(roomId).emit('user-online', {
        user: userObj
      });

      // Send current online users to the joining user
      const onlineUsers = Array.from(roomsPresence.get(roomId).values()).map(p => p.user);
      socket.emit('room-online-users', { users: onlineUsers });

      // Nếu phòng đang có trận PvP ở lobby → báo cho người vừa vào để họ JOIN
      // (không phải tự tạo trận mới). Fix "mỗi người chơi lẻ".
      const activeBattle = [...battles.values()].find(
        b => b.roomId === roomId && b.status === 'lobby'
      );
      if (activeBattle) {
        socket.emit('battle-created', {
          battleId: activeBattle.id,
          host: activeBattle.players.get(activeBattle.hostId)?.user || null,
          folderName: activeBattle.folderName,
          questionCount: activeBattle.questions.length,
          timePerQ: activeBattle.timePerQ,
          players: [...activeBattle.players.values()].map(p => ({ user: p.user, score: p.score }))
        });
      }

      console.log(`  👤 ${socket.user.name} joined room ${roomId}`);
    });

    // ── Change nickname ──
    socket.on('change-nickname', async ({ roomId, nickname }) => {
      if (roomsPresence.has(roomId) && roomsPresence.get(roomId).has(socket.userId)) {
        const presence = roomsPresence.get(roomId).get(socket.userId);
        presence.user.nickname = nickname; // update in memory
        socket.user.nickname = nickname;   // also update on the socket itself for future messages
        
        // Update database in background (might fail if no column)
        supabase.from('room_members').update({ nickname }).eq('room_id', roomId).eq('user_id', socket.userId).then();
        // Fallback: save to local dataStore
        saveNickname(roomId, socket.userId, nickname);
        
        io.to(roomId).emit('user-nickname-changed', { userId: socket.userId, nickname });
        console.log(`  📝 ${socket.user.name} changed nickname to ${nickname} in room ${roomId}`);
      }
    });

    // ── Leave room ──
    socket.on('leave-room', ({ roomId }) => {
      handleLeaveRoom(io, socket, roomId);
    });

    // ── Send message ──
    socket.on('send-message', async ({ roomId, channelId, content }, ack) => {
      const reply = (payload) => {
        if (typeof ack === 'function') ack(payload);
      };

      try {
        if (!content || !content.trim()) {
          reply({ ok: false, error: 'Tin nhắn trống' });
          return;
        }
        if (!roomId || !channelId) {
          reply({ ok: false, error: 'Thiếu room hoặc channel' });
          return;
        }

        // Verify membership before allowing a message to be broadcast.
        const { data: member, error: memberError } = await supabase
          .from('room_members')
          .select('id')
          .eq('room_id', roomId)
          .eq('user_id', socket.userId)
          .maybeSingle();

        if (memberError) throw memberError;
        if (!member) {
          reply({ ok: false, error: 'Bạn không phải thành viên của phòng này' });
          return;
        }

        const { data: channel, error: channelError } = await supabase
          .from('room_channels')
          .select('id')
          .eq('id', channelId)
          .eq('room_id', roomId)
          .maybeSingle();

        if (channelError) throw channelError;
        if (!channel) {
          reply({ ok: false, error: 'Channel không tồn tại trong phòng này' });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.join(roomId);
          socket.currentRoom = roomId;
        }

        const { data: insertedMsg, error: insertError } = await supabase
          .from('room_messages')
          .insert({
            room_id: roomId,
            channel_id: channelId,
            user_id: socket.userId,
            content: content.trim(),
            type: 'text'
          })
          .select('*')
          .single();

        let message;
        if (insertError) {
          // Fallback to local file storage
          message = {
            id: `${Date.now()}-${socket.userId}`,
            roomId,
            channelId,
            user: socket.user,
            content: content.trim(),
            type: 'text',
            createdAt: new Date().toISOString()
          };
          saveMessage(message);
        } else {
          message = {
            id: insertedMsg.id,
            roomId,
            channelId,
            user: socket.user,
            content: insertedMsg.content,
            type: insertedMsg.type,
            createdAt: insertedMsg.created_at
          };
        }

        // Broadcast to room, including sender.
        io.to(roomId).emit('new-message', message);
        reply({ ok: true, message });

        // PeerBot: tin nhắn bắt đầu bằng @AI / @bot / @peerbot → trợ giảng trả lời.
        // Fire-and-forget để không block ack của tin nhắn gốc.
        if (AI_MENTION.test(content.trim())) {
          handleAIMention(io, roomId, channelId, content.trim()).catch(err =>
            console.error('[PeerBot]', err.message)
          );
        }
      } catch (err) {
        console.error('[Socket send-message]', err);
        reply({ ok: false, error: err.message || 'Không gửi được tin nhắn' });
      }
    });

    // ═══════════════════════════════════════════════════════════
    // PvP QUIZ BATTLE — Kahoot-style trong phòng học
    // ═══════════════════════════════════════════════════════════

    // Host tạo trận: AI gen câu hỏi từ folder tài liệu của phòng hoặc thư viện
    socket.on('battle-create', async ({ roomId, folderId, timePerQ = 15 }, ack) => {
      const reply = (p) => { if (typeof ack === 'function') ack(p); };
      try {
        if (!socket.rooms.has(roomId)) {
          reply({ ok: false, error: 'Bạn chưa join phòng này' });
          return;
        }
        // Chỉ 1 trận active / phòng
        const existing = [...battles.values()].find(b => b.roomId === roomId && b.status !== 'finished');
        if (existing) {
          reply({ ok: false, error: 'Phòng đang có trận đấu khác' });
          return;
        }

        // Gom text từ folder (thư viện của host) để gen câu hỏi
        const { data: files } = await supabase
          .from('files').select('extracted_text').eq('folder_id', folderId);
        const allTexts = (files || [])
          .map(f => f.extracted_text).filter(t => t && t.trim()).join('\n\n---\n\n');
        if (!allTexts || allTexts.trim().length < 20) {
          reply({ ok: false, error: 'Folder không đủ nội dung để tạo câu hỏi' });
          return;
        }
        const { data: folder } = await supabase
          .from('folders').select('name').eq('id', folderId).maybeSingle();

        reply({ ok: true, generating: true });
        io.to(roomId).emit('battle-generating', { by: socket.user.name });

        const questions = await generateQuiz(allTexts, folder?.name || '');

        const battleId = `battle-${Date.now()}-${++battleSeq}`;
        const battle = {
          id: battleId, roomId, hostId: socket.userId,
          folderId, folderName: folder?.name || 'Tài liệu',
          status: 'lobby', questions, timePerQ,
          currentIndex: -1, players: new Map(), timer: null, questionStartAt: 0
        };
        battle.players.set(socket.userId, { user: socket.user, score: 0, answered: false });
        battles.set(battleId, battle);

        io.to(roomId).emit('battle-created', {
          battleId, host: socket.user, folderName: battle.folderName,
          questionCount: questions.length, timePerQ,
          players: [...battle.players.values()].map(p => ({ user: p.user, score: p.score }))
        });
      } catch (err) {
        console.error('[Battle create]', err);
        reply({ ok: false, error: err.message });
        io.to(roomId).emit('battle-error', { error: 'Không tạo được trận đấu: ' + err.message });
      }
    });

    socket.on('battle-join', ({ battleId }, ack) => {
      const reply = (p) => { if (typeof ack === 'function') ack(p); };
      const battle = battles.get(battleId);
      if (!battle || battle.status !== 'lobby') {
        reply({ ok: false, error: 'Trận đấu không tồn tại hoặc đã bắt đầu' });
        return;
      }
      if (!battle.players.has(socket.userId)) {
        battle.players.set(socket.userId, { user: socket.user, score: 0, answered: false });
      }
      io.to(battle.roomId).emit('battle-lobby', {
        battleId,
        players: [...battle.players.values()].map(p => ({ user: p.user, score: p.score }))
      });
      reply({ ok: true });
    });

    socket.on('battle-start', ({ battleId }, ack) => {
      const reply = (p) => { if (typeof ack === 'function') ack(p); };
      const battle = battles.get(battleId);
      if (!battle) { reply({ ok: false, error: 'Trận không tồn tại' }); return; }
      if (battle.hostId !== socket.userId) { reply({ ok: false, error: 'Chỉ host được bắt đầu' }); return; }
      if (battle.status !== 'lobby') { reply({ ok: false, error: 'Trận đã bắt đầu' }); return; }
      battle.status = 'playing';
      reply({ ok: true });
      nextBattleQuestion(io, battle);
    });

    socket.on('battle-answer', ({ battleId, index, answer }, ack) => {
      const reply = (p) => { if (typeof ack === 'function') ack(p); };
      const battle = battles.get(battleId);
      if (!battle || battle.status !== 'playing' || battle.currentIndex !== index) {
        reply({ ok: false }); return;
      }
      const player = battle.players.get(socket.userId);
      if (!player || player.answered) { reply({ ok: false }); return; }

      player.answered = true;
      const q = battle.questions[index];
      const correct = answer === q.answer;
      const elapsed = (Date.now() - battle.questionStartAt) / 1000;
      const timeLeft = Math.max(0, battle.timePerQ - elapsed);
      // Điểm kiểu Kahoot: đúng = 100 điểm gốc + tối đa 100 điểm tốc độ
      const gained = correct ? Math.round(100 + (100 * timeLeft) / battle.timePerQ) : 0;
      player.score += gained;
      player.lastCorrect = correct;

      // Lưu quiz_attempts để tính năng "Vá lỗi" phân tích điểm yếu (best-effort)
      supabase.from('quiz_attempts').insert({
        user_id: socket.userId, folder_id: battle.folderId,
        question_text: q.question, options: q.options,
        correct_answer: q.answer, user_answer: answer,
        is_correct: correct, topic_tag: q.topic_tag || '', explanation: q.explanation || ''
      }).then(({ error }) => { if (error) console.warn('[Battle attempt save]', error.message); });

      reply({ ok: true, correct, gained });

      // Mọi người đã trả lời → reveal sớm không cần chờ hết giờ
      const allAnswered = [...battle.players.values()].every(p => p.answered);
      if (allAnswered && battle.timer) {
        clearTimeout(battle.timer);
        revealBattleAnswer(io, battle);
      }
    });

    // ── Typing ──
    socket.on('typing', ({ roomId, channelId, isTyping }) => {
      socket.to(roomId).emit('user-typing', {
        roomId,
        channelId,
        userId: socket.userId,
        userName: socket.user.name,
        isTyping
      });
    });

    // ── Private Messages ──
    socket.on('send-private-message', async (data) => {
      const { receiverId, content, msgId } = data;
      // Emit to receiver
      socket.to(receiverId).emit('private-message', {
        id: msgId || Date.now().toString(),
        sender_id: socket.userId,
        receiver_id: receiverId,
        content: content,
        created_at: new Date().toISOString(),
        sender: socket.user
      });
      // Also emit back to sender to confirm (if they have multiple tabs open)
      socket.emit('private-message', {
        id: msgId || Date.now().toString(),
        sender_id: socket.userId,
        receiver_id: receiverId,
        content: content,
        created_at: new Date().toISOString(),
        sender: socket.user
      });
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      console.log(`🔴 Socket disconnected: ${socket.user.name} (${socket.id})`);
      if (socket.currentRoom) {
        handleLeaveRoom(io, socket, socket.currentRoom);
      }
      // Delay emit to ensure socket is fully removed from io.fetchSockets()
      setTimeout(() => emitGlobalOnlineUsers(io), 50);
    });
  });
}

async function emitGlobalOnlineUsers(io) {
  try {
    const sockets = await io.fetchSockets();
    const uniqueUsers = new Set();
    sockets.forEach(s => {
      if (s.userId) uniqueUsers.add(s.userId);
    });
    io.emit('global-online-users', uniqueUsers.size);
  } catch (err) {
    console.error('Error counting global users:', err);
  }
}

function handleLeaveRoom(io, socket, roomId) {
  if (!roomId) return;

  const presence = roomsPresence.get(roomId);
  if (presence) {
    presence.delete(socket.userId);
    if (presence.size === 0) {
      roomsPresence.delete(roomId);
    }
  }

  socket.leave(roomId);
  socket.to(roomId).emit('user-offline', { userId: socket.userId });
  socket.currentRoom = null;
}

// ═══════════════════════════════════════════════════════════════
// PeerBot — trợ giảng AI: lấy context từ room_files rồi trả lời
// ═══════════════════════════════════════════════════════════════
async function handleAIMention(io, roomId, channelId, content) {
  const question = content.replace(AI_MENTION, '').trim();
  if (!question) return;

  // Typing indicator cho cảm giác bot "đang gõ"
  io.to(roomId).emit('user-typing', {
    roomId, channelId, userId: BOT_USER.id, userName: BOT_USER.name, isTyping: true
  });

  try {
    const [{ data: room }, { data: roomFiles }] = await Promise.all([
      supabase.from('rooms').select('name').eq('id', roomId).maybeSingle(),
      supabase.from('room_files').select('extracted_text')
        .eq('room_id', roomId).order('created_at', { ascending: false }).limit(5)
    ]);
    const contextTexts = (roomFiles || [])
      .map(f => f.extracted_text).filter(t => t && t.trim()).join('\n\n---\n\n');

    const answer = await answerRoomQuestion(question, contextTexts, room?.name || '');

    const botMessage = {
      id: `ai-${Date.now()}`,
      roomId, channelId,
      user: BOT_USER,
      content: answer,
      type: 'text',
      createdAt: new Date().toISOString()
    };
    // Persist qua dataStore — endpoint messages merge DB + local nên history giữ được
    saveMessage(botMessage);
    io.to(roomId).emit('new-message', botMessage);
  } catch (err) {
    io.to(roomId).emit('new-message', {
      id: `ai-${Date.now()}`, roomId, channelId, user: BOT_USER,
      content: '⚠️ PeerBot đang gặp sự cố, thử lại sau nhé: ' + err.message,
      type: 'text', createdAt: new Date().toISOString()
    });
  } finally {
    io.to(roomId).emit('user-typing', {
      roomId, channelId, userId: BOT_USER.id, userName: BOT_USER.name, isTyping: false
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// PvP Battle helpers
// ═══════════════════════════════════════════════════════════════
function nextBattleQuestion(io, battle) {
  battle.currentIndex++;
  if (battle.currentIndex >= battle.questions.length) {
    finishBattle(io, battle);
    return;
  }
  // Reset trạng thái trả lời
  for (const p of battle.players.values()) { p.answered = false; p.lastCorrect = false; }
  battle.questionStartAt = Date.now();

  const q = battle.questions[battle.currentIndex];
  io.to(battle.roomId).emit('battle-question', {
    battleId: battle.id,
    index: battle.currentIndex,
    total: battle.questions.length,
    question: q.question,
    options: q.options,   // KHÔNG gửi answer — chống cheat qua devtools
    timePerQ: battle.timePerQ
  });

  battle.timer = setTimeout(() => revealBattleAnswer(io, battle), (battle.timePerQ + 1) * 1000);
}

function revealBattleAnswer(io, battle) {
  if (battle.status !== 'playing') return;
  const q = battle.questions[battle.currentIndex];
  io.to(battle.roomId).emit('battle-reveal', {
    battleId: battle.id,
    index: battle.currentIndex,
    correctAnswer: q.answer,
    explanation: q.explanation || '',
    leaderboard: battleLeaderboard(battle)
  });
  // 4s xem đáp án rồi sang câu tiếp
  battle.timer = setTimeout(() => nextBattleQuestion(io, battle), 4000);
}

async function finishBattle(io, battle) {
  battle.status = 'finished';
  if (battle.timer) clearTimeout(battle.timer);
  const leaderboard = battleLeaderboard(battle);

  io.to(battle.roomId).emit('battle-finished', {
    battleId: battle.id,
    leaderboard,
    folderName: battle.folderName
  });

  // Award PeerPoints: winner +50, người tham gia +10 (best-effort, server tự
  // award trực tiếp room_members — không qua API vì đó là quyền của hệ thống)
  try {
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const bonus = i === 0 ? 50 : 10;
      const { data: member } = await supabase.from('room_members')
        .select('id, peer_points').eq('room_id', battle.roomId)
        .eq('user_id', entry.user.id).maybeSingle();
      if (member) {
        await supabase.from('room_members')
          .update({ peer_points: (member.peer_points || 0) + bonus })
          .eq('id', member.id);
      }
    }
    io.to(battle.roomId).emit('battle-points-awarded', {
      battleId: battle.id,
      awards: leaderboard.map((e, i) => ({ userId: e.user.id, points: i === 0 ? 50 : 10 }))
    });
  } catch (err) {
    console.warn('[Battle award]', err.message);
  }

  // Dọn state sau 60s
  setTimeout(() => battles.delete(battle.id), 60000);
}

function battleLeaderboard(battle) {
  return [...battle.players.values()]
    .sort((a, b) => b.score - a.score)
    .map(p => ({ user: p.user, score: p.score, lastCorrect: !!p.lastCorrect }));
}

module.exports = setupSocket;
