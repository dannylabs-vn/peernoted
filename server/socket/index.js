const jwt = require('jsonwebtoken');
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
      roomsPresence.get(roomId).set(socket.userId, {
        socketId: socket.id,
        user: { ...socket.user, role: member.role, peer_points: member.peer_points }
      });

      // Broadcast online status to room
      io.to(roomId).emit('user-online', {
        user: { ...socket.user, role: member.role, peer_points: member.peer_points }
      });

      // Send current online users to the joining user
      const onlineUsers = Array.from(roomsPresence.get(roomId).values()).map(p => p.user);
      socket.emit('room-online-users', { users: onlineUsers });

      console.log(`  👤 ${socket.user.name} joined room ${roomId}`);
    });

    // ── Leave room ──
    socket.on('leave-room', ({ roomId }) => {
      handleLeaveRoom(io, socket, roomId);
    });

    // ── Send message ──
    socket.on('send-message', async ({ roomId, channelId, content }) => {
      if (!content || !content.trim()) return;
      if (!roomId || !channelId) return;

      const message = {
        id: `${Date.now()}-${socket.userId}`,
        roomId,
        channelId,
        user: socket.user,
        content: content.trim(),
        type: 'text',
        createdAt: new Date().toISOString()
      };

      // Broadcast to room (exclude sender for now, they'll optimistically add it)
      socket.to(roomId).emit('new-message', message);

      // Also send back to sender for confirmation
      socket.emit('new-message', message);
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

    // ── Disconnect ──
    socket.on('disconnect', () => {
      console.log(`🔴 Socket disconnected: ${socket.user.name}`);
      if (socket.currentRoom) {
        handleLeaveRoom(io, socket, socket.currentRoom);
      }
    });
  });
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
