"use client"
import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import {
  getCheatSheet,
  clearCheatSheet,
  setCheatSheetTemplate,
  migrateCheatSheet
} from '@/lib/api'
import CheatSheetRenderer from './cheatsheet/CheatSheetRenderer'
import TemplatePicker from './cheatsheet/TemplatePicker'
import HandwritingUploadModal from './cheatsheet/HandwritingUploadModal'
import ExportButtons from './cheatsheet/ExportButtons'
import './CheatSheet.css'

export default function CheatSheet({ folderId, folderName }) {
  const [json, setJson] = useState<any>(null)
  const [markdown, setMarkdown] = useState('')
  const [template, setTemplate] = useState('neo-brutalism')
  const [font, setFont] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [cached, setCached] = useState(false)
  const [showHwModal, setShowHwModal] = useState(false)
  const [migrating, setMigrating] = useState(false)

  const renderRef = useRef(null)

  useEffect(() => {
    loadCheatSheet()
  }, [folderId])

  const loadCheatSheet = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getCheatSheet(folderId)
      // NFC normalize ngay tại response để fix Vietnamese diacritics dạng decomposed
      // (OpenAI đôi khi trả "Cáp" thay vì "Cấp")
      const nfc = (s) => typeof s === 'string' ? s.normalize('NFC') : s
      const normalizeJson = (j) => j ? {
        title: nfc(j.title),
        sections: (j.sections || []).map(s => ({
          heading: nfc(s.heading),
          blocks: (s.blocks || []).map(b => ({
            ...b,
            content: nfc(b.content),
            term: nfc(b.term),
            caption: nfc(b.caption),
            items: Array.isArray(b.items) ? b.items.map(nfc) : b.items
          }))
        }))
      } : null
      setJson(normalizeJson(res.data.json))
      setMarkdown(nfc(res.data.markdown || ''))
      setTemplate(res.data.template || 'neo-brutalism')
      setFont(res.data.font || '')
      setCached(!!res.data.cached)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    try {
      await clearCheatSheet(folderId)
      await loadCheatSheet()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleTemplateChange = async (newTpl) => {
    setTemplate(newTpl)
    try { await setCheatSheetTemplate(folderId, newTpl) } catch (e) { /* non-fatal */ }
  }

  const handleMigrate = async () => {
    setMigrating(true)
    try {
      const res = await migrateCheatSheet(folderId)
      if (res.data.json) {
        setJson(res.data.json)
        setMarkdown('')
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setMigrating(false)
    }
  }

  const handleHandwritingApplied = (fontFamily) => {
    setFont(fontFamily)
    setTemplate('sketch-notebook')
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
          <button className="btn btn-secondary" onClick={() => setShowHwModal(true)}>
            ✍️ Viết tay
          </button>
          <button className="btn btn-secondary" onClick={handleRegenerate}>
            🔄 Tạo lại
          </button>
        </div>
      </div>

      {json && (
        <div className="cheatsheet-toolbar">
          <TemplatePicker value={template} onChange={handleTemplateChange} />
          <ExportButtons targetRef={renderRef} fileName={folderName} />
        </div>
      )}

      <div className="cheatsheet-content">
        {json ? (
          <CheatSheetRenderer ref={renderRef} data={json} template={template} font={font} />
        ) : markdown ? (
          <div className="bento-card bento-main glass">
            <div className="cheatsheet-legacy-notice">
              <span>📜 Phao này dùng định dạng cũ.</span>
              <button className="btn btn-primary btn-sm" onClick={handleMigrate} disabled={migrating}>
                {migrating ? 'Đang nâng cấp...' : '✨ Nâng cấp lên template mới'}
              </button>
            </div>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="bento-card bento-main glass">
            <p>Chưa có nội dung.</p>
          </div>
        )}
      </div>

      {showHwModal && (
        <HandwritingUploadModal
          folderId={folderId}
          currentFont={font}
          onClose={() => setShowHwModal(false)}
          onApplied={handleHandwritingApplied}
        />
      )}
    </div>
  )
}
