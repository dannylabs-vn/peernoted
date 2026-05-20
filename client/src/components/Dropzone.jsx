import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import './Dropzone.css'

export default function Dropzone({ onDrop, isProcessing, progress }) {
  const onDropAccepted = useCallback((acceptedFiles) => {
    onDrop(acceptedFiles)
  }, [onDrop])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropAccepted,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    disabled: isProcessing,
    multiple: true
  })

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'drag-active' : ''} ${isProcessing ? 'processing' : ''}`}
    >
      <input {...getInputProps()} />

      {isProcessing ? (
        <div className="dropzone-processing">
          <div className="processing-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-brain">🧠</div>
          </div>
          <p className="processing-text">{progress}</p>
          <div className="processing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      ) : isDragActive ? (
        <div className="dropzone-active">
          <div className="drop-icon">📥</div>
          <p>Thả file vào đây!</p>
        </div>
      ) : (
        <div className="dropzone-idle">
          <div className="drop-icon-group">
            <span className="drop-icon-item">📄</span>
            <span className="drop-icon-item">📸</span>
            <span className="drop-icon-item">📑</span>
          </div>
          <p className="drop-title">Kéo & Thả tài liệu vào đây</p>
          <p className="drop-subtitle">PDF, Word, TXT, Ảnh — AI sẽ tự phân loại</p>
        </div>
      )}
    </div>
  )
}
