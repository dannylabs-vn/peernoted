import { useState, useEffect, useRef } from 'react'
import { generatePodcast, clearPodcast } from '../utils/api'
import './AudioPlayer.css'

export default function AudioPlayer({ folderId, folderName }) {
  const [script, setScript] = useState([])
  const [audioUrl, setAudioUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [activeLine, setActiveLine] = useState(0)
  const audioRef = useRef(null)

  const loadPodcast = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await generatePodcast(folderId)
      setScript(res.data.script || [])
      setAudioUrl(res.data.audio_url)
    } catch (err) {
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
    } catch (err) {
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

  const handleSeek = (e) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    audioRef.current.currentTime = pct * duration
  }

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── Loading State ──
  if (loading) {
    return (
      <div className="podcast-loading">
        <div className="loading-card">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-icon">🎙️</div>
          </div>
          <h3>Đang tạo Podcast...</h3>
          <p className="shimmer-text">AI đang viết kịch bản và tổng hợp giọng nói</p>
        </div>
      </div>
    )
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="podcast-error">
        <div className="error-card glass">
          <span className="error-icon">⚠️</span>
          <h3>Lỗi tạo Podcast</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadPodcast}>
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  // ── Main Player ──
  return (
    <div className="podcast">
      {/* Audio Player Card */}
      <div className="player-card">
        <div className="player-top">
          {/* Equalizer Visualizer */}
          <div className={`eq-visualizer ${isPlaying ? 'playing' : ''}`}>
            <div className="eq-bar"></div>
            <div className="eq-bar"></div>
            <div className="eq-bar"></div>
            <div className="eq-bar"></div>
            <div className="eq-bar"></div>
            <div className="eq-bar"></div>
            <div className="eq-bar"></div>
          </div>

          {/* Player Info */}
          <div className="player-info">
            <h2 className="player-title">Podcast học tập</h2>
            <p className="player-folder">{folderName}</p>
            <p className="player-meta">{script.length} lượt thoại • 2 MC</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="player-controls">
          <span className="time-label">{formatTime(currentTime)}</span>
          <div className="progress-bar" onClick={handleSeek}>
            <div
              className="progress-fill"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            ></div>
          </div>
          <span className="time-label">{formatTime(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="player-buttons">
          <button className="play-btn" onClick={togglePlay} aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}>
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.5 3.5C6.5 3.1 6.8 2.9 7.1 3.1L20.3 11.3C20.6 11.5 20.6 12 20.3 12.2L7.1 20.4C6.8 20.6 6.5 20.4 6.5 20V3.5Z" />
              </svg>
            )}
          </button>

          <button className="regen-btn" onClick={regeneratePodcast} title="Tạo lại podcast">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Tạo lại</span>
          </button>
        </div>

        {/* Hidden audio element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(audioRef.current.duration)}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              // File 404 (Render ephemeral disk) hoặc MP3 hỏng → clear URL + báo user
              console.warn('Audio failed to load, clearing URL')
              setAudioUrl(null)
              setIsPlaying(false)
              setError('File audio không còn khả dụng trên server (Render free tier xóa file khi sleep). Bấm "Tạo lại" để generate podcast mới.')
            }}
          />
        )}

        {/* No audio fallback */}
        {!audioUrl && (
          <div className="no-audio-notice">
            <p>🔇 Âm thanh chưa khả dụng. Xem kịch bản bên dưới hoặc bấm <strong>Tạo lại</strong> để generate.</p>
          </div>
        )}
      </div>

      {/* Script Transcript */}
      {script.length > 0 && (
        <div className="script-container">
          <h3 className="script-title">📜 Kịch bản Podcast</h3>
          <div className="script-lines">
            {script.map((line, idx) => (
              <div
                key={idx}
                className={`script-line ${line.speaker === 'MC_A' ? 'speaker-a' : 'speaker-b'} ${idx === activeLine ? 'active' : ''}`}
              >
                <div className="speaker-avatar">
                  {line.speaker === 'MC_A' ? '👨‍🎓' : '👩‍🏫'}
                </div>
                <div className="speech-bubble">
                  <span className="speaker-name">
                    {line.speaker === 'MC_A' ? 'Minh (Hỏi)' : 'Lan (Giải thích)'}
                  </span>
                  <p>{line.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
