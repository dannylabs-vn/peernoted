import { useState } from 'react'
import { createFolder, deleteFolder } from '../utils/api'
import './Sidebar.css'

export default function Sidebar({ folders, selectedFolder, onSelectFolder, onRefresh, isClassifying }) {
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await createFolder({ name: newName.trim() })
      setNewName('')
      setIsCreating(false)
      onRefresh()
    } catch (err) {
      console.error('Create folder error:', err)
    }
  }

  const handleDelete = async (e, folderId) => {
    e.stopPropagation()
    if (!confirm('Xóa thư mục này và tất cả file bên trong?')) return
    try {
      await deleteFolder(folderId)
      onRefresh()
      // Deselect folder if deleted
      if (selectedFolder?._id === folderId) {
        onSelectFolder(null)
      }
    } catch (err) {
      console.error('Delete folder error:', err)
    }
  }

  // Fallback mock folders matching the screenshot
  const mockFolders = [
    { _id: 'mock-1', name: 'Tất cả tài liệu', isMock: true },
    { _id: 'mock-2', name: 'Kinh tế vi mô', isMock: true },
    { _id: 'mock-3', name: 'Triết học Mác-Lênin', isMock: true },
    { _id: 'mock-4', name: 'Toán cao cấp A1', isMock: true },
    { _id: 'mock-5', name: 'Lập trình hệ thống', isMock: true }
  ]

  const hasRealFolders = folders && folders.length > 0
  const activeFolders = hasRealFolders ? folders : mockFolders

  return (
    <aside className="sidebar">
      {/* macOS circles in top-left */}
      <div className="mac-dots">
        <span className="dot red"></span>
        <span className="dot yellow"></span>
        <span className="dot green"></span>
      </div>

      <div className="sidebar-section">
        <div className="section-header">
          <span className="section-title">Thư mục</span>
          <button
            className="btn-add"
            onClick={() => setIsCreating(!isCreating)}
            title="Tạo thư mục"
          >
            {isCreating ? '✕' : '+'}
          </button>
        </div>

        {isCreating && (
          <form className="create-form fade-in" onSubmit={handleCreate}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tên thư mục..."
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '6px 12px', marginTop: '8px' }}>Tạo</button>
          </form>
        )}

        <nav className="folder-list">
          {activeFolders.map((folder, idx) => {
            const isSelected = selectedFolder
              ? selectedFolder._id === folder._id
              : folder._id === 'mock-1' || (idx === 0 && !hasRealFolders)

            return (
              <div
                key={folder._id}
                className={`folder-item ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectFolder(folder)}
              >
                <span className="folder-name">{folder.name}</span>
                {!folder.isMock && (
                  <button
                    className="btn-delete"
                    onClick={(e) => handleDelete(e, folder._id)}
                    title="Xóa"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* AI Classification section matching Image 2 */}
      <div className="sidebar-classification">
        <div className="class-header">
          <span className="class-title">AI Classification</span>
        </div>
        <div className="class-progress-info">
          <span className="class-status">{isClassifying ? 'Đang xử lý tài liệu...' : 'Đang xử lý PDF'}</span>
          <span className="class-percent">{isClassifying ? '90%' : '82%'}</span>
        </div>
        <div className="class-progress-bar">
          <div 
            className="class-progress-fill" 
            style={{ width: isClassifying ? '90%' : '82%' }}
          ></div>
        </div>
      </div>
    </aside>
  )
}
