import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { getCheatSheet, clearCheatSheet } from '../utils/api'
import './CheatSheet.css'

export default function CheatSheet({ folderId, folderName }) {
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cached, setCached] = useState(false)

  const loadCheatSheet = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getCheatSheet(folderId)
      setMarkdown(res.data.markdown)
      setCached(res.data.cached)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCheatSheet()
  }, [folderId])

  const handleRegenerate = async () => {
    try {
      await clearCheatSheet(folderId)
      await loadCheatSheet()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="cheatsheet-loading fade-in">
        <div className="loading-card">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-icon">🚨</div>
          </div>
          <h3>Đang tạo Phao Cứu Cấp...</h3>
          <p>AI đang phân tích tài liệu và tổng hợp kiến thức trọng tâm</p>
          <div className="skeleton-grid">
            <div className="skeleton skeleton-lg"></div>
            <div className="skeleton skeleton-sm"></div>
            <div className="skeleton skeleton-sm"></div>
            <div className="skeleton skeleton-md"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="cheatsheet-error fade-in">
        <div className="error-card glass">
          <span className="error-icon">⚠️</span>
          <h3>Không thể tạo phao</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadCheatSheet}>Thử lại</button>
        </div>
      </div>
    )
  }

  return (
    <div className="cheatsheet fade-in">
      <div className="cheatsheet-header">
        <div className="cheatsheet-title">
          <span className="cheatsheet-emoji">🚨</span>
          <div>
            <h2>Phao Cứu Cấp</h2>
            <p className="cheatsheet-folder">{folderName}</p>
          </div>
        </div>
        <div className="cheatsheet-actions">
          {cached && <span className="badge badge-accent">⚡ Cached</span>}
          <button className="btn btn-secondary" onClick={handleRegenerate}>
            🔄 Tạo lại
          </button>
        </div>
      </div>

      <div className="cheatsheet-content bento-grid">
        <div className="bento-card bento-main glass">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
