"use client"

import { useState, useEffect, useRef } from 'react'
import { generatePodcast, clearPodcast } from '@/lib/api'
import { Play, Pause, RefreshCw, AlertTriangle, Mic2 } from 'lucide-react'

export default function AudioPlayer({ folderId, folderName }: { folderId: string, folderName: string }) {
  const [script, setScript] = useState<any[]>([])
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [activeLine, setActiveLine] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const loadPodcast = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await generatePodcast(folderId)
      setScript(res.data.script || [])
      setAudioUrl(res.data.audio_url)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPodcast()
  }, [folderId])

  const regeneratePodcast = async () => {
    setLoading(true)
    setError(null)
    setScript([])
    setAudioUrl(null)
    setIsPlaying(false)
    if (audioRef.current) audioRef.current.pause()
    try {
      await clearPodcast(folderId)
      const res = await generatePodcast(folderId)
      setScript(res.data.script || [])
      setAudioUrl(res.data.audio_url)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
    if (duration > 0 && script.length > 0) {
      const progress = audioRef.current.currentTime / duration
      const line = Math.floor(progress * script.length)
      setActiveLine(Math.min(line, script.length - 1))
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    audioRef.current.currentTime = pct * duration
  }

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center h-full">
        <div className="relative mb-6">
          <div className="w-20 h-20 border-[4px] border-black border-t-[#9B51E0] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🎙️</div>
        </div>
        <h3 className="text-2xl font-black mb-2">Đang tạo Podcast...</h3>
        <p className="text-gray-500 font-bold bg-gray-100 px-4 py-1 rounded-md border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">AI đang viết kịch bản và tổng hợp giọng nói</p>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center h-full">
        <AlertTriangle className="w-16 h-16 text-[#EA4335] mb-4" />
        <h3 className="text-2xl font-black mb-2 text-[#EA4335]">Lỗi tạo Podcast</h3>
        <p className="text-gray-700 font-semibold mb-6 max-w-md">{error}</p>
        <div className="flex gap-4">
          <button 
            className="btn-create-ai px-6 py-3 bg-[#9B51E0] text-white font-black rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
            onClick={regeneratePodcast}
          >
            <RefreshCw className="w-5 h-5" /> Tạo lại podcast
          </button>
          <button 
            className="px-6 py-3 bg-white text-black font-black rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            onClick={loadPodcast}
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  // Main Player
  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Player Card */}
      <div className="bg-[#9B51E0] border-[3px] border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white flex-shrink-0 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-6">
            {/* Visualizer */}
            <div className={`w-24 h-24 rounded-full border-[3px] border-black bg-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0 ${isPlaying ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`}>
              <Mic2 className="w-10 h-10 text-[#9B51E0]" />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black mb-1 truncate" style={{ textShadow: "2px 2px 0px #000" }}>Podcast học tập</h2>
              <p className="text-white/90 font-bold truncate mb-2">{folderName}</p>
              <div className="inline-block px-3 py-1 bg-white text-black text-xs font-black rounded-md border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                {script.length} lượt thoại • 2 MC
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-black w-10 text-right">{formatTime(currentTime)}</span>
            <div 
              className="flex-1 h-4 bg-white border-[2px] border-black rounded-full cursor-pointer overflow-hidden shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.2)]"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-[#FFC224] border-r-[2px] border-black transition-all duration-100 ease-linear"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              ></div>
            </div>
            <span className="text-sm font-black w-10">{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center">
            <div>
              {/* Spacer */}
            </div>
            
            <button 
              onClick={togglePlay}
              className="w-14 h-14 bg-[#FFC224] text-black rounded-full border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
            </button>

            <button 
              onClick={regeneratePodcast}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-black text-sm border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Tạo lại
            </button>
          </div>
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              console.warn('Audio failed to load, clearing URL')
              setAudioUrl(null)
              setIsPlaying(false)
              setError('File audio không còn khả dụng trên server (Render free tier xóa file khi sleep). Bấm "Tạo lại" để generate podcast mới.')
            }}
          />
        )}
      </div>

      {!audioUrl && (
        <div className="bg-[#FFC224] border-[2px] border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-center flex-shrink-0">
          🔇 Âm thanh chưa khả dụng. Xem kịch bản bên dưới hoặc bấm Tạo lại để generate.
        </div>
      )}

      {/* Script Transcript */}
      {script.length > 0 && (
        <div className="flex-1 bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b-[3px] border-black bg-gray-50">
            <h3 className="font-black text-lg">📜 Kịch bản Podcast</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {script.map((line, idx) => {
              const isA = line.speaker === 'MC_A';
              const isActive = idx === activeLine;
              
              return (
                <div 
                  key={idx} 
                  className={`flex gap-4 ${isA ? 'flex-row' : 'flex-row-reverse'} ${isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-[0.98]'} transition-all duration-300`}
                >
                  <div className={`w-12 h-12 rounded-full border-[2px] border-black flex items-center justify-center text-2xl flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isA ? 'bg-[#3C73ED]' : 'bg-[#EA4335]'}`}>
                    {isA ? '👨‍🎓' : '👩‍🏫'}
                  </div>
                  <div className={`flex-1 ${isA ? 'mr-12' : 'ml-12'}`}>
                    <span className={`text-xs font-black uppercase mb-1 block ${isA ? 'text-left text-[#3C73ED]' : 'text-right text-[#EA4335]'}`}>
                      {isA ? 'Minh (Hỏi)' : 'Lan (Giải thích)'}
                    </span>
                    <div className={`p-4 rounded-2xl border-[2px] border-black font-semibold text-[15px] leading-relaxed shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] ${isActive ? 'bg-[#FFC224] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-gray-50'}`}>
                      {line.text}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
