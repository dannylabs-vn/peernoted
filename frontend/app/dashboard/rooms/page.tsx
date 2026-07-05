"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getRooms, createRoom, joinRoom, getRoomDetail } from '@/lib/api'
import { BookOpen, Plus, Link as LinkIcon, Users as UsersIcon, Tag, X, UserCheck } from 'lucide-react'
import FriendsTab from './FriendsTab'

export default function RoomListPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'rooms' | 'friends'>('rooms')
  
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)) } catch {}
    }
  }, [])

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getRooms()
      setRooms(res || [])
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  const handleCreateRoom = async (e: any) => {
    e.preventDefault()
    const form = e.target
    const name = form.roomName.value.trim()
    if (!name) return

    try {
      const res = await createRoom({
        name,
        description: form.description.value.trim(),
        topic: form.topic.value.trim(),
        is_public: form.is_public.checked
      })
      setShowCreate(false)
      router.push(`/dashboard/rooms/view?id=${res.id || res._id}`)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message)
    }
  }

  const handleJoinRoom = async (e: any) => {
    e.preventDefault()
    if (!joinCode.trim()) return

    try {
      const result = await joinRoom(joinCode.trim().toUpperCase())
      setShowJoin(false)
      setJoinCode('')
      if (result.room_id) {
        router.push(`/dashboard/rooms/view?id=${result.room_id}`)
      }
      fetchRooms()
    } catch (err: any) {
      setError(err.response?.data?.error || err.message)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-[#FFC224] border-[3px] border-black p-8 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <div className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 border-[2px] border-black rounded-full font-black text-sm mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <BookOpen className="w-4 h-4 text-[#9B51E0]" />
            WORKSPACE
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-2" style={{ textShadow: "3px 3px 0px #fff" }}>Trung Tâm Kết Nối</h1>
          <p className="text-lg font-bold bg-white text-black px-3 py-1 rounded-md border-[2px] border-black inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Học tập nhóm và giao tiếp với bạn bè
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => { setShowCreate(true); setError(''); }}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-[#3C73ED] text-white border-[3px] border-black rounded-xl font-black text-lg hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <Plus className="w-6 h-6" /> Tạo Phòng
          </button>
          <button 
            onClick={() => { setShowJoin(true); setError(''); }}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-black border-[3px] border-black rounded-xl font-black text-lg hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <LinkIcon className="w-6 h-6" /> Tham Gia
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 border-[4px] border-black rounded-2xl font-black text-lg transition-all ${
            activeTab === 'rooms'
              ? 'bg-[#9B51E0] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] scale-105'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          <BookOpen className="w-6 h-6" /> Các Phòng Học
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 border-[4px] border-black rounded-2xl font-black text-lg transition-all ${
            activeTab === 'friends'
              ? 'bg-[#10B981] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] scale-105'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          <UserCheck className="w-6 h-6" /> Bạn Bè & Tin Nhắn
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-[#EA4335] text-white border-[3px] border-black rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
          <span className="bg-white text-[#EA4335] w-6 h-6 rounded-full flex items-center justify-center font-black">!</span>
          {error}
        </div>
      )}

      {/* Content */}
      {activeTab === 'friends' ? (
        currentUser ? <FriendsTab currentUser={currentUser} /> : <div className="text-center font-bold text-gray-500 mt-10">Đang tải thông tin người dùng...</div>
      ) : (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-16 h-16 border-[4px] border-black border-t-[#3C73ED] rounded-full animate-spin shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="bg-white border-[3px] border-black rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-24 h-24 bg-gray-100 border-[3px] border-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <BookOpen className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-black mb-2">Chưa có phòng học nào</h3>
              <p className="text-gray-500 font-bold mb-6">Tạo phòng mới hoặc tham gia bằng mã mời để bắt đầu!</p>
              <button 
                onClick={() => setShowCreate(true)}
                className="px-6 py-3 bg-[#10B981] text-white border-[3px] border-black rounded-xl font-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Tạo phòng ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {rooms.map((room) => (
                <div
                  key={room._id || room.id}
                  onClick={() => {
                    if (room.is_member) router.push(`/dashboard/rooms/view?id=${room._id || room.id}`)
                  }}
                  className={`group border-[3px] border-black rounded-2xl p-4 transition-all h-full flex flex-col ${
                    room.is_member 
                      ? 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-pointer'
                      : 'bg-gray-100 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-base font-black group-hover:text-[#9B51E0] transition-colors truncate">{room.name}</h3>
                    {room.is_member && (
                      <span className="px-2 py-0.5 bg-[#10B981] text-white border-[2px] border-black rounded-md text-[10px] font-black uppercase whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        Đã tham gia
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 font-bold text-xs mb-4 flex-1 line-clamp-2">
                    {room.description || 'Không có mô tả.'}
                  </p>
                  
                  <div className="space-y-3 mt-auto">
                    {room.topic && (
                      <div className="flex items-center gap-2 text-xs font-bold bg-purple-50 px-2 py-1 rounded-md border-[2px] border-black w-fit shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Tag className="w-3 h-3 text-[#9B51E0]" />
                        {room.topic}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-[10px] font-black pt-3 border-t-[3px] border-black">
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 bg-[#FFC224] border-[2px] border-black rounded-full flex items-center justify-center text-[10px]">
                          👤
                        </div>
                        <span className="truncate max-w-[80px]">{room.owner?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#3C73ED]">
                        <UsersIcon className="w-3 h-3" />
                        {room.member_count || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b-[4px] border-black bg-[#9B51E0] text-white flex justify-between items-center">
              <h3 className="text-2xl font-black">Tạo Phòng Mới</h3>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 bg-white border-[2px] border-black rounded-full text-black flex items-center justify-center font-black hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><X className="w-4 h-4"/></button>
            </div>
            {error && (
              <div className="mx-6 mt-6 p-4 bg-[#EA4335] text-white border-[3px] border-black rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
                <span className="bg-white text-[#EA4335] w-6 h-6 rounded-full flex items-center justify-center font-black">!</span>
                {error}
              </div>
            )}
            <form onSubmit={handleCreateRoom} className="p-6 space-y-5 bg-gray-50">
              <div>
                <label className="block text-sm font-black mb-2">Tên phòng *</label>
                <input name="roomName" required autoFocus className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]" placeholder="Ví dụ: Nhóm học Toán Rời Rạc..." />
              </div>
              <div>
                <label className="block text-sm font-black mb-2">Mô tả</label>
                <input name="description" className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]" placeholder="Mục đích của phòng..." />
              </div>
              <div>
                <label className="block text-sm font-black mb-2">Chủ đề</label>
                <input name="topic" className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]" placeholder="Ví dụ: Toán, IT, TOEIC..." />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-white border-[3px] border-black rounded-xl font-black hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <input name="is_public" type="checkbox" defaultChecked className="w-5 h-5 accent-[#9B51E0]" />
                Phòng công khai (Mọi người có thể thấy)
              </label>
              <div className="pt-4 border-t-[3px] border-black flex justify-end gap-4">
                <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-3 bg-white border-[3px] border-black rounded-xl font-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">Hủy</button>
                <button type="submit" className="px-6 py-3 bg-[#10B981] text-white border-[3px] border-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">Tạo Ngay</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b-[4px] border-black bg-[#3C73ED] text-white flex justify-between items-center">
              <h3 className="text-2xl font-black">Tham Gia Phòng</h3>
              <button onClick={() => setShowJoin(false)} className="w-8 h-8 bg-white border-[2px] border-black rounded-full text-black flex items-center justify-center font-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><X className="w-4 h-4"/></button>
            </div>
            {error && (
              <div className="mx-6 mt-6 p-4 bg-[#EA4335] text-white border-[3px] border-black rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
                <span className="bg-white text-[#EA4335] w-6 h-6 rounded-full flex items-center justify-center font-black">!</span>
                {error}
              </div>
            )}
            <form onSubmit={handleJoinRoom} className="p-6 space-y-5 bg-gray-50 text-center">
              <p className="font-bold text-gray-600 text-sm">Nhập mã mời gồm 6-8 ký tự do chủ phòng cung cấp.</p>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                autoFocus
                className="w-full text-center text-3xl tracking-[0.5em] px-4 py-4 bg-white border-[3px] border-black rounded-xl font-black uppercase focus:outline-none focus:ring-4 focus:ring-[#3C73ED]/20 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)]" 
                placeholder="XXXXXX" 
              />
              <button type="submit" className="w-full px-6 py-4 bg-[#FFC224] text-black border-[3px] border-black rounded-xl font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all">
                Vào Phòng
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
