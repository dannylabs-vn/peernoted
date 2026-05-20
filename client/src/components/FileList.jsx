import { deleteFile } from '../utils/api'
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
    // Detect classic double-encoded UTF-8 characters (Latin-1 representation of multi-byte UTF-8)
    const isDoubleEncoded = /[\u00c0-\u00df][\u0080-\u00bf]/.test(str) || /[\u00e0-\u00ef][\u0080-\u00bf]{2}/.test(str);
    if (isDoubleEncoded) {
      const bytes = new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch (e) {
    // Fall back to original string on error
  }
  return str;
}


export default function FileList({ files, onRefresh }) {
  const handleDelete = async (fileId) => {
    if (!confirm('Xóa file này?')) return
    try {
      await deleteFile(fileId)
      onRefresh()
    } catch (err) {
      console.error('Delete file error:', err)
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
      <div className="file-list-header">
        <span className="file-col-name">Tên file</span>
        <span className="file-col-tags">Tags</span>
        <span className="file-col-size">Dung lượng</span>
        <span className="file-col-date">Ngày up</span>
        <span className="file-col-actions"></span>
      </div>

      {files.map((file, idx) => (
        <div
          key={file._id}
          className="file-row glass"
          style={{ animationDelay: `${idx * 0.05}s` }}
        >
          <div className="file-col-name">
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

          <div className="file-col-actions">
            <button
              className="btn-delete-row"
              onClick={() => handleDelete(file._id)}
              title="Xóa"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
