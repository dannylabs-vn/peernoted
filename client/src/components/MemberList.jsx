import React from 'react';

export default function MemberList({ members, currentUserId, onlineUserIds, onKick, onChangeRole, canManage }) {
  const online = (members || []).filter(m => onlineUserIds.has(m.user_id || m._id));
  const offline = (members || []).filter(m => !onlineUserIds.has(m.user_id || m._id));

  const renderMember = (member) => {
    const userId = member.user_id || member._id;
    const isOwner = member.role === 'owner';
    const isMe = userId === currentUserId;

    return (
      <div key={userId} className="member-item">
        <div className="member-avatar">
          {member.avatar ? (
            <img src={member.avatar} alt="" />
          ) : (
            <div className="member-avatar-placeholder">{(member.name || '?')[0].toUpperCase()}</div>
          )}
          <div className="member-online-dot" />
        </div>
        <div className="member-info">
          <div className="member-name">
            {member.name}
            {isMe && <span className="member-me"> (bạn)</span>}
          </div>
          <div className="member-role-badge" data-role={member.role}>
            {member.role === 'owner' ? '👑 Chủ phòng' : member.role === 'admin' ? '🛡️ Admin' : '👤 Thành viên'}
          </div>
          <div className="member-points">⭐ {member.peer_points || 0} điểm</div>
        </div>
        {canManage && !isOwner && !isMe && (
          <div className="member-actions">
            <select
              value={member.role}
              onChange={(e) => onChangeRole(userId, e.target.value)}
              className="member-role-select"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
            <button className="member-kick-btn" onClick={() => onKick(userId)} title="Kick">✕</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="member-list">
      <div className="member-list-header">
        <span className="member-list-title">Thành Viên</span>
        <span className="member-count">{members?.length || 0}</span>
      </div>

      {online.length > 0 && (
        <div className="member-section">
          <div className="member-section-title">Online — {online.length}</div>
          {online.map(renderMember)}
        </div>
      )}

      {offline.length > 0 && (
        <div className="member-section">
          <div className="member-section-title">Offline — {offline.length}</div>
          {offline.map(renderMember)}
        </div>
      )}

      {(!members || members.length === 0) && (
        <div className="member-empty">Chưa có thành viên</div>
      )}
    </div>
  );
}
