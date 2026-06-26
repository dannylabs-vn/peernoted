import React, { useState } from 'react';
import * as api from '../utils/api';

export default function RoomSettingsModal({ room, members, channels, currentUserId, onClose, onUpdate, onDeleteChannel, onKick, onChangeRole }) {
  const [name, setName] = useState(room.name || '');
  const [description, setDescription] = useState(room.description || '');
  const [isPublic, setIsPublic] = useState(room.is_public !== false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateRoom(room._id || room.id, { name, description, is_public: isPublic });
      onUpdate(updated);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!confirm('Bạn có chắc muốn xóa phòng này? Hành động này không thể hoàn tác!')) return;
    try {
      await api.deleteRoom(room._id || room.id);
      window.location.reload(); // Refresh to go back to room list
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="room-modal-overlay" onClick={onClose}>
      <div className="room-modal" onClick={e => e.stopPropagation()}>
        <h3>⚙️ Cài Đặt Phòng</h3>

        <div className="room-settings-section">
          <h4>Thông tin phòng</h4>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Tên phòng" />
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả" />
          <label className="room-checkbox">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            Phòng công khai
          </label>
        </div>

        <div className="room-settings-section">
          <h4>Quản lý thành viên ({members?.length || 0})</h4>
          <div className="settings-members-list">
            {members?.map(m => {
              const uid = m.user_id || m._id;
              const isMe = uid === currentUserId;
              const isOwner = m.role === 'owner';
              return (
                <div key={uid} className="settings-member-item">
                  <span>{m.name} {isMe && '(bạn)'}</span>
                  <span className="member-role-badge" data-role={m.role}>{m.role}</span>
                  {!isOwner && !isMe && (
                    <div className="settings-member-actions">
                      <select value={m.role} onChange={e => onChangeRole(uid, e.target.value)}>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <button className="btn-delete btn-sm" onClick={() => onKick(uid)}>Kick</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="room-settings-section">
          <h4>Channels ({channels?.length || 0})</h4>
          {channels?.map(ch => (
            <div key={ch._id || ch.id} className="settings-channel-item">
              <span># {ch.name}</span>
              {ch.name !== 'chat-chung' && (
                <button className="btn-delete btn-sm" onClick={() => onDeleteChannel(ch._id || ch.id)}>Xóa</button>
              )}
            </div>
          ))}
        </div>

        <div className="room-modal-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button className="btn-danger" onClick={handleDeleteRoom}>Xóa phòng</button>
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}
