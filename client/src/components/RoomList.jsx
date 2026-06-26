import React, { useState, useEffect, useCallback } from 'react';
import { getRooms, createRoom, joinRoom, getRoomDetail } from '../utils/api';
import './RoomList.css';

export default function RoomList({ user, onEnterRoom }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRooms();
      setRooms(data || []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    if (!name) return;

    try {
      const room = await createRoom({
        name,
        description: form.description.value.trim(),
        topic: form.topic.value.trim(),
        is_public: form.is_public.checked
      });
      setShowCreate(false);
      onEnterRoom(room);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      const result = await joinRoom(joinCode.trim().toUpperCase());
      setShowJoin(false);
      setJoinCode('');
      if (result.room_id) {
        const room = await getRoomDetail(result.room_id);
        onEnterRoom(room);
      }
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="room-list-container">
      <div className="room-list-header">
        <h2>📚 Phòng Học</h2>
        <div className="room-list-actions">
          <button className="btn-create-room" onClick={() => { setShowCreate(true); setError(''); }}>
            + Tạo Phòng
          </button>
          <button className="btn-join-room" onClick={() => { setShowJoin(true); setError(''); }}>
            🔗 Tham Gia
          </button>
        </div>
      </div>

      {error && <div className="room-error">{error}</div>}

      {loading ? (
        <div className="room-loading">Đang tải...</div>
      ) : rooms.length === 0 ? (
        <div className="room-empty">
          <p>Chưa có phòng học nào.</p>
          <p>Tạo phòng mới hoặc tham gia bằng mã mời!</p>
        </div>
      ) : (
        <div className="room-grid">
          {rooms.map(room => (
            <div
              key={room._id}
              className={`room-card ${room.is_member ? 'joined' : ''}`}
              onClick={() => {
                if (room.is_member) {
                  onEnterRoom(room);
                }
              }}
            >
              <div className="room-card-header">
                <h3>{room.name}</h3>
                {room.is_member && <span className="room-badge">Đã tham gia</span>}
              </div>
              {room.description && <p className="room-desc">{room.description}</p>}
              <div className="room-card-meta">
                <span>👤 {room.owner?.name || 'Unknown'}</span>
                <span>👥 {room.member_count || 0} thành viên</span>
              </div>
              {room.topic && <span className="room-topic">#{room.topic}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreate && (
        <div className="room-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="room-modal" onClick={e => e.stopPropagation()}>
            <h3>Tạo Phòng Mới</h3>
            <form onSubmit={handleCreateRoom}>
              <input name="name" placeholder="Tên phòng *" required />
              <input name="description" placeholder="Mô tả (không bắt buộc)" />
              <input name="topic" placeholder="Chủ đề (VD: Vật Lý 12)" />
              <label className="room-checkbox">
                <input name="is_public" type="checkbox" defaultChecked />
                Phòng công khai
              </label>
              <div className="room-modal-actions">
                <button type="submit" className="btn-primary">Tạo</button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoin && (
        <div className="room-modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="room-modal" onClick={e => e.stopPropagation()}>
            <h3>Tham Gia Phòng</h3>
            <form onSubmit={handleJoinRoom}>
              <input
                placeholder="Nhập mã mời"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                autoFocus
              />
              <div className="room-modal-actions">
                <button type="submit" className="btn-primary">Tham Gia</button>
                <button type="button" className="btn-secondary" onClick={() => setShowJoin(false)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
