const jwt = require('jsonwebtoken');
const socketIo = require('socket.io');
const { getMessages, saveMessage, getNicknames, saveNickname, getNickname } = require('../dataStore');
const { supabase } = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

// In-memory presence tracking: Map<roomId, Map<userId, { socketId, user }>>
const roomsPresence = new Map();

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
      } catch (err) {
        console.error('[Socket send-message]', err);
        reply({ ok: false, error: err.message || 'Không gửi được tin nhắn' });
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

module.exports = setupSocket;
