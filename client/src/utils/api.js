import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 300000 // 5 min for AI processing & TTS generation
});

// Request interceptor for API calls
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===== AUTH =====
export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);
export const loginWithGoogle = (data) => API.post('/auth/google', data);
export const getMe = () => API.get('/auth/me');

// ===== FOLDERS =====
export const getFolders = () => API.get('/folders');
export const getFolder = (id) => API.get(`/folders/${id}`);
export const createFolder = (data) => API.post('/folders', data);
export const updateFolder = (id, data) => API.put(`/folders/${id}`, data);
export const deleteFolder = (id) => API.delete(`/folders/${id}`);

// ===== FILES =====
export const getFiles = (folderId) => API.get('/files', { params: { folder_id: folderId } });
export const deleteFile = (id) => API.delete(`/files/${id}`);

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

export const getCheatSheet = (folderId) => API.get(`/ai/cheatsheet/${folderId}`);
export const clearCheatSheet = (folderId) => API.delete(`/ai/cheatsheet/${folderId}`);
export const generatePodcast = (folderId) => API.post(`/ai/podcast/${folderId}`);
export const clearPodcast = (folderId) => API.delete(`/ai/podcast/${folderId}`);
export const getRecommendations = (folderId) => API.post(`/ai/recommend/${folderId}`);

export default API;
