import React, { useState, useEffect, useRef } from 'react';
import * as api from '../utils/api';
import { encryptFile, decryptFile } from '../utils/crypto';

export default function RoomFileManager({ roomId, userId, canManage, inviteCode }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [libraryFolders, setLibraryFolders] = useState([]);
  const [selectedLibraryFile, setSelectedLibraryFile] = useState('');
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const data = await api.getRoomFiles(roomId);
      setFiles(data || []);
    } catch (err) {
      console.error('Failed to fetch room files:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraryFiles = async () => {
    try {
      const folders = await api.getFolders();
      const allFiles = [];
      for (const f of (folders.data || folders)) {
        const resp = await api.getFiles(f._id || f.id);
        const fs = resp.data || resp;
        if (Array.isArray(fs)) {
          fs.forEach(file => allFiles.push({ ...file, folderName: f.name }));
        }
      }
      setLibraryFolders(allFiles);
    } catch (err) {
      console.error('Failed to fetch library:', err);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchLibraryFiles();
  }, [roomId]);

  const handleUpload = async (e) => {
    let file = e.target.files?.[0];
    if (!file) return;
    try {
      // E2EE Encrypt
      file = await encryptFile(file, inviteCode);
      await api.uploadRoomFile(roomId, file);
      fetchFiles();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportFromLibrary = async () => {
    if (!selectedLibraryFile) return;
    try {
      await api.importLibraryFile(roomId, selectedLibraryFile);
      setSelectedLibraryFile('');
      fetchFiles();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Xóa file này?')) return;
    try {
      await api.deleteRoomFile(roomId, fileId);
      setFiles(prev => prev.filter(f => (f._id || f.id) !== fileId));
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await fetch(file.storage_url);
      if (!response.ok) throw new Error('Không thể tải file từ máy chủ');
      const encryptedBlob = await response.blob();
      
      // E2EE Decrypt
      // We use application/octet-stream as a fallback if file_type is missing
      const mimeType = file.file_type || 'application/octet-stream';
      const decryptedBlob = await decryptFile(encryptedBlob, inviteCode, mimeType);
      
      const url = window.URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name || 'downloaded_file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert('Không thể tải hoặc giải mã file: ' + err.message);
    }
  };

  if (loading) return <div className="room-loading">Đang tải...</div>;

  return (
    <div className="room-file-manager">
      {/* Upload new file */}
      <div className="file-manager-section">
        <h4>Tải file mới lên</h4>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          style={{ marginBottom: 12 }}
        />
      </div>

      {/* Import from Library */}
      <div className="file-manager-section">
        <h4>Chọn từ Library</h4>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select
            value={selectedLibraryFile}
            onChange={e => setSelectedLibraryFile(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)', color: '#e0e0e0' }}
          >
            <option value="">-- Chọn file --</option>
            {libraryFolders.map(f => (
              <option key={f._id || f.id} value={f._id || f.id}>
                {f.folderName} / {f.original_name}
              </option>
            ))}
          </select>
          <button onClick={handleImportFromLibrary} disabled={!selectedLibraryFile} className="btn-primary" style={{ padding: '8px 16px' }}>
            Import
          </button>
        </div>
      </div>

      {/* File list */}
      <div className="file-manager-section">
        <h4>Files trong phòng ({files.length})</h4>
        {files.length === 0 ? (
          <p style={{ color: '#888' }}>Chưa có file nào.</p>
        ) : (
          <div className="file-manager-list">
            {files.map(f => (
              <div key={f._id || f.id} className="file-manager-item">
                <span className="file-item-name">📄 {f.original_name}</span>
                <span className="file-item-meta">
                  {(f.uploader?.name || 'Unknown')} • {f.source_type === 'library' ? '📚 Library' : '📤 Upload'}
                </span>
                <div className="file-item-actions">
                  <button className="btn-download" onClick={() => handleDownload(f)} style={{ border: 'none', background: '#3b82f6', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Tải (Giải mã)</button>
                  {(canManage || f.uploaded_by === userId) && (
                    <button className="btn-delete" onClick={() => handleDelete(f._id || f.id)}>Xóa</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
