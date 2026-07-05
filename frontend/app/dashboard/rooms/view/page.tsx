"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getRoomDetail, getRoomMembers, createChannel, deleteChannel, kickMember, changeMemberRole, updateRoom, deleteRoom, getRoomMessages, getRoomFiles, uploadFiles, deleteRoomFile } from '@/lib/api'
import { connectSocket, disconnectSocket, joinRoom, leaveRoom, sendMessage, sendTyping } from '@/lib/socket'
import { Hash, Users, Settings, LogOut, Send, MessageSquare, Plus, X, UserMinus, ShieldAlert, FileText, Settings2, Trash2, Download, Upload } from 'lucide-react'
import BattlePanel from '@/components/BattlePanel'

// Static export (output: 'export') không hỗ trợ dynamic route [id] vì room ID
// là UUID runtime. Dùng query param /dashboard/rooms/view?id=<uuid> thay thế.
// useSearchParams cần Suspense boundary khi prerender.
function RoomViewInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = searchParams.get('id') as string

  const [room, setRoom] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [activeChannel, setActiveChannel] = useState<any>(null)
  
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '', topic: '', is_public: true })
  
  const [messages, setMessages] = useState<any[]>([])
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [socket, setSocket] = useState<any>(null)
  
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<any>({})
  const typingTimeoutRef = useRef<any>(null)
  const messagesEndRef = useRef<any>(null)

  const [myUserId, setMyUserId] = useState('')
  const [myRole, setMyRole] = useState('member')
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  
  const [showDocsModal, setShowDocsModal] = useState(false)
  const [roomFiles, setRoomFiles] = useState<any[]>([])
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)

  const fetchRoomDetail = useCallback(async () => {
    try {
      const detail = await getRoomDetail(roomId)
      setRoom(detail)
      setChannels(detail.channels || [])
      setMembers(detail.members || [])
      setMyRole(detail.my_role || 'member')
      
      const me = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json())
      setMyUserId(me.user?.id || '')
      
      if (detail.channels && detail.channels.length > 0) {
        setActiveChannel(detail.channels[0])
      }
      
      setSettingsForm({
        name: detail.name || '',
        description: detail.description || '',
        topic: detail.topic || '',
        is_public: detail.is_public ?? true
      });
    } catch (err: any) {
      console.error('Failed to fetch room detail:', err)
      if (err.response?.status === 403 || err.response?.status === 404) {
        router.push('/dashboard/rooms')
      }
    }
  }, [roomId, router])

  useEffect(() => {
    fetchRoomDetail()
  }, [fetchRoomDetail])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const s = connectSocket(token)
    setSocket(s)

    const handleConnect = () => {
      joinRoom(roomId)
      const savedNickname = localStorage.getItem(`nickname_${roomId}`)
      if (savedNickname && s) {
        s.emit('change-nickname', { roomId, nickname: savedNickname })
      }
    }
    if (s.connected) handleConnect()
    else s.on('connect', handleConnect)

    const handleOnline = (data: any) => {
      const uid = data.user?.id || data.user?._id
      setOnlineUserIds(prev => new Set([...prev, uid]))
      if (data.user?.nickname) {
        setNicknames(prev => ({ ...prev, [uid]: data.user.nickname }))
      }
    }
    const handleOffline = (data: any) => setOnlineUserIds(prev => {
      const next = new Set(prev)
      next.delete(data.userId)
      return next
    })
    const handleOnlineUsers = (data: any) => {
      setOnlineUserIds(new Set(data.users.map((u: any) => u.id || u._id)))
      const nicks: Record<string, string> = {}
      data.users.forEach((u: any) => {
        if (u.nickname) nicks[u.id || u._id] = u.nickname
      })
      setNicknames(prev => ({ ...prev, ...nicks }))
    }
    
    const handleNewMessage = (msg: any) => {
      if (msg.channelId === activeChannel?._id || msg.channelId === activeChannel?.id) {
        setMessages(prev => [...prev, msg])
      }
    }

    const handleTyping = (data: any) => {
      if (data.userId !== myUserId) {
        setTypingUsers((prev: any) => ({
          ...prev,
          [data.userId]: { name: data.userName, isTyping: data.isTyping }
        }))
        if (data.isTyping) {
          setTimeout(() => {
            setTypingUsers((prev: any) => ({ ...prev, [data.userId]: { ...prev[data.userId], isTyping: false } }))
          }, 3000)
        }
      }
    }

    const handleNicknameChanged = (data: any) => {
      setNicknames(prev => ({ ...prev, [data.userId]: data.nickname }))
    }

    s.on('user-online', handleOnline)
    s.on('user-offline', handleOffline)
    s.on('room-online-users', handleOnlineUsers)
    s.on('new-message', handleNewMessage)
    s.on('user-typing', handleTyping)
    s.on('user-nickname-changed', handleNicknameChanged)

    return () => {
      leaveRoom(roomId)
      s.off('connect', handleConnect)
      s.off('user-online', handleOnline)
      s.off('user-offline', handleOffline)
      s.off('room-online-users', handleOnlineUsers)
      s.off('new-message', handleNewMessage)
      s.off('user-typing', handleTyping)
      s.off('user-nickname-changed', handleNicknameChanged)
      disconnectSocket()
    }
  }, [roomId, activeChannel, myUserId])

  useEffect(() => {
    if (!activeChannel) return;
    const fetchMsgs = async () => {
      try {
        const msgs = await getRoomMessages(roomId, activeChannel.id || activeChannel._id)
        setMessages(msgs || [])
      } catch (err) {
        console.error('Failed to fetch messages', err)
      }
    }
    fetchMsgs()
  }, [roomId, activeChannel])

  const fetchDocs = async () => {
    try {
      const files = await getRoomFiles(roomId)
      setRoomFiles(files || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenDocs = () => {
    fetchDocs()
    setShowDocsModal(true)
  }

  const handleUploadDoc = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      // We manually construct fetch since uploadFiles from api.ts was for folders.
      // Static export không có rewrite /api → phải dùng NEXT_PUBLIC_API_URL như lib/api.ts.
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api'
      const token = localStorage.getItem('token')
      const res = await fetch(`${apiBase}/rooms/${roomId}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      }).then(r => {
        if(!r.ok) throw new Error('Upload failed')
        return r.json()
      })
      fetchDocs()
    } catch (err) {
      alert('Không thể tải file lên')
    } finally {
      setIsUploadingDoc(false)
      e.target.value = ''
    }
  }

  const handleDeleteDoc = async (fileId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá tài liệu này?')) return
    try {
      await deleteRoomFile(roomId, fileId)
      fetchDocs()
    } catch (err) {
      alert('Lỗi khi xoá file')
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  const handleSend = async (e: any) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isSending || !activeChannel) return

    setIsSending(true)
    try {
      await sendMessage(roomId, activeChannel.id || activeChannel._id, text)
      setInput('')
      sendTyping(roomId, activeChannel.id || activeChannel._id, false)
    } catch (err: any) {
      alert(err.message || 'Không gửi được tin nhắn')
    } finally {
      setIsSending(false)
    }
  }

  const handleInputChange = (e: any) => {
    setInput(e.target.value)
    if (socket?.connected && activeChannel) {
      sendTyping(roomId, activeChannel.id || activeChannel._id, true)
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(roomId, activeChannel.id || activeChannel._id, false)
      }, 2000)
    }
  }

  const handleAddChannel = async () => {
    const name = prompt('Nhập tên channel mới (không dấu, không khoảng trắng):')
    if (!name || !name.trim()) return
    try {
      const res = await createChannel(roomId, { name: name.trim() })
      setChannels(prev => [...prev, res])
    } catch (err: any) {
      alert(err.response?.data?.error || err.message)
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa channel này? Toàn bộ tin nhắn sẽ bị mất.')) return
    try {
      await deleteChannel(roomId, channelId)
      setChannels(prev => prev.filter(c => (c._id || c.id) !== channelId))
      if ((activeChannel?._id || activeChannel?.id) === channelId) setActiveChannel(channels[0])
    } catch (err: any) {
      alert(err.response?.data?.error || err.message)
    }
  }

  const handleKickMember = async (userId: string) => {
    if (!confirm('Kick thành viên này khỏi phòng?')) return
    try {
      await kickMember(roomId, userId)
      setMembers(prev => prev.filter(m => (m.user_id || m._id) !== userId))
    } catch (err: any) {
      alert(err.response?.data?.error || err.message)
    }
  }

  const handleUpdateRoom = async (e: any) => {
    e.preventDefault();
    try {
      await updateRoom(roomId, settingsForm);
      setShowSettingsModal(false);
      await fetchRoomDetail();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  }

  const handleDeleteRoom = async () => {
    if (!confirm('Bạn có chắc muốn xóa phòng này? Không thể hoàn tác!')) return;
    try {
      await deleteRoom(roomId);
      router.push('/dashboard/rooms');
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="w-16 h-16 border-[4px] border-black border-t-[#9B51E0] rounded-full animate-spin shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
      </div>
    )
  }

  const typingText = Object.values(typingUsers).filter((t: any) => t.isTyping).map((t: any) => t.name)
  const displayTyping = typingText.length > 0 ? `${typingText.join(', ')} đang gõ...` : ''
  const canManage = myRole === 'owner' || myRole === 'admin'

  return (
    <>
      <div className="h-[calc(100vh-120px)] max-h-[900px] flex gap-6 pb-6">
      
      {/* Left Sidebar: Channels */}
      <div className="w-64 bg-white border-[3px] border-black rounded-2xl flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex-shrink-0">
        <div className="p-4 border-b-[3px] border-black bg-[#FFC224]">
          <h2 className="font-black text-xl truncate">{room.name}</h2>
          <div className="text-xs font-bold mt-1 bg-white px-2 py-1 rounded border-[2px] border-black w-fit">
            Mã: <span className="text-[#3C73ED] tracking-wider">{room.invite_code}</span>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
            <span>Kênh thảo luận</span>
            {canManage && (
              <button onClick={handleAddChannel} className="p-1 hover:bg-gray-200 rounded text-black transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          {channels.map((ch: any) => {
            const id = ch._id || ch.id
            const isActive = (activeChannel?._id || activeChannel?.id) === id
            return (
              <div 
                key={id}
                onClick={() => { setActiveChannel(ch); setMessages([]); }}
                className={`flex justify-between items-center px-3 py-2 border-[2px] border-black rounded-xl font-bold cursor-pointer transition-all ${
                  isActive ? 'bg-[#3C73ED] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Hash className="w-4 h-4" />
                  <span className="truncate">{ch.name}</span>
                </div>
                {canManage && ch.name !== 'general' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteChannel(id); }}
                    className={`p-1 rounded transition-colors ${isActive ? 'text-white hover:bg-white/20' : 'text-gray-400 hover:text-red-500'}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t-[3px] border-black bg-gray-50 space-y-2">
          {canManage && (
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border-[2px] border-black rounded-xl font-bold hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
              <span className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Cài đặt</span>
            </button>
          )}
          <button 
            onClick={() => {
              setNicknameInput(nicknames[myUserId] || '')
              setShowNicknameModal(true)
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#FFC224] border-[2px] border-black rounded-xl font-bold hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Đổi biệt danh</span>
          </button>
          <button 
            onClick={() => router.push('/dashboard/rooms')}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#EA4335] text-white border-[2px] border-black rounded-xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
          >
            <span className="flex items-center gap-2"><LogOut className="w-4 h-4" /> Rời phòng</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white border-[3px] border-black rounded-2xl flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b-[3px] border-black flex items-center gap-3">
          <Hash className="w-6 h-6 text-[#3C73ED]" />
          <div>
            <h3 className="font-black text-xl">{activeChannel?.name || 'Tán gẫu'}</h3>
            <p className="text-sm font-bold text-gray-500">Kênh thảo luận chung</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 flex flex-col gap-4 relative">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mb-4 text-gray-300" />
              <p className="font-black text-xl text-black">Chưa có tin nhắn nào</p>
              <p className="font-bold">Hãy là người đầu tiên mở lời trong #{activeChannel?.name}!</p>
            </div>
          ) : (
            messages.map((msg: any, idx: number) => {
              const isMine = (msg.user?.id || msg.user?._id) === myUserId
              return (
                <div key={msg.id || idx} className={`flex gap-3 max-w-[80%] ${isMine ? 'self-end flex-row-reverse' : 'self-start'}`}>
                  <div className="w-10 h-10 flex-shrink-0 bg-[#FFC224] border-[2px] border-black rounded-full flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {msg.user?.avatar ? <img src={msg.user.avatar} className="w-full h-full rounded-full" /> : (msg.user?.name || '?')[0].toUpperCase()}
                  </div>
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1 mx-1">
                      <span className="font-black text-sm">{nicknames[msg.user?.id || msg.user?._id] || msg.user?.nickname || msg.user?.name || 'Unknown'}</span>
                      <span className="text-xs font-bold text-gray-400">{new Date(msg.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className={`px-4 py-2 border-[2px] border-black rounded-2xl font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      isMine ? 'bg-[#3C73ED] text-white rounded-tr-sm' : 'bg-white text-black rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          {displayTyping && (
            <div className="text-xs font-bold text-gray-500 italic mt-2 ml-14 animate-pulse">
              {displayTyping}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t-[3px] border-black bg-white flex gap-3">
          <input
            type="text"
            placeholder={`Nhắn tin trong #${activeChannel?.name || 'tán_gẫu'}... (gõ @AI để hỏi PeerBot 🤖)`}
            value={input}
            onChange={handleInputChange}
            className="flex-1 px-4 py-3 bg-gray-50 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-[#10B981]/20 shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isSending}
            className="px-6 py-3 bg-[#10B981] text-white border-[3px] border-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Right Sidebar: PvP Battle + Members */}
      <div className="w-64 flex flex-col gap-4 flex-shrink-0 overflow-y-auto">
        {/* PvP Quiz Battle */}
        {roomId && myUserId && <BattlePanel roomId={roomId} myUserId={myUserId} />}

      <div className="bg-white border-[3px] border-black rounded-2xl flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="p-4 border-b-[3px] border-black flex items-center justify-between">
          <h3 className="font-black flex items-center gap-2"><Users className="w-5 h-5"/> Thành viên</h3>
          <span className="bg-[#9B51E0] text-white text-xs font-black px-2 py-1 rounded-md border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {members.length}
          </span>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {['owner', 'admin', 'member'].map(roleGroup => {
            const groupMembers = members.filter(m => m.role === roleGroup)
            if (groupMembers.length === 0) return null
            
            return (
              <div key={roleGroup} className="mb-4">
                <div className="text-xs font-black text-gray-400 uppercase mb-2 flex items-center gap-2">
                  {roleGroup === 'owner' ? '👑 Chủ phòng' : roleGroup === 'admin' ? '🛡️ Quản trị viên' : '👥 Thành viên'}
                  — {groupMembers.length}
                </div>
                <div className="space-y-2">
                  {groupMembers.map(m => {
                    const id = m.user_id || m._id
                    const isOnline = onlineUserIds.has(id)
                    return (
                      <div key={id} className="group flex items-center justify-between p-2 hover:bg-gray-50 border-[2px] border-transparent hover:border-black rounded-xl transition-all">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 bg-[#FFC224] border-[2px] border-black rounded-full flex items-center justify-center font-black text-xs overflow-hidden">
                              {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" /> : (m.name || 'U')[0].toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-[2px] border-black rounded-full ${isOnline ? 'bg-[#10B981]' : 'bg-gray-400'}`} />
                          </div>
                          <div className="font-bold text-sm truncate max-w-[90px]">{nicknames[id] || m.nickname || m.name}</div>
                        </div>
                        {canManage && id !== myUserId && roleGroup !== 'owner' && (
                          <button onClick={() => handleKickMember(id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 p-1 rounded transition-all">
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t-[3px] border-black bg-gray-50 space-y-2">
          <button onClick={handleOpenDocs} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#FFC224] border-[2px] border-black rounded-xl font-black hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
            <FileText className="w-4 h-4" /> Quản lý tài liệu
          </button>
        </div>
      </div>
      </div>

    </div>

      {/* Docs Modal */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b-[4px] border-black flex justify-between items-center bg-[#FFC224]">
              <h2 className="text-2xl font-black flex items-center gap-2">
                 <FileText className="w-6 h-6" /> Quản lý tài liệu phòng
              </h2>
              <button 
                onClick={() => setShowDocsModal(false)}
                className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg">Tài liệu đã chia sẻ</h3>
                <div>
                  <input type="file" id="upload-doc" className="hidden" onChange={handleUploadDoc} />
                  <label htmlFor="upload-doc" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white font-black border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                    {isUploadingDoc ? <span className="animate-spin text-xl">⏳</span> : <Upload className="w-4 h-4" />}
                    {isUploadingDoc ? 'Đang tải...' : 'Tải lên tài liệu mới'}
                  </label>
                </div>
              </div>

              {roomFiles.length === 0 ? (
                <div className="text-center p-8 text-gray-500 font-bold border-[3px] border-dashed border-gray-300 rounded-2xl bg-white">
                  Chưa có tài liệu nào trong phòng này.
                </div>
              ) : (
                <div className="grid gap-3">
                  {roomFiles.map(file => (
                    <div key={file.id} className="bg-white p-4 border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-[#3C73ED] text-white flex items-center justify-center font-black rounded-lg border-[2px] border-black shrink-0">
                          {file.file_type.substring(0, 3).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-sm truncate">{file.original_name}</div>
                          <div className="text-xs text-gray-500 font-bold">
                            {(file.file_size / 1024 / 1024).toFixed(2)} MB • Người tải lên: {nicknames[file.uploaded_by] || 'Thành viên'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <a href={`http://localhost:5000${file.storage_url}`} target="_blank" download className="p-2 bg-[#FFC224] border-[2px] border-black rounded-lg hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                          <Download className="w-4 h-4" />
                        </a>
                        {(canManage || file.uploaded_by === myUserId) && (
                          <button onClick={() => handleDeleteDoc(file.id)} className="p-2 bg-[#EA4335] text-white border-[2px] border-black rounded-lg hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nickname Modal */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b-[4px] border-black flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black flex items-center gap-2">
                 Đổi biệt danh
              </h2>
              <button 
                onClick={() => setShowNicknameModal(false)}
                className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-black mb-2">Biệt danh mới</label>
                <input 
                  type="text"
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  placeholder="Nhập biệt danh hoặc để trống"
                  className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-[#3C73ED]/20 shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                />
              </div>
              <button 
                onClick={() => {
                  const val = nicknameInput.trim();
                  if (val) {
                    localStorage.setItem(`nickname_${roomId}`, val)
                    socket?.emit('change-nickname', { roomId, nickname: val })
                  } else {
                    localStorage.removeItem(`nickname_${roomId}`)
                    socket?.emit('change-nickname', { roomId, nickname: '' })
                  }
                  setShowNicknameModal(false)
                }}
                className="w-full py-3 bg-[#3C73ED] text-white border-[3px] border-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Lưu biệt danh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b-[4px] border-black flex justify-between items-center bg-gray-50">
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Settings2 className="w-6 h-6" /> Cài đặt phòng
              </h2>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-black mb-2">Tên phòng</label>
                <input 
                  type="text"
                  required
                  value={settingsForm.name}
                  onChange={e => setSettingsForm({...settingsForm, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-[#3C73ED]/20 shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-black mb-2">Mô tả ngắn</label>
                <textarea 
                  rows={2}
                  value={settingsForm.description}
                  onChange={e => setSettingsForm({...settingsForm, description: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-[#3C73ED]/20 shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)] resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-black mb-2">Chủ đề (Topic)</label>
                <input 
                  type="text"
                  value={settingsForm.topic}
                  onChange={e => setSettingsForm({...settingsForm, topic: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-[#3C73ED]/20 shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 border-[3px] border-black rounded-xl">
                <input 
                  type="checkbox"
                  id="isPublic"
                  checked={settingsForm.is_public}
                  onChange={e => setSettingsForm({...settingsForm, is_public: e.target.checked})}
                  className="w-5 h-5 accent-[#3C73ED] border-black"
                />
                <label htmlFor="isPublic" className="font-bold cursor-pointer select-none">
                  Hiển thị công khai
                  <div className="text-xs text-gray-500">Mọi người có thể thấy phòng ở mục Cộng đồng</div>
                </label>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  type="submit"
                  className="w-full py-3 bg-[#3C73ED] text-white border-[3px] border-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  Lưu thay đổi
                </button>
                
                {myRole === 'owner' && (
                  <button
                    type="button"
                    onClick={handleDeleteRoom}
                    className="w-full py-3 bg-white text-[#EA4335] border-[3px] border-[#EA4335] rounded-xl font-black hover:bg-red-50 transition-colors"
                  >
                    Xóa phòng học
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default function RoomViewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Đang tải phòng học...</div>}>
      <RoomViewInner />
    </Suspense>
  )
}
