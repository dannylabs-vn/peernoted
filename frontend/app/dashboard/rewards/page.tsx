"use client"

import { useState, useEffect, useCallback } from 'react'
import { getRewards, unlockReward, getPeerPoints } from '@/lib/api'
import {
  Gift, Coins, User, Award, Crown, Sparkles, CheckCircle2, Loader2, Store, X
} from 'lucide-react'
import confetti from 'canvas-confetti'

type Reward = {
  id: string
  name: string
  description?: string
  cost: number
  image_url?: string
  reward_type: 'avatar' | 'role' | 'badge' | 'other'
  is_active?: boolean
  owned?: boolean
}

// Visual config per reward_type: icon + accent color (Google palette)
const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  avatar: { icon: User, color: '#4285F4', label: 'Avatar' },
  badge: { icon: Award, color: '#EA4335', label: 'Huy hiệu' },
  role: { icon: Crown, color: '#FBBC05', label: 'Danh hiệu' },
  other: { icon: Gift, color: '#34A853', label: 'Vật phẩm' },
}

function getTypeConfig(type?: string) {
  return TYPE_CONFIG[type || 'other'] || TYPE_CONFIG.other
}

export default function RewardsPage() {
  const [loading, setLoading] = useState(true)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [points, setPoints] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Read current userId from localStorage
  useEffect(() => {
    try {
      const u = localStorage.getItem('user')
      if (u) {
        const parsed = JSON.parse(u)
        const id = parsed.id || parsed._id || parsed.user?.id || parsed.user?._id || null
        setUserId(id)
      }
    } catch (e) {
      // ignore malformed localStorage
    }
  }, [])

  const loadPoints = useCallback(async (uid: string | null) => {
    if (!uid) {
      setPoints(0)
      return
    }
    try {
      const data = await getPeerPoints(uid)
      if (data && typeof data.total_points === 'number') {
        setPoints(data.total_points)
      } else {
        setPoints(0)
      }
    } catch (err) {
      console.error('Lỗi khi tải PeerPoints:', err)
      setPoints(0)
    }
  }, [])

  const loadRewards = useCallback(async () => {
    try {
      const res = await getRewards()
      // Handle res being an array OR res.rewards
      const list: Reward[] = Array.isArray(res) ? res : (res?.rewards || [])
      // Only show active rewards (default to active if flag missing)
      const active = list.filter((r) => r.is_active !== false)
      setRewards(active)

      // If the API also returns owned info, absorb it
      const owned: string[] =
        (Array.isArray(res) ? [] : (res?.owned || res?.unlocked || res?.owned_reward_ids || [])) || []
      const fromCards = list.filter((r) => r.owned).map((r) => r.id)
      const merged = [...owned, ...fromCards].map(String)
      if (merged.length > 0) {
        setOwnedIds((prev) => new Set([...Array.from(prev), ...merged]))
      }
    } catch (err) {
      console.error('Lỗi khi tải phần thưởng:', err)
      setRewards([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setLoading(true)
      await Promise.all([loadRewards(), loadPoints(userId)])
      if (!cancelled) setLoading(false)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [loadRewards, loadPoints, userId])

  const triggerConfetti = () => {
    confetti({
      particleCount: 160,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#4285F4', '#EA4335', '#34A853', '#FBBC05', '#000000'],
    })
  }

  const handleUnlock = async (reward: Reward) => {
    setUnlockingId(reward.id)
    try {
      await unlockReward(reward.id)
      // Success: mark owned, refetch points + rewards, confetti
      setOwnedIds((prev) => new Set([...Array.from(prev), String(reward.id)]))
      triggerConfetti()
      showToast(`Đã mở khóa "${reward.name}" thành công! 🎉`, 'success')
      await Promise.all([loadPoints(userId), loadRewards()])
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Không thể đổi phần thưởng. Vui lòng thử lại.'
      showToast(msg, 'error')
    } finally {
      setUnlockingId(null)
    }
  }

  // ===== Loading state =====
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <div className="w-20 h-20 border-[4px] border-black border-t-[#FBBC05] rounded-full animate-spin shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6" />
        <p className="font-black text-xl">Đang mở cửa hàng phần thưởng...</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1100px] mx-auto pb-16">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 border-[3px] border-black rounded-2xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success' ? 'bg-[#34A853] text-white' : 'bg-[#EA4335] text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          ) : (
            <X className="w-6 h-6 flex-shrink-0" />
          )}
          <span className="max-w-[280px]">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 bg-white border-[3px] border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#4285F4] border-[3px] border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Store className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Cửa Hàng PeerPoint 🎁</h1>
            <p className="text-gray-500 font-bold">Đổi điểm lấy phần thưởng độc quyền</p>
          </div>
        </div>

        {/* Balance badge */}
        <div className="flex items-center gap-3 bg-[#FBBC05] text-black border-[3px] border-black px-6 py-3 rounded-xl font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Coins className="w-7 h-7" />
          <span className="text-2xl">{points.toLocaleString('vi-VN')}</span>
          <span className="text-base">PeerPoint</span>
        </div>
      </div>

      {/* Explanation banner */}
      <div className="bg-[#4285F4] text-white border-[3px] border-black rounded-2xl p-5 mb-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-start gap-3">
        <div className="w-9 h-9 bg-white border-[2px] border-black rounded-lg flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Sparkles className="w-5 h-5 text-[#4285F4]" />
        </div>
        <p className="font-bold leading-relaxed">
          Kiếm PeerPoint bằng cách: đăng tài liệu <span className="font-black text-[#FBBC05]">(+5)</span>, thắng PvP Quiz{' '}
          <span className="font-black text-[#FBBC05]">(+50)</span>, tham gia thi đấu{' '}
          <span className="font-black text-[#FBBC05]">(+10)</span>. Dùng điểm để mở khóa avatar, badge, role đặc biệt!
        </p>
      </div>

      {/* Empty state */}
      {rewards.length === 0 ? (
        <div className="bg-white border-[4px] border-black rounded-3xl p-12 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-20 h-20 bg-[#FBBC05] border-[3px] border-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Gift className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-2xl font-black mb-2">Chưa có phần thưởng nào</h2>
          <p className="font-bold text-gray-500">
            Cửa hàng đang được cập nhật. Hãy quay lại sau để đổi những phần thưởng hấp dẫn nhé!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => {
            const cfg = getTypeConfig(reward.reward_type)
            const Icon = reward.reward_type === 'role' ? Crown : cfg.icon
            const owned = ownedIds.has(String(reward.id))
            const affordable = points >= reward.cost
            const isUnlocking = unlockingId === reward.id
            const missing = reward.cost - points

            return (
              <div
                key={reward.id}
                className="relative bg-white border-[3px] border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] flex flex-col hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                {/* Owned ribbon */}
                {owned && (
                  <div className="absolute -top-3 -right-3 bg-[#34A853] text-white border-[3px] border-black px-3 py-1 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 z-10">
                    <CheckCircle2 className="w-4 h-4" /> Đã sở hữu
                  </div>
                )}

                {/* Icon / image + type label */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-16 h-16 border-[3px] border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
                    style={{ backgroundColor: cfg.color }}
                  >
                    {reward.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={reward.image_url} alt={reward.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <span
                    className="px-3 py-1 border-[2px] border-black rounded-lg font-black text-xs uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    style={{ backgroundColor: cfg.color, color: '#fff' }}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* Name + description */}
                <h3 className="text-xl font-black mb-1 leading-tight">{reward.name}</h3>
                <p className="font-bold text-gray-500 text-sm mb-4 flex-1">
                  {reward.description || 'Phần thưởng đặc biệt dành cho bạn.'}
                </p>

                {/* Cost badge */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="inline-flex items-center gap-1.5 bg-[#FBBC05] text-black border-[2px] border-black px-3 py-1.5 rounded-lg font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Coins className="w-4 h-4" />
                    {reward.cost.toLocaleString('vi-VN')}
                  </div>
                  <span className="font-bold text-gray-400 text-sm">PeerPoint</span>
                </div>

                {/* Action button */}
                {owned ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#34A853] text-white border-[3px] border-black rounded-xl font-black opacity-90 cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Đã sở hữu
                  </button>
                ) : isUnlocking ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white border-[3px] border-black rounded-xl font-black cursor-wait"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang đổi...
                  </button>
                ) : affordable ? (
                  <button
                    onClick={() => handleUnlock(reward)}
                    disabled={unlockingId !== null}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#4285F4] text-white border-[3px] border-black rounded-xl font-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-5 h-5" /> Đổi ({reward.cost.toLocaleString('vi-VN')} điểm)
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-400 border-[3px] border-gray-300 rounded-xl font-black cursor-not-allowed"
                  >
                    Thiếu {missing.toLocaleString('vi-VN')} điểm
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
