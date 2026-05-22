import { useState, useEffect, useRef } from 'react'
import { generatePodcast } from '../utils/api'
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
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const analyserRef = useRef(null)

  useEffect(() => {
    loadPodcast()
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [folderId])

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

  // Draw static "idle" bars so the canvas doesn't look like a broken grey box
  // before the user presses play.
  useEffect(() => {
    if (analyserRef.current) return // live visualizer is running
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const barCount = 32
    const barWidth = (canvas.width / barCount) * 1.5
    let x = 0
    for (let i = 0; i < barCount; i++) {
      const t = (Math.sin(i * 0.6) + 1) / 2
      const barHeight = canvas.height * (0.18 + 0.45 * t)
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight)
      gradient.addColorStop(0, '#7c3aed')
      gradient.addColorStop(1, '#a78bfa')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, 3)
      ctx.fill()
      x += barWidth
    }
  }, [audioUrl])

  const setupVisualizer = () => {
    if (!audioRef.current || !canvasRef.current) return
    if (analyserRef.current) return // already set up
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioCtx.createAnalyser()
      const source = audioCtx.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(audioCtx.destination)
      analyser.fftSize = 64
      analyserRef.current = analyser
      drawWaveform()
    } catch (e) {
      console.warn('Visualizer setup skipped:', e.message)
    }
  }

  const drawWaveform = () => {
    const canvas = canvasRef.current
    if (!canvas || !analyserRef.current) return
    const ctx = canvas.getContext('2d')
    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 1.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight)
        gradient.addColorStop(0, '#7c3aed')
        gradient.addColorStop(1, '#a78bfa')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, 3)
        ctx.fill()

        x += barWidth
      }
    }
    draw()
  }

  const togglePlay = async () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }
    try {
      await audioRef.current.play()
      setIsPlaying(true)
      if (!analyserRef.current) setupVisualizer()
    } catch (e) {
      console.error('Audio play failed:', e)
      setError('Trình duyệt không cho phát audio: ' + e.message)
    }
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
    // Estimate active script line
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
    const pct = x / rect.width
    audioRef.current.currentTime = pct * duration
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="podcast-loading fade-in">
        <div className="loading-card">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-icon">🎙️</div>
          </div>
          <h3>Đang tạo Podcast...</h3>
          <p>AI đang viết kịch bản và tổng hợp giọng nói</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="podcast-error fade-in">
        <div className="error-card glass">
          <span className="error-icon">⚠️</span>
          <h3>Lỗi tạo Podcast</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadPodcast}>Thử lại</button>
        </div>
      </div>
    )
  }

  return (
    <div className="podcast fade-in">
      {/* Audio Player Card */}
      <div className="player-card glass">
        <div className="player-top">
          {/* Vinyl Disc */}
          <div className={`vinyl-container ${isPlaying ? 'playing' : ''}`}>
            <div className="vinyl-disc">
              <div className="vinyl-grooves">
                <div className="vinyl-groove"></div>
                <div className="vinyl-groove"></div>
                <div className="vinyl-groove"></div>
              </div>
              <div className="vinyl-label">
                <span>🎙️</span>
              </div>
            </div>
          </div>

          {/* Player Info */}
          <div className="player-info">
            <h2 className="player-title">Podcast học tập</h2>
            <p className="player-folder">{folderName}</p>
            <p className="player-meta">{script.length} lượt thoại • 2 MC</p>
          </div>
        </div>

        {/* Waveform Visualizer */}
        <div className="waveform-container">
          <canvas ref={canvasRef} className="waveform-canvas" width="600" height="80"></canvas>
        </div>

        {/* Native HTML5 controls — guaranteed to render the play/pause/seek UI */}
        {audioUrl ? (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            preload="metadata"
            className="native-audio"
            onPlay={() => { setIsPlaying(true); if (!analyserRef.current) setupVisualizer() }}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(audioRef.current.duration)}
            onEnded={() => setIsPlaying(false)}
          />
        ) : null}

        {!audioUrl && (
          <div className="no-audio-notice">
            <p>🔇 Âm thanh chưa khả dụng (cần cài TTS). Xem kịch bản bên dưới.</p>
          </div>
        )}
      </div>

      {/* Script Transcript */}
      <div className="script-container glass">
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
    </div>
  )
}
