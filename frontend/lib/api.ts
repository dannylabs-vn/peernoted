import axios from 'axios';

// In dev: '/api' goes through Vite proxy / Next rewrite -> localhost:5000.
// In prod: set NEXT_PUBLIC_API_URL to the deployed backend
const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

const API = axios.create({
  baseURL,
  timeout: 300000 // 5 min for AI + TTS generation
});

// Attach JWT token from localStorage on every request
API.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== AUTH =====
export const login = (data: any) => API.post('/auth/login', data);
export const register = (data: any) => API.post('/auth/register', data);
export const loginWithGoogle = (credential: any) => API.post('/auth/google', { credential });
export const getMe = () => API.get('/auth/me');
export const updateMe = (data: any) => API.put('/auth/me', data).then(r => r.data);
export const uploadAvatar = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return API.post('/auth/me/avatar', fd).then(r => r.data);
};

// ===== FOLDERS =====
export const getFolders = () => API.get('/folders');
export const getFolder = (id: string) => API.get(`/folders/${id}`);
export const createFolder = (data: any) => API.post('/folders', data);
export const updateFolder = (id: string, data: any) => API.put(`/folders/${id}`, data);
export const deleteFolder = (id: string) => API.delete(`/folders/${id}`);
export const deleteFolders = (ids: string[]) => API.post('/folders/delete-batch', { ids });

// ===== FILES =====
export const getFiles = (folderId: string) => API.get('/files', { params: { folder_id: folderId } });
export const deleteFile = (id: string) => API.delete(`/files/${id}`);
export const deleteFiles = (ids: string[]) => API.post('/files/delete-batch', { ids });

export const uploadFiles = (folderId: string, files: File[]) => {
  const formData = new FormData();
  formData.append('folder_id', folderId);
  files.forEach(f => formData.append('files', f));
  return API.post('/files/upload', formData);
};

// ===== AI =====
export const classifyFiles = (files: File[]) => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  return API.post('/ai/classify', formData);
};

// Cheat sheet
export const getCheatSheet = (folderId: string) => API.get(`/ai/cheatsheet/${folderId}`);
export const generateMindmap = (folderId: string) => API.post(`/ai/mindmap/${folderId}`).then(r => r.data);
export const clearCheatSheet = (folderId: string) => API.delete(`/ai/cheatsheet/${folderId}`);
export const setCheatSheetTemplate = (folderId: string, template: any) =>
  API.post(`/ai/cheatsheet/${folderId}/template`, { template });
export const migrateCheatSheet = (folderId: string) =>
  API.post(`/ai/cheatsheet/${folderId}/migrate`);
export const analyzeHandwriting = (folderId: string, file: File) => {
  const fd = new FormData();
  fd.append('image', file);
  return API.post(`/ai/cheatsheet/${folderId}/handwriting`, fd);
};
export const pickHandwritingFontManual = (folderId: string, fontFamily: string) =>
  API.post(`/ai/cheatsheet/${folderId}/handwriting/manual`, { font_family: fontFamily });

// Podcast
export const generatePodcast = (folderId: string) => API.post(`/ai/podcast/${folderId}`);
export const clearPodcast = (folderId: string) => API.delete(`/ai/podcast/${folderId}`);

// Recommendations
export const getRecommendations = (folderId: string) => API.post(`/ai/recommend/${folderId}`);

// ===== ROOMS =====
export const getRooms = () => API.get('/rooms').then(r => r.data);
export const getRoomDetail = (id: string) => API.get(`/rooms/${id}`).then(r => r.data);
export const createRoom = (data: any) => API.post('/rooms', data).then(r => r.data);
export const updateRoom = (id: string, data: any) => API.put(`/rooms/${id}`, data).then(r => r.data);
export const deleteRoom = (id: string) => API.delete(`/rooms/${id}`);
export const joinRoom = (invite_code: string) => API.post('/rooms/join', { invite_code }).then(r => r.data);

// ===== ROOM FILES =====
export const uploadRoomFile = (roomId: string, file: File, channel_id = '') => {
  const fd = new FormData();
  fd.append('file', file);
  if (channel_id) fd.append('channel_id', channel_id);
  return API.post(`/rooms/${roomId}/files`, fd).then(r => r.data);
};
export const getRoomFiles = (roomId: string) => API.get(`/rooms/${roomId}/files`).then(r => r.data);
export const deleteRoomFile = (roomId: string, fileId: string) => API.delete(`/rooms/${roomId}/files/${fileId}`);
export const importLibraryFile = (roomId: string, file_id: string, channel_id = '') =>
  API.post(`/rooms/${roomId}/library-files`, { file_id, channel_id }).then(r => r.data);

// ===== ROOM CHANNELS =====
export const getRoomMessages = (roomId: string, channelId: string) => 
  API.get(`/rooms/${roomId}/channels/${channelId}/messages`).then(r => r.data);
export const createChannel = (roomId: string, data: any) =>
  API.post(`/rooms/${roomId}/channels`, data).then(r => r.data);
export const updateChannel = (roomId: string, channelId: string, data: any) =>
  API.put(`/rooms/${roomId}/channels/${channelId}`, data).then(r => r.data);
export const deleteChannel = (roomId: string, channelId: string) =>
  API.delete(`/rooms/${roomId}/channels/${channelId}`);

// ===== ROOM MEMBERS =====
export const getRoomMembers = (roomId: string) => API.get(`/rooms/${roomId}/members`).then(r => r.data);
export const changeMemberRole = (roomId: string, userId: string, role: string) =>
  API.put(`/rooms/${roomId}/members/${userId}`, { role }).then(r => r.data);
export const kickMember = (roomId: string, userId: string) =>
  API.delete(`/rooms/${roomId}/members/${userId}`);

// ===== PEERPOINTS =====
export const getPeerPoints = (userId: string) => API.get(`/peerpoints/${userId}`).then(r => r.data);
export const awardPoints = (roomId: string, userId: string, points: number, reason = '') =>
  API.post('/peerpoints/award', { room_id: roomId, user_id: userId, points, reason }).then(r => r.data);

// ===== REWARDS =====
export const getRewards = () => API.get('/rewards').then(r => r.data);
export const unlockReward = (rewardId: string) =>
  API.post('/rewards/unlock', { reward_id: rewardId }).then(r => r.data);

// ===== AI ROLE =====
export const suggestRoles = (roomId: string, memberIds: string[]) =>
  API.post('/ai/suggest-role', { roomId, memberIds }).then(r => r.data);

// ===== QUIZ & SPACED REPETITION =====
export const generateQuiz = (folderId: string) => API.post(`/quiz/generate/${folderId}`).then(r => r.data);
export const submitQuiz = (data: any) => API.post('/quiz/submit', data).then(r => r.data);
export const getQuizStats = () => API.get('/quiz/stats').then(r => r.data);
export const getSpacedRepetitionItems = () => API.get('/quiz/spaced-repetition').then(r => r.data);
export const reviewSpacedRepetition = (id: string, is_correct: boolean) =>
  API.post(`/quiz/spaced-repetition/review/${id}`, { is_correct }).then(r => r.data);

// ===== FRIENDS & DIRECT MESSAGES =====
export const getFriends = () => API.get('/friends').then(r => r.data);
export const sendFriendRequest = (email: string) => API.post('/friends/request', { email }).then(r => r.data);
export const acceptFriendRequest = (id: string) => API.post(`/friends/accept/${id}`).then(r => r.data);
export const getDirectMessages = (friendId: string) => API.get(`/friends/messages/${friendId}`).then(r => r.data);
export const sendDirectMessage = (friendId: string, content: string) => 
  API.post(`/friends/messages/${friendId}`, { content }).then(r => r.data);


// ===== TUTOR (Vá lỗi — gia sư AI cá nhân) =====
export const getTutorAnalysis = () => API.get('/tutor/analysis').then(r => r.data);
export const generateTutorRoadmap = (userNote: string = '') =>
  API.post('/tutor/roadmap', { user_note: userNote }).then(r => r.data);

export default API;
