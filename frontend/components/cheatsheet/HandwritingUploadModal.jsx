import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { analyzeHandwriting, pickHandwritingFontManual } from '@/lib/api'

const MANUAL_FONTS = [
  { family: 'Caveat', desc: 'Casual, nghiêng nhẹ, dày vừa' },
  { family: 'Patrick Hand', desc: 'In tay đều, đứng, rõ ràng' },
  { family: 'Dancing Script', desc: 'Thư pháp nối liền, nghiêng mạnh' },
  { family: 'Pacifico', desc: 'Tròn trịa, đậm, mềm mại' },
  { family: 'Be Vietnam Pro Italic', desc: 'Italic kiểu SGK, chuẩn mực' }
]

export default function HandwritingUploadModal({ folderId, currentFont, onClose, onApplied }) {
  const [mode, setMode] = useState('ai')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const onDrop = useCallback((accepted) => {
    setError(null)
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024
  })

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await analyzeHandwriting(folderId, file)
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (result) {
      onApplied(result.font_family)
      onClose()
    }
  }

  const handleManualPick = async (family) => {
    setLoading(true)
    setError(null)
    try {
      await pickHandwritingFontManual(folderId, family)
      onApplied(family)
      onClose()
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cs-modal-backdrop" onClick={onClose}>
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <div className="cs-modal-header">
          <h3>Phong cách viết tay</h3>
          <button className="cs-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="cs-modal-tabs">
          <button className={mode === 'ai' ? 'active' : ''} onClick={() => setMode('ai')}>
            🤖 AI phân tích từ ảnh
          </button>
          <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>
            ✋ Chọn thủ công
          </button>
        </div>

        {mode === 'ai' ? (
          <div className="cs-modal-body">
            <p className="cs-modal-hint">Upload ảnh chữ viết tay của bạn (1 đoạn ngắn, Tiếng Việt cũng được). AI sẽ chọn font Google Fonts phù hợp nhất.</p>

            <div {...getRootProps()} className={`cs-dropzone${isDragActive ? ' active' : ''}`}>
              <input {...getInputProps()} />
              {preview ? (
                <img src={preview} alt="handwriting sample" className="cs-preview" />
              ) : (
                <div className="cs-dropzone-empty">
                  <div className="cs-dropzone-icon">📷</div>
                  <p>Kéo thả hoặc bấm để chọn ảnh</p>
                  <small>JPG / PNG / WebP, tối đa 5MB</small>
                </div>
              )}
            </div>

            {result && (
              <div className="cs-result">
                <div className="cs-result-row">
                  <span className="cs-result-label">Font đề xuất:</span>
                  <strong style={{ fontFamily: `"${result.font_family}", cursive`, fontSize: 22 }}>
                    {result.font_family}
                  </strong>
                </div>
                <div className="cs-result-row">
                  <span className="cs-result-label">Lý do:</span>
                  <span>{result.reasoning}</span>
                </div>
                <div className="cs-result-row">
                  <span className="cs-result-label">Đặc điểm:</span>
                  <span>nghiêng <em>{result.slant}</em>, độ dày <em>{result.weight}</em></span>
                </div>
              </div>
            )}

            {error && <div className="cs-modal-error">⚠️ {error}</div>}

            <div className="cs-modal-actions">
              {!result ? (
                <button className="btn btn-primary" onClick={handleAnalyze} disabled={!file || loading}>
                  {loading ? 'Đang phân tích...' : '🔍 Phân tích'}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleApply}>
                  ✓ Áp dụng font này
                </button>
              )}
              <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
            </div>
          </div>
        ) : (
          <div className="cs-modal-body">
            <p className="cs-modal-hint">Chọn 1 trong 5 font handwriting có sẵn (đều hỗ trợ Tiếng Việt). Mẫu hiển thị bằng chính font đó.</p>
            <div className="cs-font-list">
              {MANUAL_FONTS.map(f => (
                <button
                  key={f.family}
                  className={`cs-font-item${currentFont === f.family ? ' active' : ''}`}
                  onClick={() => handleManualPick(f.family)}
                  disabled={loading}
                  style={{ fontFamily: `"${f.family}", cursive` }}
                >
                  <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${f.family.replace(/ /g, '+')}&display=swap&subset=vietnamese`} />
                  <span className="cs-font-name">{f.family}</span>
                  <span className="cs-font-sample">Phao cứu cấp môn Toán</span>
                  <span className="cs-font-desc">{f.desc}</span>
                </button>
              ))}
            </div>
            {error && <div className="cs-modal-error">⚠️ {error}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
