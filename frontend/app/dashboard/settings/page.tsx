"use client"

import { useState, useEffect, useRef } from 'react'
import { getMe, updateMe, uploadAvatar } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { User, LogOut, Mail, GraduationCap, Shield, HardDrive, Cpu, Settings2, Camera, X } from 'lucide-react'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '@/lib/cropImage'

const PRESET_AVATARS = [
  // Nam
  'https://api.dicebear.com/9.x/open-peeps/svg?seed=Jack',
  'https://api.dicebear.com/9.x/open-peeps/svg?seed=Felix',
  'https://api.dicebear.com/9.x/open-peeps/svg?seed=Jude',
  'https://api.dicebear.com/9.x/open-peeps/svg?seed=Leo',
  'https://api.dicebear.com/9.x/open-peeps/svg?seed=Wyatt',
  // Nữ
  'https://api.dicebear.com/9.x/open-peeps/svg?seed=Mia',
  'https://api.dicebear.com/9.x/open-peeps/svg?seed=Zoe',
  'https://api.dicebear.com/9.x/open-peeps/svg?seed=Riley',
  'https://api.dicebear.com/9.x/open-peeps/svg?seed=Aneka',
  'https://api.dicebear.com/9.x/open-peeps/svg?seed=Avery'
]

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAvatarStore, setShowAvatarStore] = useState(false)
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getMe()
        const data = res.data as any
        setUser(data?.user || data || res)
      } catch (err) {
        console.error('Failed to fetch user', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleChangeAvatar = async (url: string) => {
    try {
      setIsUpdatingAvatar(true)
      const updatedUser = await updateMe({ avatar_url: url })
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      window.dispatchEvent(new Event('storage')) // to update sidebar
      setShowAvatarStore(false)
    } catch (err) {
      alert("Lỗi cập nhật ảnh đại diện")
    } finally {
      setIsUpdatingAvatar(false)
    }
  }

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropImageSrc(reader.result?.toString() || null);
      setShowAvatarStore(false);
    });
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleConfirmCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      setIsUpdatingAvatar(true);
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      const updatedUser = await uploadAvatar(croppedBlob);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('storage'));
      setCropImageSrc(null);
    } catch (err) {
      alert("Lỗi tải ảnh lên");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <div className="w-20 h-20 border-[4px] border-black border-t-[#3C73ED] rounded-full animate-spin shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6" />
        <p className="font-black text-xl">Đang tải cài đặt...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center pt-20">
        <h2 className="text-2xl font-black mb-4">Không thể tải thông tin cá nhân</h2>
        <button onClick={handleLogout} className="px-6 py-3 bg-[#EA4335] text-white font-black border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          Đăng xuất
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 bg-white border-[3px] border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="w-14 h-14 bg-[#3C73ED] border-[3px] border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Settings2 className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Cài đặt Tài khoản</h1>
          <p className="text-gray-500 font-bold">Quản lý thông tin và gói dịch vụ của bạn</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border-[3px] border-black rounded-3xl p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 border-b-[3px] border-black pb-4">
              <User className="w-6 h-6 text-[#9B51E0]" /> Thông tin cá nhân
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
              <div className="flex flex-col items-center gap-3">
                <div 
                  onClick={() => setShowAvatarStore(true)}
                  className="group relative w-32 h-32 bg-[#FFC224] border-[4px] border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex-shrink-0 cursor-pointer"
                >
                  {user.avatar_url || user.avatar ? (
                    <img src={user.avatar_url || user.avatar} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <span className="text-5xl font-black transition-transform group-hover:scale-110">{user.name?.[0]?.toUpperCase()}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <button 
                  onClick={() => setShowAvatarStore(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border-[2px] border-black rounded-xl font-bold hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-xs"
                >
                  <Camera className="w-4 h-4" /> Đổi Avatar
                </button>
              </div>
              
              <div className="space-y-4 flex-1">
                <div className="flex flex-col mb-4">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Họ và tên</label>
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="font-black text-3xl">{user.name}</div>
                    {user.username && (
                      <div 
                        onClick={() => { navigator.clipboard.writeText(user.username); alert('Đã copy ID!'); }}
                        className="flex items-center gap-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] px-3 py-1.5 border-[2px] border-black rounded-lg cursor-pointer transition-colors group mb-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                        title="Copy Username"
                      >
                        <span className="text-gray-500 font-black">#</span>
                        <span className="font-bold text-gray-800">{user.username.split('#')[1] || user.username}</span>
                        <span className="text-[10px] font-black text-[#9B51E0] ml-1 opacity-0 group-hover:opacity-100 transition-opacity">COPY</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border-[2px] border-black rounded-xl">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="font-bold">{user.email}</span>
                </div>
                
                {(user.school || user.cohort) && (
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border-[2px] border-black rounded-xl">
                    <GraduationCap className="w-5 h-5 text-gray-400" />
                    <span className="font-bold">{user.school} {user.cohort ? `- Khóa ${user.cohort}` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border-[3px] border-black rounded-3xl p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 border-b-[3px] border-black pb-4">
              <Shield className="w-6 h-6 text-[#10B981]" /> Bảo mật & Tùy chọn
            </h2>
            <p className="font-bold text-gray-600 mb-6">
              Các tính năng đổi mật khẩu và cập nhật thông tin hiện đang được tích hợp vào ứng dụng di động PeerNoted. Vui lòng sử dụng app để thay đổi.
            </p>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-6 py-3 bg-[#EA4335] text-white border-[3px] border-black rounded-xl font-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <LogOut className="w-5 h-5" /> Đăng xuất khỏi thiết bị này
            </button>
          </div>
        </div>

        {/* Quota & Stats */}
        <div className="space-y-6">
          <div className="bg-[#9B51E0] text-white border-[3px] border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
              <HardDrive className="w-5 h-5" /> Dung lượng lưu trữ
            </h2>
            <div className="text-3xl font-black mb-2 tracking-tight">
              {user.storage_used ? (user.storage_used / 1024 / 1024).toFixed(1) : "0.0"} <span className="text-xl">MB</span>
            </div>
            <div className="w-full bg-black/20 h-4 border-[2px] border-black rounded-full overflow-hidden mt-4">
              <div className="bg-[#FFC224] h-full" style={{ width: '10%' }} />
            </div>
            <p className="text-sm font-bold mt-2 text-white/80">Miễn phí 5GB dành cho sinh viên</p>
          </div>

        </div>

      </div>

      {/* Avatar Store Modal */}
      {showAvatarStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b-[4px] border-black flex justify-between items-center bg-[#FFC224]">
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Camera className="w-6 h-6" /> Cửa hàng Avatar
              </h2>
              <button 
                onClick={() => setShowAvatarStore(false)}
                className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50">
              <p className="font-bold text-gray-600 mb-6 text-center">Chọn một giao diện hoạt hình mang phong cách Student cho hồ sơ của bạn!</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    disabled={isUpdatingAvatar}
                    onClick={() => handleChangeAvatar(url)}
                    className="group relative bg-white border-[3px] border-black rounded-2xl aspect-square flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden"
                  >
                    <img src={url} alt={`Avatar ${idx}`} className="w-[80%] h-[80%] object-contain group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t-[3px] border-black flex flex-col items-center">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdatingAvatar}
                  className="px-6 py-3 bg-[#3C73ED] text-white font-black border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" /> Hoặc tải ảnh từ thiết bị
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b-[4px] border-black flex justify-between items-center bg-[#FFC224]">
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Camera className="w-6 h-6" /> Cắt ảnh đại diện
              </h2>
              <button 
                onClick={() => setCropImageSrc(null)}
                className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative w-full h-[400px] bg-black">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-6 bg-gray-50 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="font-bold text-sm text-gray-700">Thu phóng</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <button 
                onClick={handleConfirmCrop}
                disabled={isUpdatingAvatar}
                className="w-full py-4 bg-[#3C73ED] text-white font-black text-xl border-[4px] border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isUpdatingAvatar ? 'Đang cập nhật...' : 'Xác nhận & Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
