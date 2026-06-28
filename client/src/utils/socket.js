import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected) return socket;

  const apiUrl = import.meta.env.VITE_API_URL || '';
  const serverUrl = apiUrl
    ? apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
    : undefined;
  
  socket = io(serverUrl, {
    path: '/socket.io',
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
  if (!socket?.connected) {
    return Promise.reject(new Error('WebSocket chưa kết nối'));
  }

  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit('send-message', { roomId, channelId, content }, (err, response) => {
      if (err) {
        reject(new Error('Gửi tin nhắn quá thời gian chờ'));
        return;
      }

      if (!response?.ok) {
        reject(new Error(response?.error || 'Không gửi được tin nhắn'));
        return;
      }

      resolve(response.message);
    });
  });
}

export function sendTyping(roomId, channelId, isTyping) {
  if (socket?.connected) {
    socket.emit('typing', { roomId, channelId, isTyping });
  }
}
