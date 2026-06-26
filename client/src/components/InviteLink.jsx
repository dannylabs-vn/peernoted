import React, { useState } from 'react';

export default function InviteLink({ room }) {
  const [copied, setCopied] = useState(false);
  const inviteCode = room.invite_code;
  const inviteLink = `${window.location.origin}/join?code=${inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="invite-link-container">
      <button className="room-header-btn" onClick={handleCopy} title="Copy mã mời">
        {copied ? '✅' : '🔗'}
      </button>
      {copied && <span className="invite-tooltip">Đã copy: {inviteCode}</span>}
    </div>
  );
}
