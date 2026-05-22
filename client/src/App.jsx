import { useState, useEffect, useCallback } from 'react'
import Dropzone from './components/Dropzone'
import FileList from './components/FileList'
import CheatSheet from './components/CheatSheet'
import AudioPlayer from './components/AudioPlayer'
import Login from './components/Login'
import { getFolders, classifyFiles, getFiles, updateFolder, deleteFolder, getMe } from './utils/api'
import './index.css'
import './App.css'

// Utility to fix double-encoded UTF-8 strings in folder names or other data
function decodeString(str) {
  if (!str) return '';
  try {
    const isDoubleEncoded = /[\u00c0-\u00df][\u0080-\u00bf]/.test(str) || /[\u00e0-\u00ef][\u0080-\u00bf]{2}/.test(str);
    if (isDoubleEncoded) {
      const bytes = new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch (e) {
    // ignore
  }
  return str;
}

function App() {
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [files, setFiles] = useState([])
  const [view, setView] = useState('files') // 'files' | 'cheatsheet' | 'podcast'
  const [isClassifying, setIsClassifying] = useState(false)
  const [classifyProgress, setClassifyProgress] = useState('')
  const [notification, setNotification] = useState(null)

  // Navigation states
  const [showDashboard, setShowDashboard] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'library' | 'cheatsheets' | 'podcasts' | 'settings'

  // Form states for settings
  const [profileName, setProfileName] = useState('Nguyễn An')
  const [profileEmail, setProfileEmail] = useState('an.nguyen@hcmut.edu.vn')
  const [profileSchool, setProfileSchool] = useState('ĐH Bách Khoa TP.HCM')
  
  // Library filters
  const [libraryFilter, setLibraryFilter] = useState('Tất cả')

  // Rename states
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [newFolderName, setNewFolderName] = useState('')

  // Load folders
  const loadFolders = useCallback(async () => {
    try {
      const res = await getFolders()
      setFolders(res.data)
    } catch (err) {
      console.error('Failed to load folders:', err)
    }
  }, [])

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  // Restore session from localStorage on mount (if user already logged in)
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const cachedUser = localStorage.getItem('user')
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser)
        if (u?.name) setProfileName(u.name)
        if (u?.email) setProfileEmail(u.email)
        if (u?.school) setProfileSchool(u.school)
      } catch (e) { /* ignore */ }
    }
    // Verify token + refresh user data
    getMe()
      .then(res => {
        if (res?.data) {
          if (res.data.name) setProfileName(res.data.name)
          if (res.data.email) setProfileEmail(res.data.email)
          if (res.data.school) setProfileSchool(res.data.school)
          localStorage.setItem('user', JSON.stringify(res.data))
        }
      })
      .catch(() => {
        // token expired or invalid — silently clear
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      })
  }, [])

  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thư mục "${decodeString(folderName)}" và toàn bộ tài liệu bên trong không? Hành động này không thể hoàn tác.`)) return
    try {
      await deleteFolder(folderId)
      showNotification('Đã xóa thư mục thành công', 'success')
      loadFolders()
    } catch (error) {
      console.error('Error deleting folder:', error)
      showNotification('Lỗi khi xóa thư mục', 'error')
    }
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  // Load files when folder is selected
  useEffect(() => {
    if (selectedFolder) {
      loadFiles(selectedFolder._id)
    }
  }, [selectedFolder])

  const loadFiles = async (folderId) => {
    try {
      const res = await getFiles(folderId)
      setFiles(res.data)
    } catch (err) {
      console.error('Failed to load files:', err)
    }
  }

  // Handle AI classify (drag & drop)
  const handleClassify = async (droppedFiles) => {
    setIsClassifying(true)
    setClassifyProgress('🤖 AI đang phân tích và phân loại tài liệu...')
    try {
      const res = await classifyFiles(droppedFiles)
      const results = res.data.results

      showNotification(
        `✅ Đã phân loại ${results.length} file thành công!`,
        'success'
      )

      // Refresh folders
      await loadFolders()

      // If we're in a folder, refresh files
      if (selectedFolder) {
        await loadFiles(selectedFolder._id)
      } else {
        // Auto-select the first result's folder or go to overview
        if (results.length > 0) {
          const folderObj = results[0].folder;
          setSelectedFolder(folderObj);
          setActiveTab('library');
        }
      }
    } catch (err) {
      showNotification('❌ Lỗi phân loại: ' + (err.response?.data?.error || err.message), 'error')
    } finally {
      setIsClassifying(false)
      setClassifyProgress('')
    }
  }

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleFolderSelect = (folder) => {
    setSelectedFolder(folder)
    setView('files')
  }

  const handleBackToLibrary = () => {
    setSelectedFolder(null)
    setFiles([])
    setView('files')
  }

  const handleRenameConfirm = async () => {
    if (!newFolderName.trim()) {
      showNotification('⚠️ Tên thư mục không được để trống', 'error');
      return;
    }
    try {
      await updateFolder(renamingFolder._id, { name: newFolderName.trim() });
      showNotification('✅ Đổi tên thư mục thành công!', 'success');
      await loadFolders();
      if (selectedFolder && selectedFolder._id === renamingFolder._id) {
        setSelectedFolder(prev => ({ ...prev, name: newFolderName.trim() }));
      }
      setRenamingFolder(null);
      setNewFolderName('');
    } catch (err) {
      showNotification('❌ Lỗi khi đổi tên: ' + (err.response?.data?.error || err.message), 'error');
    }
  }

  // Dynamic visual colors for folder grids
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#4b5563', '#a855f7'];

  // Navigate directly to folder detail view
  const openSubjectFolder = (folderObj, defaultView = 'files') => {
    setSelectedFolder(folderObj)
    setView(defaultView)
  }

  // Dynamic stats calculated from real database folders
  const totalFiles = folders.reduce((sum, f) => sum + (f.fileCount || 0), 0);
  const totalSubjects = folders.length;
  const totalPodcasts = folders.filter(f => f.podcast_audio_url || (f.podcast_script && f.podcast_script.length > 0)).length;

  return (
    <div className={`app-layout ${showDashboard ? 'dashboard-active' : ''}`}>
      {/* ── Notification Toast ── */}
      {notification && (
        <div className={`toast toast-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {showLogin ? (
        <Login
          onLoginSuccess={(user) => {
            setShowLogin(false)
            setShowDashboard(true)
            setActiveTab('overview')
            setProfileName(user.name)
            setProfileEmail(user.email)
            if (user.school) setProfileSchool(user.school)
            showNotification(`Chào mừng ${user.name}!`, 'success')
          }}
          onBack={() => setShowLogin(false)}
        />
      ) : !showDashboard ? (
        /* ═══════════════════════════════════════════════════════════════
           LANDING MODE: Modern Business Home Page with macOS Preview
           ═══════════════════════════════════════════════════════════════ */
        <>
          {/* Header Navigation */}
          <header className="landing-header">
            <div className="header-logo" onClick={() => setShowDashboard(false)}>
              <div className="header-logo-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                </svg>
              </div>
              <span>PeerNoted</span>
            </div>
            <nav className="header-nav">
              <a href="#" className="header-nav-link" onClick={(e) => e.preventDefault()}>Giải pháp</a>
              <a href="#" className="header-nav-link" onClick={(e) => e.preventDefault()}>Tài liệu kỹ thuật</a>
              <a href="#" className="header-nav-link" onClick={(e) => e.preventDefault()}>Bảo mật</a>
              <a href="#" className="header-nav-link" onClick={(e) => e.preventDefault()}>Bảng giá</a>
            </nav>
            <div className="header-actions">
              <button className="btn-login" onClick={() => setShowLogin(true)}>Đăng nhập</button>
              <button className="btn btn-primary btn-landing-workspace" onClick={() => { setShowDashboard(true); setActiveTab('overview'); }}>
                Mở workspace
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              Phiên bản Enterprise hiện đã khả dụng
            </div>
            <h1>Nâng tầm tri thức<br />bằng trí tuệ nhân tạo.</h1>
            <p>Hệ thống quản lý kiến thức cá nhân thông minh dành cho giới học thuật Việt Nam. Tự động phân loại tài liệu, tạo cheat sheet và chuyển đổi ghi chú thành podcast học tập.</p>
          </section>

          {/* macOS Preview Card (Image 2) */}
          <div className="workspace-window-wrapper">
            <div className="landing-mac-preview-card" onClick={() => { setShowDashboard(true); setActiveTab('overview'); }}>
              <div className="preview-card-tooltip">Nhấp để mở Workspace thực tế ✨</div>
              
              {/* Apple macOS style header bar */}
              <div className="mac-preview-header">
                <div className="mac-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <div className="mac-preview-filename">Luận văn tốt nghiệp_Draft_v2.pdf</div>
                <div className="mac-preview-actions">
                  <button className="btn-preview-podcast" onClick={(e) => e.stopPropagation()}>Tạo Podcast</button>
                  <button className="btn-preview-cheatsheet" onClick={(e) => e.stopPropagation()}>Xuất Cheat Sheet</button>
                </div>
              </div>

              {/* Two Column macOS Body Layout */}
              <div className="mac-preview-body">
                {/* Sidebar mock */}
                <div className="mac-preview-sidebar">
                  <div className="sidebar-group">
                    <div className="sidebar-item active">Tất cả tài liệu</div>
                    <div className="sidebar-item">Kinh tế vi mô</div>
                    <div className="sidebar-item">Triết học Mác-Lênin</div>
                    <div className="sidebar-item">Toán cao cấp A1</div>
                    <div className="sidebar-item">Lập trình hệ thống</div>
                  </div>

                  <div className="sidebar-progress-box">
                    <div className="sidebar-progress-header">
                      <span>AI CLASSIFICATION</span>
                    </div>
                    <div className="sidebar-progress-label">
                      <span>Đang xử lý PDF</span>
                      <span>82%</span>
                    </div>
                    <div className="sidebar-progress-bar">
                      <div className="sidebar-progress-fill" style={{ width: '82%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Document preview area */}
                <div className="mac-preview-main-pane">
                  <div className="document-sheet">
                    <div className="doc-chapter">CHƯƠNG 3 • PHÂN TÍCH KẾT QUẢ</div>
                    <h3 className="doc-heading">Mô hình học sâu trong xử lý ngôn ngữ tự nhiên</h3>
                    <p className="doc-text">
                      Trong nghiên cứu này, chúng tôi đề xuất một kiến trúc kết hợp giữa <span className="doc-highlight">Transformer</span> và <span className="doc-highlight">Retrieval-Augmented Generation</span> nhằm cải thiện độ chính xác phân loại tài liệu tiếng Việt. Kết quả thực nghiệm trên tập dữ liệu gồm 12.000 mẫu cho thấy mô hình đạt độ chính xác 94.7%, cao hơn 8.2 điểm phần trăm so với baseline.
                    </p>
                    <div className="doc-tag-row">
                      <span className="doc-tag-pill">#NLP</span>
                      <span className="doc-tag-pill">#Transformer</span>
                      <span className="doc-tag-pill">#Vietnamese</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Capabilities Section */}
          <section className="capabilities-section">
            <div className="cap-tag">Capabilities • 03</div>
            <h2 className="cap-heading">Ba lớp xử lý tri thức, vận hành tự động.</h2>
            
            <div className="cap-grid">
              <div className="cap-card">
                <div className="cap-icon-wrapper">
                  <div className="cap-icon-square"></div>
                </div>
                <h3>Phân loại thông minh</h3>
                <p>Sử dụng mô hình ngôn ngữ lớn để tự động gắn thẻ, trích xuất thực thể và tổ chức thư viện học tập của bạn theo cấu trúc logic nhất.</p>
                <span className="cap-engine-label">Classification Engine V4.2</span>
              </div>

              <div className="cap-card">
                <div className="cap-icon-wrapper">
                  <div className="cap-icon-circle"></div>
                </div>
                <h3>Study Podcast</h3>
                <p>Chuyển đổi các tập tài liệu phức tạp thành các đoạn hội thoại podcast dễ hiểu. Nghe và học mọi lúc mọi nơi với giọng đọc AI tự nhiên.</p>
                <span className="cap-engine-label">Audio Synthesis Active</span>
              </div>

              <div className="cap-card">
                <div className="cap-icon-wrapper">
                  <div className="cap-icon-diamond"></div>
                </div>
                <h3>Auto Cheat Sheets</h3>
                <p>Tự động tóm tắt kiến thức trọng tâm thành các bảng tra cứu nhanh, công thức và sơ đồ tư duy chỉ với một cú nhấp chuột.</p>
                <span className="cap-engine-label">Semantic Extraction 100%</span>
              </div>
            </div>

            <div className="stats-divider"></div>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">1.2M+</span>
                <span className="stat-label">Tài liệu đã xử lý</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">98.4%</span>
                <span className="stat-label">Độ chính xác phân loại</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">&lt;2s</span>
                <span className="stat-label">Phản hồi trung bình</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">ISO 27001</span>
                <span className="stat-label">Chuẩn bảo mật dữ liệu</span>
              </div>
            </div>
          </section>

          {/* Trust Partners Section */}
          <section className="trust-section">
            <div className="trust-wrapper">
              <div className="trust-title">Được tin dùng bởi sinh viên các trường đại học hàng đầu</div>
              <div className="trust-grid">
                <span className="trust-logo">ĐH Bách Khoa</span>
                <span className="trust-logo">ĐH Kinh Tế</span>
                <span className="trust-logo">ĐH Ngoại Thương</span>
                <span className="trust-logo">ĐH Quốc Gia</span>
                <span className="trust-logo">VinUni</span>
                <span className="trust-logo">RMIT</span>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="cta-section">
            <h2>Bắt đầu xây dựng<br />bộ não thứ hai của bạn.</h2>
            <p>Miễn phí cho cá nhân. Gói Enterprise dành cho phòng nghiên cứu, trường đại học và doanh nghiệp.</p>
            <div className="cta-actions">
              <button className="btn btn-primary" onClick={() => { setShowDashboard(true); setActiveTab('overview'); }}>
                Bắt đầu miễn phí
              </button>
              <button className="btn btn-secondary">Liên hệ kinh doanh</button>
            </div>
          </section>

          {/* Footer Section */}
          <footer className="footer-section">
            <div className="footer-wrapper">
              <div className="footer-main">
                <div className="footer-brand">
                  <div className="footer-logo" onClick={() => setShowDashboard(false)}>
                    <div className="footer-logo-icon">P</div>
                    <span>PeerNoted</span>
                  </div>
                  <p>Nền tảng tri thức thế hệ mới. Xây dựng cho tương lai của học thuật.</p>
                </div>
                
                <div className="footer-column">
                  <h4>Sản phẩm</h4>
                  <div className="footer-links">
                    <a href="#" className="footer-link">Tính năng</a>
                    <a href="#" className="footer-link">Tích hợp</a>
                    <a href="#" className="footer-link">Lộ trình</a>
                  </div>
                </div>

                <div className="footer-column">
                  <h4>Công ty</h4>
                  <div className="footer-links">
                    <a href="#" className="footer-link">Về chúng tôi</a>
                    <a href="#" className="footer-link">Tuyển dụng</a>
                    <a href="#" className="footer-link">Liên hệ</a>
                  </div>
                </div>

                <div className="footer-column">
                  <h4>Pháp lý</h4>
                  <div className="footer-links">
                    <a href="#" className="footer-link">Bảo mật dữ liệu</a>
                    <a href="#" className="footer-link">Điều khoản</a>
                    <a href="#" className="footer-link">Cookie Policy</a>
                  </div>
                </div>
              </div>

              <div className="footer-bottom">
                <span>© 2026 PEERNOTED INC. ALL RIGHTS RESERVED.</span>
                <div className="footer-status-group">
                  <div className="footer-status-item">
                    <span className="footer-status-dot"></span>
                    <span>STATUS: OPERATIONAL</span>
                  </div>
                  <span>REGIONAL: VIETNAM (SGN)</span>
                </div>
              </div>
            </div>
          </footer>
        </>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           WORKSPACE MODE: Full Screen Responsive Dashboard (Image 4 & 5)
           ═══════════════════════════════════════════════════════════════ */
        <div className="dashboard-container fade-in">
          
          {/* Left persistent sidebar */}
          <aside className="db-sidebar">
            {/* Top Brand Logo */}
            <div className="db-logo-wrapper" onClick={() => setShowDashboard(false)} title="Quay lại trang chủ">
              <div className="db-logo">
                <div className="db-logo-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                  </svg>
                </div>
                <span>PeerNoted</span>
              </div>
              <span className="db-version">v4.2</span>
            </div>

            {/* Sidebar navigation list */}
            <div className="db-nav-section">
              <div className="db-section-label">WORKSPACE</div>
              <nav className="db-nav-list">
                <button 
                  className={`db-nav-item ${activeTab === 'overview' && !selectedFolder ? 'active' : ''}`}
                  onClick={() => { setActiveTab('overview'); setSelectedFolder(null); }}
                >
                  <span className="db-nav-num">01</span>
                  <span className="db-nav-text">Tổng quan</span>
                </button>
                <button 
                  className={`db-nav-item ${(activeTab === 'library' || (selectedFolder && activeTab === 'library')) ? 'active' : ''}`}
                  onClick={() => { setActiveTab('library'); setSelectedFolder(null); }}
                >
                  <span className="db-nav-num">02</span>
                  <span className="db-nav-text">Thư viện tri thức</span>
                </button>
                <button 
                  className={`db-nav-item ${activeTab === 'cheatsheets' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('cheatsheets'); setSelectedFolder(null); }}
                >
                  <span className="db-nav-num">03</span>
                  <span className="db-nav-text">Phao cứu cấp</span>
                </button>
                <button 
                  className={`db-nav-item ${activeTab === 'podcasts' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('podcasts'); setSelectedFolder(null); }}
                >
                  <span className="db-nav-num">04</span>
                  <span className="db-nav-text">Podcast học tập</span>
                </button>
                <button 
                  className={`db-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('settings'); setSelectedFolder(null); }}
                >
                  <span className="db-nav-num">05</span>
                  <span className="db-nav-text">Cài đặt</span>
                </button>
              </nav>
            </div>

            {/* Bottom Profile and Storage indicator */}
            <div className="db-sidebar-footer">
              <div className="db-profile-card">
                <div className="db-profile-avatar">{getInitials(profileName)}</div>
                <div className="db-profile-info">
                  <div className="db-profile-name">{profileName}</div>
                  <div className="db-profile-school">{profileSchool || ''}</div>
                </div>
              </div>
              
              <div className="db-storage-card">
                <div className="db-storage-label">
                  <span>STORAGE</span>
                  <span>6.2 / 18 GB</span>
                </div>
                <div className="db-storage-bar">
                  <div className="db-storage-fill" style={{ width: '34%' }}></div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right main workspace pane */}
          <main className="db-main-pane">
            
            {/* Main Header bar */}
            <header className="db-pane-header">
              <div className="db-breadcrumb-group">
                <div className="db-breadcrumb">
                  {selectedFolder ? (
                    <>WORKSPACE  /  THƯ VIỆN  /  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{decodeString(selectedFolder.name).toUpperCase()}</span></>
                  ) : activeTab === 'overview' ? (
                    <>WORKSPACE  /  TỔNG QUAN</>
                  ) : activeTab === 'library' ? (
                    <>WORKSPACE  /  THƯ VIỆN</>
                  ) : activeTab === 'cheatsheets' ? (
                    <>WORKSPACE  /  CHEAT SHEETS</>
                  ) : activeTab === 'podcasts' ? (
                    <>WORKSPACE  /  PODCASTS</>
                  ) : (
                    <>WORKSPACE  /  CÀI ĐẶT</>
                  )}
                </div>
                <h1 className="db-pane-title">
                  {selectedFolder ? (
                    <span className="folder-title-with-edit">
                      {decodeString(selectedFolder.name)}
                      <button 
                        className="btn-rename-icon" 
                        title="Đổi tên thư mục"
                        onClick={() => {
                          setRenamingFolder(selectedFolder);
                          setNewFolderName(decodeString(selectedFolder.name));
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </span>
                  ) : (
                    activeTab === 'overview' ? 'Tổng quan' :
                    activeTab === 'library' ? 'Thư viện tri thức' :
                    activeTab === 'cheatsheets' ? 'Phao cứu cấp' :
                    activeTab === 'podcasts' ? 'Podcast học tập' : 'Cài đặt'
                  )}
                </h1>
              </div>

              {/* Central search, notifications and upload trigger */}
              <div className="db-header-actions">
                <div className="db-search-bar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="search-icon">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input type="text" placeholder="Tìm tài liệu, môn học..." />
                  <span className="search-shortcut">⌘K</span>
                </div>
                
                <button className="btn-bell" title="Thông báo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </button>

                <button 
                  className="btn btn-primary btn-tai-tai-lieu"
                  onClick={() => {
                    // Trigger folder detail upload or overview upload
                    if (selectedFolder) {
                      const el = document.querySelector('.dropzone input');
                      if (el) el.click();
                    } else {
                      setActiveTab('overview');
                      setTimeout(() => {
                        const el = document.querySelector('.dropzone input');
                        if (el) el.click();
                      }, 100);
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Tải tài liệu</span>
                </button>
              </div>
            </header>

            {/* Dashboard Inner Body Switcher */}
            <div className="db-pane-content">
              {selectedFolder ? (
                /* ─────────────────────────────────────────────────────────────
                   FOLDER DETAIL VIEW: Show files, dropzones, podcast synthesizer
                   ───────────────────────────────────────────────────────────── */
                <div className="folder-detail-wrapper fade-in">
                  
                  {/* Subject details subheader */}
                  <div className="folder-title-row">
                    <button className="btn-back-library" onClick={handleBackToLibrary}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                      <span>Quay lại Thư viện</span>
                    </button>

                    <div className="folder-detail-actions">
                      <button 
                        className={`btn-toggle-tool ${view === 'podcast' ? 'active' : ''}`}
                        onClick={() => setView(view === 'podcast' ? 'files' : 'podcast')}
                      >
                        🎙️ Tạo Podcast
                      </button>
                      <button 
                        className={`btn-toggle-tool ${view === 'cheatsheet' ? 'active' : ''}`}
                        onClick={() => setView(view === 'cheatsheet' ? 'files' : 'cheatsheet')}
                      >
                        📋 Xuất Cheat Sheet
                      </button>
                    </div>
                  </div>

                  {/* Real functional dropzone inside folder details */}
                  <Dropzone
                    onDrop={handleClassify}
                    isProcessing={isClassifying}
                    progress={classifyProgress}
                  />

                  <div className="folder-subview-area">
                    {view === 'files' && (
                      <FileList
                        files={files}
                        onRefresh={() => loadFiles(selectedFolder._id)}
                        onPlayPodcast={() => setView('podcast')}
                      />
                    )}
                    {view === 'cheatsheet' && (
                      <CheatSheet folderId={selectedFolder._id} folderName={decodeString(selectedFolder.name)} />
                    )}
                    {view === 'podcast' && (
                      <AudioPlayer folderId={selectedFolder._id} folderName={decodeString(selectedFolder.name)} />
                    )}
                  </div>
                </div>
              ) : (
                /* ─────────────────────────────────────────────────────────────
                   TAB VIEWS: Overview, Library, Cheatsheets, Podcasts, Settings
                   ───────────────────────────────────────────────────────────── */
                <>
                  {activeTab === 'overview' && (
                    /* ── TAB 1: TỔNG QUAN ── */
                    <div className="tab-overview-pane fade-in">
                      
                      {/* Premium AI Dashed Dropzone */}
                      <div className="dashboard-dropzone-wrapper">
                        <div className="db-dropzone-badge-left">✦ SMART ORGANIZER · ACTIVE</div>
                        <div className="db-dropzone-badge-right">ENGINE V4.2 - GEMINI FLASH</div>
                        
                        <Dropzone
                          onDrop={handleClassify}
                          isProcessing={isClassifying}
                          progress={classifyProgress}
                        />
                      </div>

                      {/* Stats Metric Grid */}
                      <div className="db-metrics-grid">
                        <div className="metric-card">
                          <div className="metric-label">TÀI LIỆU</div>
                          <div className="metric-number">{totalFiles}</div>
                          <div className="metric-footer success">{totalFiles > 0 ? "Đã đồng bộ" : "Chờ tải file"}</div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-label">MÔN HỌC</div>
                          <div className="metric-number">{totalSubjects}</div>
                          <div className="metric-footer text-muted">AI Tự phân loại</div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-label">ĐỘ CHÍNH XÁC AI</div>
                          <div className="metric-number">99.2%</div>
                          <div className="metric-footer text-muted">Lớp học thuật</div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-label">PODCAST ĐÃ TẠO</div>
                          <div className="metric-number">{totalPodcasts}</div>
                          <div className="metric-footer text-muted">Podcast học tập</div>
                        </div>
                      </div>

                      {/* Split Quick Access & Activity Log Panel */}
                      <div className="db-split-panels">
                        
                        {/* Quick Access Folders Panel */}
                        <div className="panel-quick-access">
                          <div className="panel-header-row">
                            <h2 className="panel-title">
                              <span className="panel-title-tag">THƯ VIỆN • {totalSubjects > 0 ? `${totalSubjects.toString().padStart(2, '0')} THƯ MỤC` : 'CHƯA KHỞI TẠO'}</span>
                              <span className="panel-title-text">Truy cập nhanh</span>
                            </h2>
                            <button className="btn-view-all" onClick={() => setActiveTab('library')}>Xem tất cả →</button>
                          </div>

                          <div className="quick-folder-grid">
                            {folders.length === 0 ? (
                              <div className="empty-state-bento fade-in">
                                <div className="empty-state-icon">📂</div>
                                <h3>Thư viện tài liệu trống</h3>
                                <p>Kéo thả tài liệu của bạn vào khu vực phía trên. AI sẽ tự động phân tích ngữ nghĩa, phân loại và tạo các thư mục môn học tương ứng.</p>
                                <button 
                                  className="btn btn-primary btn-tai-tai-lieu"
                                  onClick={() => {
                                    const el = document.querySelector('.dropzone input');
                                    if (el) el.click();
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                  </svg>
                                  <span>Tải lên file đầu tiên</span>
                                </button>
                              </div>
                            ) : (
                              folders.slice(0, 6).map((folder, index) => {
                                const color = colors[index % colors.length];
                                return (
                                  <div 
                                    key={folder._id}
                                    className="quick-folder-card"
                                    onClick={() => openSubjectFolder(folder)}
                                  >
                                    <button
                                      className="btn-delete-folder"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder._id, folder.name) }}
                                      title="Xóa thư mục"
                                      style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
                                      </svg>
                                    </button>
                                    <div className="q-card-header">
                                      <div className="q-folder-icon" style={{ background: color }}></div>
                                      <span className="q-file-count">{folder.fileCount || 0} files</span>
                                    </div>
                                    <div className="q-card-body">
                                      <div className="q-subject-code" style={{ color: color }}>{decodeString(folder.subject || 'MÔN HỌC').toUpperCase()}</div>
                                      <h3 className="q-subject-name">
                                        {decodeString(folder.name)}
                                      </h3>
                                    </div>
                                    <div className="q-card-footer">
                                      <span className="q-update-time">Cập nhật {new Date(folder.updatedAt).toLocaleDateString('vi-VN')}</span>
                                      <span className="q-arrow">→</span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Activity Logs & Uptime Status panel */}
                        <div className="panel-activity-logs">
                          <div className="panel-header-row">
                            <h2 className="panel-title">
                              <span className="panel-title-tag">ACTIVITY LOG</span>
                              <span className="panel-title-text">Sự kiện gần đây</span>
                            </h2>
                          </div>

                          <div className="activity-list">
                            {folders.length === 0 ? (
                              <div className="empty-logs">
                                <span className="empty-logs-text">Chưa có hoạt động nào. Hãy kéo thả tài liệu để bắt đầu phân loại.</span>
                              </div>
                            ) : (
                              folders.slice(0, 4).map((folder) => (
                                <div className="activity-item" key={folder._id}>
                                  <span className="act-time">
                                    {new Date(folder.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="act-text">
                                    Đã khởi tạo và đồng bộ thư mục "{decodeString(folder.name)}"
                                  </span>
                                  <span className="act-badge blue">AI</span>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Dark AI Status box */}
                          <div className="ai-status-card">
                            <div className="ai-status-header">
                              <span className="ai-status-dot"></span>
                              <span>AI STATUS</span>
                            </div>
                            <p className="ai-status-text">
                              Lớp ngữ nghĩa đang hoạt động. Hàng đợi xử lý: 0 task.
                            </p>
                            <div className="ai-status-grid">
                              <div className="ai-stat-box">
                                <div className="ai-stat-val">112MS</div>
                                <div className="ai-stat-lbl">LATENCY</div>
                              </div>
                              <div className="ai-stat-box">
                                <div className="ai-stat-val">12.4K</div>
                                <div className="ai-stat-lbl">TOKENS</div>
                              </div>
                              <div className="ai-stat-box">
                                <div className="ai-stat-val">99.98%</div>
                                <div className="ai-stat-lbl">UPTIME</div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {activeTab === 'library' && (
                    /* ── TAB 2: THƯ VIỆN TRI THỨC ── */
                    <div className="tab-library-pane fade-in">
                      
                      {/* Filter pill buttons row */}
                      <div className="library-filters-row">
                        <div className="filter-pill-group">
                          {['Tất cả', 'PDF', 'Hình ảnh', 'Văn bản', 'Đã podcast', 'Có cheat sheet'].map(filterName => (
                            <button 
                              key={filterName}
                              className={`filter-pill ${libraryFilter === filterName ? 'active' : ''}`}
                              onClick={() => setLibraryFilter(filterName)}
                            >
                              {filterName}
                            </button>
                          ))}
                        </div>

                        <div className="library-sort">
                          <span>SẮP XẾP</span>
                          <button className="btn-sort-dropdown">
                            <span>Mới nhất</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Wide clean table list */}
                      <div className="library-table-wrapper">
                        <table className="library-table">
                          <thead>
                            <tr>
                              <th>MÔN HỌC</th>
                              <th style={{ textAlign: 'center' }}>THƯ MỤC</th>
                              <th style={{ textAlign: 'center' }}>TÀI LIỆU</th>
                              <th>AI COVERAGE</th>
                              <th>CẬP NHẬT</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const filteredFolders = folders.filter(folder => {
                                if (libraryFilter === 'PDF') {
                                  return folder.pdfCount > 0;
                                }
                                if (libraryFilter === 'Hình ảnh') {
                                  return folder.imageCount > 0;
                                }
                                if (libraryFilter === 'Văn bản') {
                                  return folder.docCount > 0;
                                }
                                if (libraryFilter === 'Đã podcast') {
                                  return !!folder.podcast_audio_url;
                                }
                                if (libraryFilter === 'Có cheat sheet') {
                                  return !!folder.cheat_sheet_markdown;
                                }
                                return true;
                              });

                              if (filteredFolders.length === 0) {
                                return (
                                  <tr className="empty-table-row">
                                    <td colSpan="6">
                                      <div className="empty-table-content">
                                        <span className="empty-table-icon">📚</span>
                                        <h4>Thư viện trống</h4>
                                        <p>Tải lên và AI phân loại tài liệu để khởi tạo thư mục tri thức.</p>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return filteredFolders.map((folder, index) => {
                                const color = colors[index % colors.length];
                                const coveragePercent = folder.cheat_sheet_markdown ? 100 : (folder.fileCount > 0 ? 50 : 0);
                                return (
                                  <tr key={folder._id}>
                                    <td>
                                      <div className="lib-subject-col">
                                        <div className="lib-subject-icon" style={{ background: color }}></div>
                                        <div className="lib-subject-info">
                                          <div className="lib-subject-name-wrapper">
                                            <div className="lib-subject-name">{decodeString(folder.name)}</div>
                                            <button 
                                              className="btn-rename-icon inline" 
                                              title="Đổi tên thư mục"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setRenamingFolder(folder);
                                                setNewFolderName(decodeString(folder.name));
                                              }}
                                            >
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                              </svg>
                                            </button>
                                          </div>
                                          <div className="lib-subject-code">Bộ môn: {decodeString(folder.subject || 'Đang phân loại')}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>1</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <div className="file-breakdown-container">
                                        {folder.fileCount > 0 ? (
                                          <>
                                            {folder.pdfCount > 0 && (
                                              <span className="file-badge pdf" title={`${folder.pdfCount} tài liệu PDF`}>
                                                📕 {folder.pdfCount}
                                              </span>
                                            )}
                                            {folder.docCount > 0 && (
                                              <span className="file-badge doc" title={`${folder.docCount} văn bản`}>
                                                📘 {folder.docCount}
                                              </span>
                                            )}
                                            {folder.imageCount > 0 && (
                                              <span className="file-badge img" title={`${folder.imageCount} hình ảnh`}>
                                                🖼️ {folder.imageCount}
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          <span className="file-badge empty" title="Thư mục trống">0</span>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="lib-coverage-wrapper">
                                        <div className="lib-coverage-bar">
                                          <div className="lib-coverage-fill" style={{ width: `${coveragePercent}%` }}></div>
                                        </div>
                                        <span className="lib-coverage-percent">{coveragePercent}%</span>
                                      </div>
                                    </td>
                                    <td className="lib-date-col">{new Date(folder.updatedAt).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                          className="btn-open-folder-link"
                                          onClick={() => openSubjectFolder(folder)}
                                        >
                                          Mở →
                                        </button>
                                        <button
                                          className="btn-delete-icon"
                                          title="Xóa thư mục"
                                          onClick={() => handleDeleteFolder(folder._id, folder.name)}
                                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'cheatsheets' && (
                    /* ── TAB 3: PHAO CỨU CẤP ── */
                    <div className="tab-cheatsheets-pane fade-in">
                      <div className="cheatsheets-grid">
                        {folders.length === 0 ? (
                          <div className="empty-cheatsheets-state fade-in">
                            <div className="empty-state-icon">📋</div>
                            <h3>Không tìm thấy Cheat Sheet nào</h3>
                            <p>Các tài liệu tóm tắt công thức, định nghĩa môn học sẽ xuất hiện tự động khi bạn bắt đầu phân loại tài liệu học tập.</p>
                          </div>
                        ) : (
                          folders.map((folder, index) => {
                            const hasJson = !!folder.cheat_sheet_json;
                            const hasMarkdown = !!folder.cheat_sheet_markdown;
                            const hasCheatSheet = hasJson || hasMarkdown;
                            const color = colors[index % colors.length];

                            // Derive formula/term counts from whichever format is present
                            let formulaCount = 0;
                            let termCount = 0;
                            if (hasJson) {
                              const sections = folder.cheat_sheet_json.sections || [];
                              for (const sec of sections) {
                                for (const b of (sec.blocks || [])) {
                                  if (b.type === 'formula') formulaCount++;
                                  else if (b.type === 'definition') termCount++;
                                }
                              }
                            } else if (hasMarkdown) {
                              const lines = folder.cheat_sheet_markdown.split('\n');
                              formulaCount = lines.filter(l => l.includes('=') || l.includes('+') || l.includes('-')).length || 6;
                              termCount = lines.filter(l => l.includes(':') || l.includes('*') || l.includes(' - ')).length || 10;
                            }

                            return (
                              <div className="cs-card" key={folder._id}>
                                <div className="cs-card-header">
                                  <span className="cs-tag" style={{ color: color }}>{decodeString(folder.subject || 'MÔN HỌC').toUpperCase()}</span>
                                  <span className={`cs-status ${hasCheatSheet ? 'ready' : 'uncreated'}`}>
                                    {hasCheatSheet ? 'SẴN SÀNG' : 'CHƯA TẠO'}
                                  </span>
                                </div>
                                <h3 className="cs-title">{decodeString(folder.name)}</h3>
                                <div className="cs-stats-grid">
                                  <div className="cs-stat-box">
                                    <span className="cs-stat-num">{hasCheatSheet ? formulaCount : 0}</span>
                                    <span className="cs-stat-lbl">CÔNG THỨC</span>
                                  </div>
                                  <div className="cs-stat-box">
                                    <span className="cs-stat-num">{hasCheatSheet ? termCount : 0}</span>
                                    <span className="cs-stat-lbl">THUẬT NGỮ</span>
                                  </div>
                                </div>
                                <button 
                                  className={`btn-cs-action ${!hasCheatSheet ? 'btn-create-ai' : ''}`}
                                  onClick={() => openSubjectFolder(folder)}
                                >
                                  {hasCheatSheet ? 'Mở cheat sheet →' : 'Tạo bằng AI'}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'podcasts' && (
                    /* ── TAB 4: PODCAST HỌC TẬP ── */
                    <div className="tab-podcasts-pane fade-in">
                      
                      {/* Premium TTS Banner */}
                      <div className="podcast-db-banner">
                        <div className="p-banner-left">
                          <div className="p-banner-badge">
                            <span className="p-banner-dot"></span>
                            <span>TTS ENGINE · ACTIVE</span>
                          </div>
                          <h2 className="p-banner-title">Biến tài liệu khô khan thành podcast sinh động</h2>
                          <p className="p-banner-desc">
                            Chọn một thư mục bất kỳ, AI sẽ tạo kịch bản hội thoại giữa hai MC ảo bằng tiếng Việt tự nhiên.
                          </p>
                        </div>
                        <button className="btn-p-banner-choose" onClick={() => setActiveTab('library')}>
                          Chọn thư mục →
                        </button>
                      </div>

                      {/* Podcast lists rows */}
                      <div className="podcast-rows-list">
                        {folders.length === 0 ? (
                          <div className="empty-podcasts-state fade-in">
                            <div className="empty-state-icon">🎙️</div>
                            <h3>Hàng đợi Podcast đang trống</h3>
                            <p>AI sẽ chuyển đổi tài liệu các thư mục của bạn thành podcast âm thanh ngay khi tài liệu học tập được tải lên.</p>
                          </div>
                        ) : (
                          folders.map((folder, index) => {
                            const hasPodcast = !!folder.podcast_audio_url;
                            const color = colors[index % colors.length];
                            return (
                              <div
                                className="podcast-row-item"
                                key={folder._id}
                                onClick={() => openSubjectFolder(folder, 'podcast')}
                              >
                                <div className="p-row-left">
                                  <div 
                                    className={`btn-play-podcast-row ${hasPodcast ? '' : 'empty'}`}
                                    style={{ background: hasPodcast ? color : 'rgba(0,0,0,0.03)' }}
                                  >
                                    <svg width="10" height="12" viewBox="0 0 24 24" fill="currentColor">
                                      {hasPodcast ? (
                                        <path d="M8 5v14l11-7z" />
                                      ) : (
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                                      )}
                                    </svg>
                                  </div>
                                  <div className="p-row-content">
                                    <span className="p-row-subject" style={{ color: color }}>{decodeString(folder.subject || 'MÔN HỌC').toUpperCase()}</span>
                                    <h3 className="p-row-title">{decodeString(folder.name)} — {hasPodcast ? 'Podcast Sẵn Sàng' : 'Chưa có Podcast'}</h3>
                                    <p className="p-row-meta">
                                      {hasPodcast ? 'Đã tạo bởi kịch bản MC Minh Anh & Tuấn' : 'Nhấp vào để mở thư mục và bắt đầu tổng hợp Podcast bằng AI'}
                                    </p>
                                  </div>
                                </div>
                                <div className="p-row-duration">
                                  <div className="p-dur-val" style={{ color: hasPodcast ? '#10b981' : 'var(--text-muted)' }}>
                                    {hasPodcast ? 'SẴN SÀNG' : 'CHƯA TẠO'}
                                  </div>
                                  <div className="p-dur-lbl">TRẠNG THÁI</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    /* ── TAB 5: CÀI ĐẶT ── */
                    <div className="tab-settings-pane fade-in">
                      
                      {/* Section 1: Personal Profile details */}
                      <div className="settings-section-card">
                        <div className="s-card-header">
                          <h2 className="s-section-title">Hồ sơ cá nhân</h2>
                          <p className="s-section-desc">Thông tin hiển thị trong workspace</p>
                        </div>
                        
                        <div className="s-avatar-row">
                          <div className="s-avatar-circle">{getInitials(profileName)}</div>
                          <button className="btn btn-secondary btn-sm" onClick={() => showNotification('Feature coming soon!', 'info')}>
                            Thay đổi ảnh
                          </button>
                        </div>

                        <div className="s-form-grid">
                          <div className="form-group">
                            <label>HỌ TÊN</label>
                            <input 
                              type="text" 
                              value={profileName} 
                              onChange={(e) => setProfileName(e.target.value)} 
                              placeholder="Họ và tên..."
                            />
                          </div>
                          <div className="form-group">
                            <label>EMAIL</label>
                            <input 
                              type="email" 
                              value={profileEmail} 
                              onChange={(e) => setProfileEmail(e.target.value)} 
                              placeholder="Địa chỉ Email..."
                            />
                          </div>
                          <div className="form-group">
                            <label>ĐẠI HỌC / TRƯỜNG</label>
                            <input
                              type="text"
                              list="school-options"
                              value={profileSchool}
                              onChange={(e) => setProfileSchool(e.target.value)}
                              placeholder="Chọn hoặc nhập trường..."
                            />
                            <datalist id="school-options">
                              <option value="ĐH Bách Khoa TP.HCM" />
                              <option value="ĐH Khoa học Tự nhiên TP.HCM" />
                              <option value="ĐH Công nghệ Thông tin TP.HCM" />
                              <option value="ĐH Khoa học Xã hội và Nhân văn TP.HCM" />
                              <option value="ĐH Kinh tế TP.HCM (UEH)" />
                              <option value="ĐH RMIT" />
                              <option value="ĐH Ngoại thương" />
                              <option value="ĐH FPT" />
                            </datalist>
                          </div>
                        </div>

                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}
                            onClick={() => {
                              localStorage.removeItem('token')
                              localStorage.removeItem('user')
                              setShowDashboard(false)
                              setActiveTab('overview')
                              showNotification('Đã đăng xuất thành công', 'success')
                            }}
                          >
                            Đăng xuất
                          </button>
                        </div>
                      </div>

                      {/* Section 2: AI Config Settings */}
                      <div className="settings-section-card">
                        <div className="s-card-header">
                          <h2 className="s-section-title">Cấu hình AI</h2>
                          <p className="s-section-desc">Tinh chỉnh lớp ngữ nghĩa và TTS</p>
                        </div>

                        <div className="s-config-list">
                          {/* Config Item 1 */}
                          <div className="config-item-row">
                            <div className="config-item-info">
                              <h4 className="config-item-title">Mô hình ngôn ngữ</h4>
                              <p className="config-item-desc">Cân bằng tốc độ và chất lượng</p>
                            </div>
                            <div className="config-dropdown-btn">
                              <span>Gemini 3 Flash (preview)</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>

                          {/* Config Item 2 */}
                          <div className="config-item-row">
                            <div className="config-item-info">
                              <h4 className="config-item-title">Ngôn ngữ đầu ra</h4>
                              <p className="config-item-desc">Tự động phát hiện ngôn ngữ tài liệu nguồn</p>
                            </div>
                            <div className="config-dropdown-btn">
                              <span>Tiếng Việt</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>

                          {/* Config Item 3 */}
                          <div className="config-item-row">
                            <div className="config-item-info">
                              <h4 className="config-item-title">Giọng đọc Podcast</h4>
                              <p className="config-item-desc">Áp dụng cho mọi podcast mới</p>
                            </div>
                            <div className="config-dropdown-btn">
                              <span>Nam Bắc + Nữ Bắc</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </>
              )}
            </div>
          </main>

        </div>
      )}
      {renamingFolder && (
        <div className="modal-backdrop" onClick={() => setRenamingFolder(null)}>
          <div className="rename-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="rename-modal-header">
              <h3>Đổi tên thư mục</h3>
              <button className="btn-close-modal" onClick={() => setRenamingFolder(null)}>✕</button>
            </div>
            <div className="rename-modal-body">
              <label>TÊN THƯ MỤC MỚI</label>
              <input 
                type="text" 
                value={newFolderName} 
                onChange={(e) => setNewFolderName(e.target.value)} 
                placeholder="Nhập tên mới..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameConfirm();
                }}
              />
            </div>
            <div className="rename-modal-footer">
              <button className="btn btn-secondary" onClick={() => setRenamingFolder(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleRenameConfirm}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
