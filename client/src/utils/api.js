import axios from 'axios';

// In dev: '/api' goes through Vite proxy → localhost:5000.
// In prod: set VITE_API_URL to the deployed backend (e.g. https://peernoted-api.onrender.com/api).
const baseURL = import.meta.env.VITE_API_URL || '/api';

const API = axios.create({
  baseURL,
  timeout: 300000 // 5 min for AI + TTS generation
});

// Attach JWT token from localStorage on every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== AUTH =====
export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);
export const loginWithGoogle = (credential) => API.post('/auth/google', { credential });
export const getMe = () => API.get('/auth/me');

// ===== FOLDERS =====
export const getFolders = () => API.get('/folders');
export const getFolder = (id) => API.get(`/folders/${id}`);
export const createFolder = (data) => API.post('/folders', data);
export const updateFolder = (id, data) => API.put(`/folders/${id}`, data);
export const deleteFolder = (id) => API.delete(`/folders/${id}`);
export const deleteFolders = (ids) => API.post('/folders/delete-batch', { ids });

// ===== FILES =====
export const getFiles = (folderId) => API.get('/files', { params: { folder_id: folderId } });
export const deleteFile = (id) => API.delete(`/files/${id}`);
export const deleteFiles = (ids) => API.post('/files/delete-batch', { ids });

export const uploadFiles = (folderId, files) => {
  const formData = new FormData();
  formData.append('folder_id', folderId);
  files.forEach(f => formData.append('files', f));
  return API.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// ===== AI =====
export const classifyFiles = (files) => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  return API.post('/ai/classify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Cheat sheet
export const getCheatSheet = (folderId) => API.get(`/ai/cheatsheet/${folderId}`);
export const clearCheatSheet = (folderId) => API.delete(`/ai/cheatsheet/${folderId}`);
export const setCheatSheetTemplate = (folderId, template) =>
  API.post(`/ai/cheatsheet/${folderId}/template`, { template });
export const migrateCheatSheet = (folderId) =>
  API.post(`/ai/cheatsheet/${folderId}/migrate`);
export const analyzeHandwriting = (folderId, file) => {
  const fd = new FormData();
  fd.append('image', file);
  return API.post(`/ai/cheatsheet/${folderId}/handwriting`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const pickHandwritingFontManual = (folderId, fontFamily) =>
  API.post(`/ai/cheatsheet/${folderId}/handwriting/manual`, { font_family: fontFamily });

// Podcast
export const generatePodcast = (folderId) => API.post(`/ai/podcast/${folderId}`);
export const clearPodcast = (folderId) => API.delete(`/ai/podcast/${folderId}`);

// Recommendations
export const getRecommendations = (folderId) => API.post(`/ai/recommend/${folderId}`);

// ===== ROOMS =====
export const getRooms = () => API.get('/rooms').then(r => r.data);
export const getRoomDetail = (id) => API.get(`/rooms/${id}`).then(r => r.data);
export const createRoom = (data) => API.post('/rooms', data).then(r => r.data);
export const updateRoom = (id, data) => API.put(`/rooms/${id}`, data).then(r => r.data);
export const deleteRoom = (id) => API.delete(`/rooms/${id}`);
export const joinRoom = (invite_code) => API.post('/rooms/join', { invite_code }).then(r => r.data);

// ===== ROOM FILES =====
export const uploadRoomFile = (roomId, file, channel_id = '') => {
  const fd = new FormData();
  fd.append('file', file);
  if (channel_id) fd.append('channel_id', channel_id);
  return API.post(`/rooms/${roomId}/files`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};
export const getRoomFiles = (roomId) => API.get(`/rooms/${roomId}/files`).then(r => r.data);
export const deleteRoomFile = (roomId, fileId) => API.delete(`/rooms/${roomId}/files/${fileId}`);
export const importLibraryFile = (roomId, file_id, channel_id = '') =>
  API.post(`/rooms/${roomId}/library-files`, { file_id, channel_id }).then(r => r.data);

// ===== ROOM CHANNELS =====
export const createChannel = (roomId, data) =>
  API.post(`/rooms/${roomId}/channels`, data).then(r => r.data);
export const updateChannel = (roomId, channelId, data) =>
  API.put(`/rooms/${roomId}/channels/${channelId}`, data).then(r => r.data);
export const deleteChannel = (roomId, channelId) =>
  API.delete(`/rooms/${roomId}/channels/${channelId}`);

// ===== ROOM MEMBERS =====
export const getRoomMembers = (roomId) => API.get(`/rooms/${roomId}/members`).then(r => r.data);
export const changeMemberRole = (roomId, userId, role) =>
  API.put(`/rooms/${roomId}/members/${userId}`, { role }).then(r => r.data);
export const kickMember = (roomId, userId) =>
  API.delete(`/rooms/${roomId}/members/${userId}`);

// ===== PEERPOINTS =====
export const getPeerPoints = (userId) => API.get(`/peerpoints/${userId}`).then(r => r.data);
export const awardPoints = (roomId, userId, points, reason = '') =>
  API.post('/peerpoints/award', { room_id: roomId, user_id: userId, points, reason }).then(r => r.data);

// ===== REWARDS =====
export const getRewards = () => API.get('/rewards').then(r => r.data);
export const unlockReward = (rewardId) =>
  API.post('/rewards/unlock', { reward_id: rewardId }).then(r => r.data);

// ===== AI ROLE =====
export const suggestRoles = (roomId, memberIds) =>
  API.post('/ai/suggest-role', { roomId, memberIds }).then(r => r.data);

export default API;
