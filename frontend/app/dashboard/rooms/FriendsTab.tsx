"use client"

import { useState, useEffect, useRef } from 'react'
import { getFriends, sendFriendRequest, acceptFriendRequest, getDirectMessages, sendDirectMessage } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { Search, UserPlus, Check, MessageSquare, Send, X } from 'lucide-react'

export default function FriendsTab({ currentUser }: { currentUser: any }) {
  const [friends, setFriends] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addMsg, setAddMsg] = useState({ text: '', isError: false })
  
  const [activeChat, setActiveChat] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchFriends()
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handlePrivateMessage = (msg: any) => {
      // If we are currently chatting with the sender (or it's our own message reflected back)
      if (activeChat && (msg.sender_id === activeChat.user.id || msg.receiver_id === activeChat.user.id)) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      } else {
        // Show a notification or just ignore for now
        console.log('Received background DM:', msg)
      }
    }

    socket.on('private-message', handlePrivateMessage)
    return () => {
      socket.off('private-message', handlePrivateMessage)
    }
  }, [activeChat])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const fetchFriends = async () => {
    try {
      setLoading(true)
      const res = await getFriends()
      setFriends(res.friends || [])
      setPending(res.pending || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddMsg({ text: '', isError: false })
    if (!addEmail.trim()) return

    try {
      await sendFriendRequest(addEmail)
      setAddMsg({ text: 'Đã gửi lời mời thành công!', isError: false })
      setAddEmail('')
      fetchFriends()
    } catch (err: any) {
      setAddMsg({ text: err.response?.data?.error || err.message, isError: true })
    }
  }

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequest(id)
      fetchFriends()
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenChat = async (friend: any) => {
    setActiveChat(friend)
    try {
      const msgs = await getDirectMessages(friend.user.id)
      setMessages(msgs || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !activeChat) return

    const content = chatInput.trim()
    setChatInput('')

    const tempId = 'temp-' + Date.now()
    const tempMsg = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: activeChat.user.id,
      content,
      created_at: new Date().toISOString(),
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        avatar_url: currentUser.avatar || ''
      }
    }

    setMessages(prev => [...prev, tempMsg])

    try {
      const socket = getSocket()
      if (socket && socket.connected) {
        socket.emit('send-private-message', {
          receiverId: activeChat.user.id,
          content,
          msgId: tempId
        })
        // We will store it in DB using API as fallback, or backend socket can store it
        // In our plan, we'll just save it via API to ensure DB persistence
        await sendDirectMessage(activeChat.user.id, content)
      } else {
        const savedMsg = await sendDirectMessage(activeChat.user.id, content)
        setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m))
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[600px] border-[4px] border-black rounded-3xl overflow-hidden bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      
      {/* Left Sidebar: Friends List */}
      <div className="w-full md:w-80 bg-gray-50 border-r-[4px] border-black flex flex-col">
        <div className="p-4 border-b-[4px] border-black bg-[#FFC224]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-black">Danh bạ</h2>
            <button 
              onClick={() => setShowAddFriend(true)}
              className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center font-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              title="Thêm bạn"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          {currentUser?.username && (
            <div className="text-xs font-bold bg-white px-2 py-1 rounded-md border-[2px] border-black inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              ID: {currentUser.username}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Lời mời kết bạn</h3>
              <div className="space-y-3">
                {pending.map(p => (
                  <div key={p.id} className="bg-white border-[3px] border-black rounded-xl p-3 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-gray-200 border-[2px] border-black shrink-0 overflow-hidden">
                        {p.user.avatar ? <img src={p.user.avatar} alt="avt" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full font-bold">{p.user.name[0]}</span>}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-sm truncate">{p.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{p.user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAccept(p.id)}
                      className="w-8 h-8 bg-[#10B981] text-white border-[2px] border-black rounded-lg flex items-center justify-center hover:scale-110 transition-transform shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Bạn bè ({friends.length})</h3>
            {loading ? (
              <p className="text-sm font-bold text-gray-400">Đang tải...</p>
            ) : friends.length === 0 ? (
              <p className="text-sm font-bold text-gray-400">Bạn chưa có bạn bè nào.</p>
            ) : (
              <div className="space-y-3">
                {friends.map(f => (
                  <div 
                    key={f.id} 
                    onClick={() => handleOpenChat(f)}
                    className={`bg-white border-[3px] border-black rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${
                      activeChat?.id === f.id 
                        ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1 border-[#9B51E0]' 
                        : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 border-[2px] border-black shrink-0 overflow-hidden">
                      {f.user.avatar ? <img src={f.user.avatar} alt="avt" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full font-black text-lg">{f.user.name[0]}</span>}
                    </div>
                      <div className="truncate flex-1">
                      <p className="font-bold truncate">{f.user.name}</p>
                      {f.user.username && <p className="text-[10px] text-gray-500 font-bold">{f.user.username}</p>}
                    </div>
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Area: Chat */}
      <div className="flex-1 flex flex-col bg-[#F3F4F6] relative">
        {activeChat ? (
          <>
            <div className="p-4 border-b-[4px] border-black bg-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 border-[2px] border-black shrink-0 overflow-hidden">
                {activeChat.user.avatar ? <img src={activeChat.user.avatar} alt="avt" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full font-black text-lg">{activeChat.user.name[0]}</span>}
              </div>
              <div>
                <h3 className="font-black text-lg">{activeChat.user.name}</h3>
                <p className="text-xs font-bold text-gray-500">{activeChat.user.username || activeChat.user.email}</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === currentUser.id
                return (
                  <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] border-[3px] border-black rounded-2xl p-3 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      isMe ? 'bg-[#3C73ED] text-white rounded-br-none' : 'bg-white text-black rounded-bl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t-[4px] border-black bg-white flex gap-3">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-4 py-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-[#9B51E0]/20"
              />
              <button 
                type="submit"
                className="w-14 h-14 bg-[#10B981] text-white border-[3px] border-black rounded-xl flex items-center justify-center hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0"
              >
                <Send className="w-6 h-6" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <MessageSquare className="w-20 h-20 mb-4 opacity-20" />
            <h3 className="text-2xl font-black mb-2 text-gray-300">Nhắn tin riêng</h3>
            <p className="font-bold">Chọn một người bạn ở danh sách bên trái để bắt đầu trò chuyện</p>
          </div>
        )}

        {/* Modal: Add Friend */}
        {showAddFriend && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-5 border-b-[4px] border-black bg-[#9B51E0] text-white flex justify-between items-center">
                <h3 className="text-xl font-black">Kết bạn mới</h3>
                <button onClick={() => setShowAddFriend(false)} className="w-8 h-8 bg-white border-[2px] border-black rounded-full text-black flex items-center justify-center font-black hover:bg-gray-100"><X className="w-4 h-4"/></button>
              </div>
              <form onSubmit={handleAddFriend} className="p-6">
                {addMsg.text && (
                  <div className={`p-3 mb-4 rounded-xl border-[2px] border-black font-bold text-sm ${addMsg.isError ? 'bg-[#EA4335] text-white' : 'bg-[#10B981] text-white'}`}>
                    {addMsg.text}
                  </div>
                )}
                <label className="block font-black mb-2 text-sm">Username hoặc Email</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    required
                    placeholder="Ví dụ: nguyenvana#1234"
                    className="flex-1 px-4 py-3 bg-gray-50 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-white"
                  />
                  <button type="submit" className="px-4 py-3 bg-[#3C73ED] text-white border-[3px] border-black rounded-xl font-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                    Gửi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
