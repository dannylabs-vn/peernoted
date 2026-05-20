import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 120000 // 2 min for AI processing
});

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

export const generatePodcast = (folderId) => API.post(`/ai/podcast/${folderId}`);

export default API;
