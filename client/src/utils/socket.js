import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected) return socket;

  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('🔵 Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRoom(roomId) {
  if (socket?.connected) {
    socket.emit('join-room', { roomId });
  }
}

export function leaveRoom(roomId) {
  if (socket?.connected) {
    socket.emit('leave-room', { roomId });
  }
}

export function sendMessage(roomId, channelId, content) {
  if (socket?.connected) {
    socket.emit('send-message', { roomId, channelId, content });
  }
}

export function sendTyping(roomId, channelId, isTyping) {
  if (socket?.connected) {
    socket.emit('typing', { roomId, channelId, isTyping });
  }
}
