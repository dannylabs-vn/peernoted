import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, sendTyping } from '../utils/socket';

export default function ChatArea({ roomId, channel, user, messages, setMessages, socket }) {
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (msg.channelId === channel?.id || msg.channelId === channel?._id) {
        setMessages(prev => [...prev, msg]);
      }
    };

    const handleTyping = (data) => {
      if (data.userId !== user?._id) {
        setTypingUsers(prev => ({
          ...prev,
          [data.userId]: { name: data.userName, isTyping: data.isTyping }
        }));
        // Clear typing indicator after 3s
        if (data.isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => ({ ...prev, [data.userId]: { ...prev[data.userId], isTyping: false } }));
          }, 3000);
        }
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleTyping);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleTyping);
    };
  }, [socket, channel, user, setMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setSendError('');
    setIsSending(true);

    try {
      await sendMessage(roomId, channel?.id || channel?._id, text);
      setInput('');
    } catch (err) {
      setSendError(err.message || 'Không gửi được tin nhắn');
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    // Typing indicator
    if (socket?.connected) {
      sendTyping(roomId, channel?.id || channel?._id, true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(roomId, channel?.id || channel?._id, false);
      }, 2000);
    }
  };

  const typingText = Object.values(typingUsers)
    .filter(t => t.isTyping)
    .map(t => t.name);
  const displayTyping = typingText.length > 0
    ? `${typingText.join(', ')} ${typingText.length > 1 ? 'đang' : 'đang'} gõ...`
    : '';

  return (
    <div className="chat-area">
      <div className="chat-header">
        <span className="chat-header-icon">#</span>
        <span className="chat-header-name">{channel?.name || 'Chọn channel'}</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`chat-msg ${msg.user?.id === user?._id ? 'own' : ''}`}>
              <div className="chat-msg-avatar">
                {msg.user?.avatar ? (
                  <img src={msg.user.avatar} alt="" />
                ) : (
                  <div className="chat-msg-avatar-placeholder">
                    {(msg.user?.name || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="chat-msg-body">
                <div className="chat-msg-header">
                  <span className="chat-msg-name">{msg.user?.name || 'Unknown'}</span>
                  <span className="chat-msg-time">
                    {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="chat-msg-content">{msg.content}</div>
              </div>
            </div>
          ))
        )}
        {displayTyping && <div className="chat-typing">{displayTyping}</div>}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSend}>
        {sendError && <div className="chat-send-error">{sendError}</div>}
        <input
          type="text"
          placeholder={`Nhắn tin trong #${channel?.name || 'channel'}...`}
          value={input}
          onChange={handleInputChange}
          autoFocus
        />
        <button type="submit" disabled={!input.trim() || isSending}>
          {isSending ? 'Đang gửi...' : 'Gửi'}
        </button>
      </form>
    </div>
  );
}
