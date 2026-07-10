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
  migrateCheatSheet,
  generateMindmap
} from '@/lib/api'
import CheatSheetRenderer from './cheatsheet/CheatSheetRenderer'
import TemplatePicker from './cheatsheet/TemplatePicker'
import HandwritingUploadModal from './cheatsheet/HandwritingUploadModal'
import ExportButtons from './cheatsheet/ExportButtons'
import MindmapView from './MindmapView'
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

  // Mindmap (sơ đồ tư duy)
  const [showMindmap, setShowMindmap] = useState(false)
  const [mindmap, setMindmap] = useState<any>(null)
  const [mindmapLoading, setMindmapLoading] = useState(false)
  const [mindmapError, setMindmapError] = useState<any>(null)

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

  const fetchMindmap = async () => {
    setMindmapLoading(true)
    setMindmapError(null)
    try {
      const res = await generateMindmap(folderId)
      // generateMindmap trả thẳng body { mindmap: {...} }
      setMindmap(res?.mindmap || res)
    } catch (err) {
      setMindmapError(
        err.response?.data?.error ||
        err.message ||
        'AI đang quá tải hoặc đã hết lượt. Vui lòng thử lại sau.'
      )
    } finally {
      setMindmapLoading(false)
    }
  }

  const openMindmap = () => {
    setShowMindmap(true)
    // Chỉ gọi AI lần đầu, các lần mở sau dùng lại kết quả đã cache
    if (!mindmap && !mindmapLoading) fetchMindmap()
  }

  const regenerateMindmap = () => {
    setMindmap(null)
    fetchMindmap()
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
          <button
            onClick={openMindmap}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-[3px] border-black text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            style={{ backgroundColor: '#6366F1' }}
          >
            🧠 Mindmap
          </button>
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

      {showMindmap && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-2"
          onClick={() => setShowMindmap(false)}
        >
          <div
            className="bg-white border-[3px] border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-4xl w-full mx-4 max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-[3px] border-black px-5 py-3 rounded-t-2xl"
              style={{ backgroundColor: '#6366F1' }}
            >
              <h3 className="flex items-center gap-2 font-black text-white text-lg">
                <span aria-hidden>🧠</span> Sơ đồ tư duy
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={regenerateMindmap}
                  disabled={mindmapLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-[2px] border-black bg-white text-black font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  🔄 Tạo lại
                </button>
                <button
                  onClick={() => setShowMindmap(false)}
                  aria-label="Đóng"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-[2px] border-black bg-white text-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 md:p-6">
              {mindmapLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <div
                    className="w-14 h-14 rounded-full border-[4px] border-black border-t-transparent animate-spin"
                    style={{ borderRightColor: '#6366F1', borderBottomColor: '#6366F1' }}
                  />
                  <p className="font-black text-black text-lg">AI đang vẽ sơ đồ tư duy...</p>
                  <p className="font-medium text-black/60 text-sm">
                    Quá trình này có thể mất khoảng 10-20 giây.
                  </p>
                </div>
              ) : mindmapError ? (
                <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                  <span className="text-4xl" aria-hidden>😵</span>
                  <p className="font-black text-black text-lg">Không thể tạo sơ đồ tư duy</p>
                  <p className="max-w-md font-medium text-black/70 text-sm">{String(mindmapError)}</p>
                  <button
                    onClick={regenerateMindmap}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border-[3px] border-black text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    style={{ backgroundColor: '#EA4335' }}
                  >
                    🔄 Thử lại
                  </button>
                </div>
              ) : mindmap ? (
                <MindmapView data={mindmap} />
              ) : (
                <div className="py-14 text-center font-bold text-black/60">
                  Chưa có sơ đồ tư duy.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
