import { useState } from 'react'
import { deleteFiles } from '../utils/api'
import './FileList.css'

const FILE_ICONS = {
  pdf: '📕',
  docx: '📘',
  doc: '📘',
  txt: '📄',
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  gif: '🖼️',
  webp: '🖼️',
  default: '📎'
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Utility to fix double-encoded UTF-8 strings
function decodeFilename(str) {
  if (!str) return '';
  try {
    const isDoubleEncoded = /[\u00c0-\u00df][\u0080-\u00bf]/.test(str) || /[\u00e0-\u00ef][\u0080-\u00bf]{2}/.test(str);
    if (isDoubleEncoded) {
      const bytes = new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch (e) { }
  return str;
}

export default function FileList({ files, onRefresh, onPlayPodcast }) {
  const [selectedIds, setSelectedIds] = useState(new Set())

  const allSelected = files.length > 0 && selectedIds.size === files.length
  const someSelected = selectedIds.size > 0

  // Toggle single file
  const toggleFile = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(files.map(f => f._id)))
    }
  }

  // Delete single file
  const handleDeleteSingle = async (fileId) => {
    if (!confirm('Xóa file này?')) return
    try {
      await deleteFile(fileId)
      setSelectedIds(prev => { const n = new Set(prev); n.delete(fileId); return n })
      onRefresh()
    } catch (err) {
      console.error('Delete file error:', err)
    }
  }

  // Delete selected files
  const handleDeleteSelected = async () => {
    const count = selectedIds.size
    if (!confirm(`Xóa ${count} file đã chọn? Hành động này không thể hoàn tác.`)) return
    try {
      await deleteFiles([...selectedIds])
      setSelectedIds(new Set())
      onRefresh()
    } catch (err) {
      console.error('Batch delete error:', err)
    }
  }

  if (files.length === 0) {
    return (
      <div className="file-empty fade-in">
        <div className="file-empty-icon">📂</div>
        <h3>Thư mục trống</h3>
        <p>Kéo thả file vào dropzone ở trên để thêm tài liệu.</p>
      </div>
    )
  }

  return (
    <div className="file-list fade-in">
      {/* Header row */}
      <div className="file-list-header">
        <div className="file-col-check">
          <input
            type="checkbox"
            className="file-checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            title={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          />
        </div>
        <span className="file-col-name">Tên file</span>
        <span className="file-col-tags">Tags</span>
        <span className="file-col-size">Dung lượng</span>
        <span className="file-col-date">Ngày up</span>
        <span className="file-col-actions"></span>
      </div>

      {/* Batch action bar */}
      {someSelected && (
        <div className="file-batch-bar fade-in">
          <span className="file-batch-count">Đã chọn <strong>{selectedIds.size}</strong> file</span>
          <div className="file-batch-actions">
            <button
              className="btn-batch-delete"
              onClick={handleDeleteSelected}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
              </svg>
              Xóa {selectedIds.size} file
            </button>
            <button className="btn-batch-cancel" onClick={() => setSelectedIds(new Set())}>
              Hủy chọn
            </button>
          </div>
        </div>
      )}

      {/* File rows */}
      {files.map((file, idx) => {
        const isChecked = selectedIds.has(file._id)
        return (
          <div
            key={file._id}
            className={`file-row ${isChecked ? 'selected' : ''}`}
            style={{ animationDelay: `${idx * 0.05}s` }}
            onClick={() => toggleFile(file._id)}
          >
            <div className="file-col-check" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                className="file-checkbox"
                checked={isChecked}
                onChange={() => toggleFile(file._id)}
              />
            </div>

            <div className="file-col-name" onClick={(e) => e.stopPropagation()}>
              <span className="file-icon">
                {FILE_ICONS[file.file_type] || FILE_ICONS.default}
              </span>
              <div className="file-name-group">
                <a
                  href={file.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-name"
                >
                  {decodeFilename(file.original_name)}
                </a>
                {file.ai_summary && (
                  <span className="file-summary">{decodeFilename(file.ai_summary)}</span>
                )}
              </div>
            </div>

            <div className="file-col-tags">
              {(file.ai_tags || []).map((tag, i) => (
                <span key={i} className="badge">{decodeFilename(tag)}</span>
              ))}
            </div>

            <div className="file-col-size">
              {formatSize(file.file_size)}
            </div>

            <div className="file-col-date">
              {formatDate(file.createdAt)}
            </div>

            <div className="file-col-actions" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px' }}>
              {onPlayPodcast && (
                <button
                  className="btn-podcast-row"
                  onClick={(e) => { e.stopPropagation(); onPlayPodcast(file) }}
                  title="Tạo / nghe podcast cho folder này"
                  style={{
                    background: 'rgba(124, 58, 237, 0.1)',
                    color: '#7c3aed',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🎙️ Podcast
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
