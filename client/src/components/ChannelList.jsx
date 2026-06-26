import React from 'react';

export default function ChannelList({ channels, activeChannel, onSelectChannel, onAddChannel, canManage }) {
  return (
    <div className="channel-list">
      <div className="channel-list-header">
        <span className="channel-list-title">Channels</span>
        {canManage && (
          <button className="channel-add-btn" onClick={onAddChannel} title="Thêm channel">+</button>
        )}
      </div>
      <div className="channel-items">
        {channels.map(ch => (
          <div
            key={ch._id || ch.id}
            className={`channel-item ${(activeChannel?._id === ch._id || activeChannel?.id === ch.id) ? 'active' : ''}`}
            onClick={() => onSelectChannel(ch)}
          >
            <span className="channel-icon">#</span>
            <span className="channel-name">{ch.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
