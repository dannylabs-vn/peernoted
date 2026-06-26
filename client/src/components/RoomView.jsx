import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api';
import { connectSocket, joinRoom, leaveRoom, disconnectSocket } from '../utils/socket';
import ChannelList from './ChannelList';
import ChatArea from './ChatArea';
import MemberList from './MemberList';
import InviteLink from './InviteLink';
import RoomFileManager from './RoomFileManager';
import AIRoleSuggest from './AIRoleSuggest';
import PeerPointsShop from './PeerPointsShop';
import RoomSettingsModal from './RoomSettingsModal';

export default function RoomView({ room: initialRoom, user, onBack }) {
  const [room, setRoom] = useState(initialRoom);
  const [channels, setChannels] = useState(initialRoom.channels || []);
  const [members, setMembers] = useState(initialRoom.members || []);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [socket, setSocket] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const roomId = room._id || room.id;
  const myRole = room.my_role || 'member';
  const canManage = myRole === 'owner' || myRole === 'admin';

  // Fetch room detail
  const fetchRoomDetail = useCallback(async () => {
    try {
      const detail = await api.getRoomDetail(roomId);
      if (detail.channels) setChannels(detail.channels);
      if (detail.members) setMembers(detail.members);
      if (!activeChannel && detail.channels?.length > 0) {
        setActiveChannel(detail.channels[0]);
      }
      setRoom(prev => ({ ...prev, ...detail }));
    } catch (err) {
      console.error('Failed to fetch room detail:', err);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomDetail();
  }, [fetchRoomDetail]);

  // Socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const s = connectSocket(token);
    setSocket(s);

    if (s.connected) {
      joinRoom(roomId);
    } else {
      s.on('connect', () => joinRoom(roomId));
    }

    // Listen for room events
    const handleOnline = (data) => {
      setOnlineUserIds(prev => new Set([...prev, data.user?.id || data.user?._id]));
    };
    const handleOffline = (data) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };
    const handleOnlineUsers = (data) => {
      setOnlineUserIds(new Set(data.users.map(u => u.id || u._id)));
    };

    s.on('user-online', handleOnline);
    s.on('user-offline', handleOffline);
    s.on('room-online-users', handleOnlineUsers);

    return () => {
      leaveRoom(roomId);
      s.off('user-online');
      s.off('user-offline');
      s.off('room-online-users');
    };
  }, [roomId]);

  const handleSelectChannel = (ch) => {
    setActiveChannel(ch);
    setMessages([]); // Clear messages for new channel
  };

  const handleAddChannel = async () => {
    const name = prompt('Nhập tên channel mới (không dấu, không khoảng trắng):');
    if (!name || !name.trim()) return;
    try {
      const ch = await api.createChannel(roomId, { name: name.trim() });
      setChannels(prev => [...prev, ch]);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteChannel = async (channelId) => {
    if (!confirm('Xóa channel này?')) return;
    try {
      await api.deleteChannel(roomId, channelId);
      setChannels(prev => prev.filter(c => (c._id || c.id) !== channelId));
      if (activeChannel?._id === channelId || activeChannel?.id === channelId) {
        setActiveChannel(null);
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleKickMember = async (userId) => {
    if (!confirm('Kick thành viên này?')) return;
    try {
      await api.kickMember(roomId, userId);
      setMembers(prev => prev.filter(m => (m.user_id || m._id) !== userId));
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleChangeRole = async (userId, role) => {
    try {
      await api.changeMemberRole(roomId, userId, role);
      setMembers(prev => prev.map(m =>
        (m.user_id || m._id) === userId ? { ...m, role } : m
      ));
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="room-view">
      {/* Room Header */}
      <div className="room-header">
        <button className="room-back-btn" onClick={onBack}>← Quay lại</button>
        <div className="room-header-info">
          <span className="room-header-name">{room.name}</span>
          {room.topic && <span className="room-header-topic">{room.topic}</span>}
        </div>
        <div className="room-header-actions">
          <InviteLink room={room} />
          <button className="room-header-btn" onClick={() => setShowFiles(!showFiles)}>📁</button>
          <button className="room-header-btn" onClick={() => setShowPoints(!showPoints)}>⭐</button>
          {canManage && (
            <>
              <AIRoleSuggest roomId={roomId} members={members} />
              <button className="room-header-btn" onClick={() => setShowSettings(true)}>⚙️</button>
            </>
          )}
        </div>
      </div>

      <div className="room-body">
        {/* Left: Channel List */}
        <div className="room-left">
          <ChannelList
            channels={channels}
            activeChannel={activeChannel}
            onSelectChannel={handleSelectChannel}
            onAddChannel={handleAddChannel}
            onDeleteChannel={handleDeleteChannel}
            canManage={canManage}
          />
        </div>

        {/* Center: Chat */}
        <div className="room-center">
          {activeChannel ? (
            <ChatArea
              roomId={roomId}
              channel={activeChannel}
              user={user}
              messages={messages}
              setMessages={setMessages}
              socket={socket}
            />
          ) : (
            <div className="room-no-channel">
              <p>Chọn một channel để bắt đầu trò chuyện</p>
            </div>
          )}
        </div>

        {/* Right: Member List */}
        <div className="room-right">
          <MemberList
            members={members}
            currentUserId={user?._id}
            onlineUserIds={onlineUserIds}
            onKick={handleKickMember}
            onChangeRole={handleChangeRole}
            canManage={canManage}
          />
        </div>
      </div>

      {/* Modals */}
      {showSettings && (
        <RoomSettingsModal
          room={room}
          members={members}
          channels={channels}
          currentUserId={user?._id}
          onClose={() => setShowSettings(false)}
          onUpdate={(updates) => setRoom(prev => ({ ...prev, ...updates }))}
          onDeleteChannel={handleDeleteChannel}
          onKick={handleKickMember}
          onChangeRole={handleChangeRole}
        />
      )}

      {showFiles && (
        <div className="room-modal-overlay" onClick={() => setShowFiles(false)}>
          <div className="room-modal room-modal-lg" onClick={e => e.stopPropagation()}>
            <h3>📁 Quản lý File</h3>
            <RoomFileManager roomId={roomId} userId={user?._id} canManage={canManage} />
            <div className="room-modal-actions">
              <button className="btn-secondary" onClick={() => setShowFiles(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {showPoints && (
        <PeerPointsShop userId={user?._id} onClose={() => setShowPoints(false)} />
      )}
    </div>
  );
}
