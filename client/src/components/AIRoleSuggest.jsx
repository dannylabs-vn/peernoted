import React, { useState } from 'react';
import * as api from '../utils/api';

export default function AIRoleSuggest({ roomId, members }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const memberIds = (members || []).map(m => m.user_id || m._id);
      const result = await api.suggestRoles(roomId, memberIds);
      setSuggestions(result.suggestions);
      setShowModal(true);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (userId, role) => {
    try {
      await api.changeMemberRole(roomId, userId, role);
      // Award points for accepting suggestion
      await api.awardPoints(roomId, userId, 10, 'Chấp nhận đề xuất role từ AI');
      alert(`Đã gán ${role} cho thành viên! (+10 PeerPoints)`);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  if (!showModal) {
    return (
      <button className="room-header-btn" onClick={handleSuggest} disabled={loading} title="AI Gợi ý Role">
        {loading ? '⏳' : '🤖'}
      </button>
    );
  }

  return (
    <div className="room-modal-overlay" onClick={() => { setShowModal(false); setSuggestions(null); }}>
      <div className="room-modal room-modal-lg" onClick={e => e.stopPropagation()}>
        <h3>🤖 AI Gợi ý Vai Trò</h3>
        {!suggestions || suggestions.length === 0 ? (
          <p>Không có gợi ý nào.</p>
        ) : (
          <div className="ai-suggestions-list">
            {suggestions.map((s, i) => (
              <div key={s.userId || i} className="ai-suggestion-item">
                <div className="ai-suggestion-info">
                  <strong>{s.userName}</strong>
                  <span className="ai-suggestion-role">→ {s.suggestedRole}</span>
                  <p className="ai-suggestion-reason">{s.reason}</p>
                </div>
                <button
                  className="btn-primary btn-sm"
                  onClick={() => handleAssignRole(s.userId, s.suggestedRole.toLowerCase().includes('lead') ? 'admin' : 'member')}
                >
                  Gán
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="room-modal-actions" style={{ marginTop: 16 }}>
          <button className="btn-secondary" onClick={() => { setShowModal(false); setSuggestions(null); }}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
