import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token: string) {
  if (socket?.connected) return socket;

  // Connect directly to the backend URL to avoid Next.js rewrite websocket drops
  const serverUrl = process.env.NEXT_PUBLIC_API_URL 
    ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') 
    : (typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000');
    
  socket = io(serverUrl, {
    path: '/socket.io',
    auth: { token },
    transports: ['polling', 'websocket'],
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

export function joinRoom(roomId: string) {
  if (socket?.connected) {
    socket.emit('join-room', { roomId });
  }
}

export function leaveRoom(roomId: string) {
  if (socket?.connected) {
    socket.emit('leave-room', { roomId });
  }
}

export function sendMessage(roomId: string, channelId: string, content: string): Promise<any> {
  if (!socket?.connected) {
    return Promise.reject(new Error('WebSocket chưa kết nối'));
  }

  return new Promise((resolve, reject) => {
    socket!.timeout(5000).emit('send-message', { roomId, channelId, content }, (err: any, response: any) => {
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

export function sendTyping(roomId: string, channelId: string, isTyping: boolean) {
  if (socket?.connected) {
    socket.emit('typing', { roomId, channelId, isTyping });
  }
}
