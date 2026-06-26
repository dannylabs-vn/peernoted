import React, { useState, useEffect } from 'react';
import * as api from '../utils/api';

export default function PeerPointsShop({ userId, onClose }) {
  const [rewards, setRewards] = useState([]);
  const [pointsData, setPointsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [r, p] = await Promise.all([
        api.getRewards(),
        api.getPeerPoints(userId)
      ]);
      setRewards(r || []);
      setPointsData(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [userId]);

  const handleUnlock = async (rewardId) => {
    try {
      const result = await api.unlockReward(rewardId);
      alert(`✅ Đã mở khóa: ${result.name}`);
      fetchData(); // Refresh
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const formatPoints = (points) => points !== undefined && points !== null ? points.toLocaleString() : '0';

  const isUnlocked = (rewardId) => 
    pointsData?.unlocked_rewards?.some(r => (r._id || r.id) === rewardId);

  if (loading) return <div className="room-modal-overlay"><div className="room-modal"><p>Đang tải...</p></div></div>;

  return (
    <div className="room-modal-overlay" onClick={onClose}>
      <div className="room-modal room-modal-lg" onClick={e => e.stopPropagation()}>
        <h3>⭐ Cửa Hàng PeerPoints</h3>
        {error && <p className="room-error">{error}</p>}

        <div className="points-balance">
          <span>Tổng điểm:</span>
          <strong>{formatPoints(pointsData?.total_points)}</strong>
        </div>

        <div className="rewards-grid">
          {rewards.map(r => {
            const unlocked = isUnlocked(r._id || r.id);
            return (
              <div key={r._id || r.id} className={`reward-card ${unlocked ? 'unlocked' : ''}`}>
                <div className="reward-icon">
                  {r.reward_type === 'avatar' ? '🖼️' : r.reward_type === 'badge' ? '🏅' : r.reward_type === 'role' ? '👑' : '🎁'}
                </div>
                <div className="reward-name">{r.name}</div>
                <div className="reward-desc">{r.description}</div>
                <div className="reward-cost">⭐ {formatPoints(r.cost)}</div>
                {unlocked ? (
                  <div className="reward-unlocked-badge">✅ Đã mở</div>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => handleUnlock(r._id || r.id)}
                    disabled={(pointsData?.total_points || 0) < r.cost}
                  >
                    Mở khóa
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="room-modal-actions" style={{ marginTop: 16 }}>
          <button className="btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
