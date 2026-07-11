"use client"

import { useState, useEffect } from 'react'
import { Search, Upload, MessageSquare, Heart, Download, X, Star, FileText, XCircle } from 'lucide-react'
import { getPeerPoints, getForumPosts, createForumPost, downloadForumPost, likeForumPost } from '@/lib/api'
import { resolveFileUrl } from '@/lib/fileUrl'

const BASE_UNIVERSITIES = [
  // ĐHQG TP.HCM
  "Đại học Bách Khoa TP.HCM (HCMUT)",
  "Đại học Khoa học Tự nhiên TP.HCM (HCMUS)",
  "Đại học Khoa học Xã hội và Nhân văn TP.HCM (USSH)",
  "Đại học Quốc tế TP.HCM (HCMIU)",
  "Đại học Công nghệ Thông tin TP.HCM (UIT)",
  "Đại học Kinh tế - Luật TP.HCM (UEL)",
  "Khoa Y - ĐHQG TP.HCM",
  // ĐHQG Hà Nội
  "Đại học Công nghệ - ĐHQGHN (UET)",
  "Đại học Khoa học Tự nhiên - ĐHQGHN (HUS)",
  "Đại học Khoa học Xã hội & Nhân văn - ĐHQGHN (VNU-USSH)",
  "Đại học Ngoại ngữ - ĐHQGHN (ULIS)",
  "Đại học Kinh tế - ĐHQGHN (UEB)",
  "Đại học Y Dược - ĐHQGHN (UMP)",
  "Đại học Luật - ĐHQGHN (VNU-UL)",
  // Các đại học lớn khác
  "Đại học Kinh tế TP.HCM (UEH)",
  "Đại học Ngoại thương (FTU)",
  "Đại học Kinh tế Quốc dân (NEU)",
  "Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE)",
  "Đại học Tôn Đức Thắng (TDTU)",
  "Đại học Công nghiệp TP.HCM (IUH)",
  "Đại học FPT",
  "Đại học RMIT Việt Nam",
  "Đại học Y Dược TP.HCM (UMP HCM)",
  "Đại học Y Hà Nội (HMU)"
]

const THUMBNAILS = [
  "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=400&h=200", // Notebook
  "https://images.unsplash.com/photo-1584697964400-2af6a2f6204c?auto=format&fit=crop&q=80&w=400&h=200", // Chart/Stats
  "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&q=80&w=400&h=200"  // Math/Physics
]

const INITIAL_POSTS = [
  {
    id: 1,
    title: "Đề thi giữa kỳ Giải tích 1 - K23 (Có đáp án chi tiết)",
    subject: "Giải tích 1",
    school: "Đại học Bách Khoa TP.HCM (HCMUT)",
    schoolCode: "BK",
    category: "dethi",
    desc: "Đề thi chính thức môn Giải tích 1 kì học 20231 dành cho sinh viên nhóm ngành kỹ thuật đại trà của ĐH Bách Khoa TP.HCM. File bao gồm 4 câu tự luận kèm lời giải chi tiết và thang điểm chuẩn của bộ môn Toán ứng dụng.",
    uploader: { name: "Trần Minh Quân", avatar: "MQ", school: "ĐH Bách Khoa" },
    fileSize: "1.8 MB",
    fileType: "PDF",
    thumbnail: THUMBNAILS[2],
    downloads: 142,
    likes: 38,
    hasLiked: false,
    comments: [
      { id: 1, author: "Lê Hoài Nam", avatar: "LN", text: "Đề này giải chi tiết quá, câu 3 dùng tích phân từng phần rất dễ hiểu. Cảm ơn bạn!", time: "2 ngày trước" },
      { id: 2, author: "Nguyễn Thảo Vân", avatar: "TV", text: "K23 đề này vừa sức nè, mong thi cuối kỳ cũng tương tự.", time: "1 ngày trước" }
    ],
    date: "2026-05-12"
  },
  {
    id: 2,
    title: "Slide bài giảng Kinh tế vi mô - Chương 3 & 4 (Hành vi người tiêu dùng & Doanh nghiệp)",
    subject: "Kinh tế vi mô",
    school: "Đại học Kinh tế TP.HCM (UEH)",
    schoolCode: "KT",
    category: "slide",
    desc: "Bộ slide thuyết trình bài giảng tóm tắt chương 3 và 4 môn Kinh tế vi mô. Nội dung trực quan, có nhiều biểu đồ minh họa về đường giới hạn ngân sách, đường đẳng lượng và điểm tối ưu hóa sản xuất.",
    uploader: { name: "Nguyễn Hoài Thương", avatar: "HT", school: "ĐH Kinh Tế" },
    fileSize: "4.2 MB",
    fileType: "PPTX",
    thumbnail: THUMBNAILS[1],
    downloads: 289,
    likes: 95,
    hasLiked: false,
    comments: [
      { id: 1, author: "Phạm Quốc Bảo", avatar: "QB", text: "Slide trực quan cực kỳ luôn á, mình đọc qua là hiểu ngay bài tập chương 4.", time: "4 ngày trước" }
    ],
    date: "2026-04-30"
  },
  {
    id: 3,
    title: "Tóm tắt công thức Xác suất Thống kê siêu tốc (Bản cheat sheet 2 trang)",
    subject: "Xác suất Thống kê",
    school: "Đại học Ngoại thương (FTU)",
    schoolCode: "NT",
    category: "tomtat",
    desc: "Tài liệu hệ thống hóa toàn bộ công thức cốt lõi của môn Xác suất Thống kê: các công thức xác suất cơ bản (Bayes, Bernoulli), các phân phối xác suất thông dụng (nhị thức, chuẩn, poisson) và các bài toán ước lượng, kiểm định giả thuyết.",
    uploader: { name: "Lê Thị Hồng Hạnh", avatar: "HH", school: "ĐH Ngoại Thương" },
    fileSize: "850 KB",
    fileType: "PDF",
    thumbnail: THUMBNAILS[0],
    downloads: 412,
    likes: 156,
    hasLiked: false,
    comments: [
      { id: 1, author: "Nguyễn Hoàng Long", avatar: "HL", text: "Cứu cánh cho kỳ thi ngày mai đây rồi! Đầy đủ công thức dễ tra cứu.", time: "1 tuần trước" }
    ],
    date: "2026-06-01"
  }
]

export default function ForumPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // User profile & gamification states
  const [reputation, setReputation] = useState(120)
  const [contributions, setContributions] = useState(3)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Tất cả")
  const [selectedSchool, setSelectedSchool] = useState("Tất cả")
  const [selectedSort, setSelectedSort] = useState("popular")

  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [newCommentText, setNewCommentText] = useState("")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [notification, setNotification] = useState<any>(null)

  const [currentUser, setCurrentUser] = useState({ name: "Người dùng", avatar: "ND", school: "Sinh viên" })

  useEffect(() => {
    try {
      const u = localStorage.getItem('user')
      if (u) {
        const parsed = JSON.parse(u)
        const name = parsed.name || parsed.user?.name || "Người dùng"
        const avatar = name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
        setCurrentUser({ name, avatar, school: parsed.school || parsed.user?.school || "Sinh viên" })
        
        // Fetch real reputation data
        const userId = parsed.id || parsed._id || parsed.user?.id;
        if (userId) {
          getPeerPoints(userId).then(data => {
            if (data && typeof data.total_points === 'number') {
              setReputation(data.total_points);
              // Set contributions based on points (dummy correlation)
              setContributions(Math.floor(data.total_points / 50));
            }
          }).catch(err => console.error("Error fetching peer points:", err));
        }
      }
    } catch (e) {}
  }, [])

  // Tải danh sách tài liệu thật từ backend khi mở trang
  useEffect(() => {
    let mounted = true
    getForumPosts()
      .then((data) => {
        if (!mounted) return
        setPosts(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.error('Error fetching forum posts:', err)
        // Chỉ dùng dữ liệu mẫu khi API lỗi để trang không bị trống/hỏng
        if (mounted) setPosts(INITIAL_POSTS)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  const [uploadForm, setUploadForm] = useState({
    title: "", subject: "", school: "", category: "dethi", desc: "", file: null as File | null
  })

  // ===== Bộ đọc dữ liệu (đọc field API thật, fallback field mẫu để không vỡ giao diện) =====
  const pid = (p: any) => p?._id || p?.id
  const getAuthorName = (p: any) => p.author || p.uploader?.name || 'Ẩn danh'
  const getAuthorSchool = (p: any) => p.author_school || p.uploader?.school || (p.school ? String(p.school).split(' (')[0] : '')
  const getInitials = (name: string) => (name || '').split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'ND'
  const getAvatarText = (p: any) => p.uploader?.avatar || getInitials(getAuthorName(p))
  const getAuthorAvatar = (p: any) => p.author_avatar || ''
  const getFileUrl = (p: any) => p.file_url || p.fileUrl || ''
  const getFileType = (p: any) => String(p.file_type || p.fileType || 'FILE').toUpperCase()
  const getFileSizeLabel = (p: any) => {
    const b = p.file_size
    if (typeof b === 'number' && b > 0) {
      if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`
      if (b >= 1024) return `${Math.round(b / 1024)} KB`
      return `${b} B`
    }
    return p.fileSize || '—'
  }
  const getPostDateRaw = (p: any) => p.created_at || p.createdAt || p.date || ''
  const getPostDateLabel = (p: any) => {
    const d = getPostDateRaw(p)
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('vi-VN') } catch { return String(d) }
  }
  const getDesc = (p: any) => p.description || p.desc || 'Không có mô tả.'
  const getSubject = (p: any) => p.subject || ''

  const showToast = (message: string, type: string = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleLikePost = async (post: any, e?: any) => {
    e && e.stopPropagation()
    const id = pid(post)
    if (!id || post.hasLiked) return
    try {
      const res = await likeForumPost(id)
      const newLikes = res?.likes ?? (post.likes || 0) + 1
      setPosts(prev => prev.map(p => pid(p) === id ? { ...p, likes: newLikes, hasLiked: true } : p))
      setSelectedPost((sp: any) => (sp && pid(sp) === id) ? { ...sp, likes: newLikes, hasLiked: true } : sp)
    } catch (err) {
      console.error('Like forum post failed:', err)
      showToast('Không thể thích tài liệu lúc này. Vui lòng đăng nhập và thử lại.', 'error')
    }
  }

  const handleDownload = async (post: any, e?: any) => {
    e && e.stopPropagation()
    const id = pid(post)
    if (!getFileUrl(post) || !id) {
      showToast('Tài liệu này chưa có tệp để tải xuống.', 'error')
      return
    }
    try {
      const res = await downloadForumPost(id)
      const url = resolveFileUrl(res?.file_url)
      if (!url) {
        showToast('Không tìm thấy tệp đính kèm.', 'error')
        return
      }
      const a = document.createElement('a')
      a.href = url
      a.download = res?.file_name || ''
      a.target = '_blank'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      const newDownloads = res?.downloads ?? (post.downloads || 0) + 1
      setPosts(prev => prev.map(p => pid(p) === id ? { ...p, downloads: newDownloads } : p))
      setSelectedPost((sp: any) => (sp && pid(sp) === id) ? { ...sp, downloads: newDownloads } : sp)
      showToast(`Đang tải xuống: ${post.title}`, 'success')
    } catch (err) {
      console.error('Download forum post failed:', err)
      showToast('Tải xuống thất bại. Vui lòng thử lại.', 'error')
    }
  }

  const handleAddComment = (e: any) => {
    e.preventDefault()
    if (!newCommentText.trim() || !selectedPost) return
    const newComment = { id: Date.now(), author: currentUser.name, avatar: currentUser.avatar, text: newCommentText.trim(), time: "Vừa xong" }
    
    setPosts(prev => prev.map(post => {
      if (pid(post) === pid(selectedPost)) {
        const newPost = { ...post, comments: [...(post.comments || []), newComment] }
        setSelectedPost(newPost)
        return newPost
      }
      return post
    }))
    setNewCommentText("")
    showToast("Đã gửi bình luận thành công", "success")
  }

  const handleUploadSubmit = async (e: any) => {
    e.preventDefault()
    if (!uploadForm.title || !uploadForm.file) {
      alert("Vui lòng nhập tiêu đề và chọn tệp tài liệu.")
      return
    }
    if (uploading) return

    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('title', uploadForm.title)
      fd.append('description', uploadForm.desc || '')
      fd.append('category', uploadForm.category)
      fd.append('school', uploadForm.school || '')
      // subject không được backend lưu nhưng gửi kèm cũng vô hại
      if (uploadForm.subject) fd.append('subject', uploadForm.subject)
      fd.append('file', uploadForm.file)

      const created = await createForumPost(fd)
      // Giữ lại môn học vừa nhập cho phiên hiển thị hiện tại
      const enriched = uploadForm.subject ? { ...created, subject: uploadForm.subject } : created
      setPosts(prev => [enriched, ...prev])
      setContributions(prev => prev + 1)
      setReputation(prev => prev + 10)
      setUploadForm({ title: "", subject: "", school: "", category: "dethi", desc: "", file: null })
      setShowUploadModal(false)
      showToast("Đóng góp thành công! Tài liệu đã được lưu.", "success")
    } catch (err: any) {
      console.error('Create forum post failed:', err)
      showToast(err?.response?.data?.error || "Đăng tài liệu thất bại. Vui lòng đăng nhập và thử lại.", "error")
    } finally {
      setUploading(false)
    }
  }

  const filteredPosts = posts.filter(post => {
    const searchLow = searchTerm.toLowerCase()
    const matchesSearch =
      String(post.title || '').toLowerCase().includes(searchLow) ||
      getSubject(post).toLowerCase().includes(searchLow) ||
      String(post.school || '').toLowerCase().includes(searchLow)
    const matchesCategory = selectedCategory === "Tất cả" ||
      (selectedCategory === "Đề thi" && post.category === "dethi") ||
      (selectedCategory === "Slide bài giảng" && post.category === "slide") ||
      (selectedCategory === "Tóm tắt môn" && post.category === "tomtat") ||
      (selectedCategory === "Bài tập mẫu" && post.category === "baitap")
    const matchesSchool = selectedSchool === "Tất cả" || post.school === selectedSchool
    return matchesSearch && matchesCategory && matchesSchool
  })

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (selectedSort === "popular") return (b.downloads || 0) - (a.downloads || 0)
    return new Date(getPostDateRaw(b)).getTime() - new Date(getPostDateRaw(a)).getTime()
  })

  const categoriesList = ["Tất cả", "Đề thi", "Slide bài giảng", "Tóm tắt môn", "Bài tập mẫu", "Giáo trình", "Tham khảo", "Khác"]
  const activeSchools = Array.from(new Set(posts.map(p => p.school).filter(Boolean)))

  const getCategoryLabel = (cat: string) => {
    if (cat === 'dethi') return 'Đề thi'
    if (cat === 'slide') return 'Bài giảng'
    if (cat === 'tomtat') return 'Tóm tắt'
    if (cat === 'baitap') return 'Bài tập'
    if (cat === 'sach') return 'Giáo trình'
    if (cat === 'thamkhao') return 'Tham khảo'
    if (cat === 'khac') return 'Khác'
    return 'Tài liệu'
  }

  const getCategoryColor = (cat: string) => {
    if (cat === 'dethi') return 'bg-[#FFC224]'
    if (cat === 'slide') return 'bg-[#3C73ED] text-white'
    if (cat === 'tomtat') return 'bg-[#EA4335] text-white'
    if (cat === 'baitap') return 'bg-[#10B981] text-white'
    if (cat === 'sach') return 'bg-[#9B51E0] text-white'
    if (cat === 'thamkhao') return 'bg-[#F97316] text-white'
    if (cat === 'khac') return 'bg-gray-700 text-white'
    return 'bg-white'
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
      
      {/* Notifications */}
      {notification && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-8 sm:right-8 sm:max-w-md z-50 bg-[#FFC224] border-[3px] border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <Star className="w-6 h-6 text-black fill-black flex-shrink-0" />
          <span className="font-bold text-base sm:text-lg">{notification.message}</span>
        </div>
      )}

      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#9B51E0] border-[3px] border-black rounded-2xl p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-white flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 border-[2px] border-black rounded-full font-black text-sm mb-4 w-fit shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="w-2 h-2 rounded-full bg-[#EA4335] animate-pulse" />
            DIỄN ĐÀN CỘNG ĐỒNG
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 leading-tight" style={{ textShadow: "3px 3px 0px #000" }}>
            Chia sẻ tri thức<br />Vượt qua kỳ thi
          </h1>
          <p className="text-lg font-bold bg-white text-black px-4 py-2 rounded-xl border-[2px] border-black inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Mạng lưới P2P chia sẻ đề thi, slide bài giảng.
          </p>
        </div>

        <div className="bg-white border-[3px] border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
          <div>
            <h3 className="font-black text-xl mb-4 flex items-center gap-2 pb-2 border-b-[3px] border-black">
              <Star className="w-6 h-6 text-[#FFC224] fill-[#FFC224]" />
              Hồ sơ cống hiến
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 border-[2px] border-black rounded-xl p-3 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-2xl font-black text-[#9B51E0]">{reputation}</div>
                <div className="text-xs font-bold uppercase mt-1">Uy tín XP</div>
              </div>
              <div className="bg-gray-50 border-[2px] border-black rounded-xl p-3 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-2xl font-black text-[#3C73ED]">{contributions}</div>
                <div className="text-xs font-bold uppercase mt-1">Đóng góp</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black text-lg mb-4 uppercase">Phân loại</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border-[2px] border-black font-bold transition-all ${
                    selectedCategory === cat 
                      ? 'bg-[#FFC224] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1 -translate-y-1' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="bg-black text-white text-xs px-2 py-1 rounded-md">{posts.filter(p => cat === "Tất cả" ? true : getCategoryLabel(p.category) === cat).length}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black text-lg mb-4 uppercase">Trường Đại học</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <button
                onClick={() => setSelectedSchool("Tất cả")}
                className={`w-full text-left px-4 py-3 rounded-xl border-[2px] border-black font-bold transition-all ${
                  selectedSchool === "Tất cả" ? 'bg-[#3C73ED] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1 -translate-y-1' : 'bg-white hover:bg-gray-50'
                }`}
              >
                Tất cả các trường
              </button>
              {activeSchools.map(school => (
                <button
                  key={school}
                  onClick={() => setSelectedSchool(school)}
                  className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border-[2px] border-black font-bold transition-all ${
                    selectedSchool === school ? 'bg-[#3C73ED] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1 -translate-y-1' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate mr-2">{school.split(' (')[0]}</span>
                  <span className="bg-black text-white text-xs px-2 py-1 rounded-md flex-shrink-0">{posts.filter(p => p.school === school).length}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="lg:col-span-3 space-y-6 order-1 lg:order-2">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm tài liệu học tập, mã đề thi..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-[#9B51E0]/20 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>
            <div className="flex gap-4">
              <select 
                value={selectedSort}
                onChange={e => setSelectedSort(e.target.value)}
                className="px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <option value="popular">Tải nhiều nhất</option>
                <option value="recent">Mới nhất</option>
              </select>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#10B981] text-white border-[3px] border-black rounded-xl font-black hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
              >
                <Upload className="w-5 h-5" />
                Đóng góp
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white border-[3px] border-black rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-16 h-16 border-[4px] border-black border-t-[#9B51E0] rounded-full animate-spin mx-auto mb-6" />
              <h3 className="text-2xl font-black mb-2">Đang tải tài liệu...</h3>
              <p className="text-gray-500 font-bold">Vui lòng chờ trong giây lát.</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white border-[3px] border-black rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-20 h-20 bg-[#FFC224] border-[3px] border-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Upload className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-2xl font-black mb-2">Chưa có tài liệu nào được chia sẻ</h3>
              <p className="text-gray-500 font-bold mb-6">Hãy là người đầu tiên đóng góp!</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#10B981] text-white border-[3px] border-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
              >
                <Upload className="w-5 h-5" /> Đóng góp ngay
              </button>
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="bg-white border-[3px] border-black rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-20 h-20 bg-gray-100 border-[3px] border-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-2xl font-black mb-2">Không tìm thấy tài liệu</h3>
              <p className="text-gray-500 font-bold">Thử nhập từ khóa khác hoặc đổi bộ lọc xem sao.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {sortedPosts.map(post => {
                const ft = getFileType(post)
                const avatarUrl = getAuthorAvatar(post)
                return (
                <div
                  key={pid(post)}
                  onClick={() => setSelectedPost(post)}
                  className="group bg-white border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase border-[2px] border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${getCategoryColor(post.category)}`}>
                      {getCategoryLabel(post.category)}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border-[2px] border-black">{ft} • {getFileSizeLabel(post)}</span>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="w-full h-28 mb-3 rounded-xl border-[2px] border-black overflow-hidden relative bg-white flex-shrink-0 group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-shadow flex flex-col">
                    {/* Top decoration bar */}
                    <div className={`h-2 w-full ${ft === 'PDF' ? 'bg-[#EA4335]' : (ft === 'PPTX' || ft === 'PPT') ? 'bg-[#FFC224]' : 'bg-[#3C73ED]'}`} />
                    <div className="flex-1 flex flex-col items-center justify-center p-3 text-center bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                      <div className={`text-[10px] px-2 py-0.5 rounded font-black border-[2px] border-black mb-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${ft === 'PDF' ? 'bg-[#EA4335] text-white' : (ft === 'PPTX' || ft === 'PPT') ? 'bg-[#FFC224] text-black' : 'bg-white text-black'}`}>
                        {ft}
                      </div>
                      <h4 className="font-black text-gray-800 text-xs line-clamp-2 leading-snug px-1">
                        {post.title}
                      </h4>
                    </div>
                  </div>

                  <h3 className="text-sm font-black mb-1 line-clamp-2 leading-snug group-hover:text-[#3C73ED] transition-colors">{post.title}</h3>
                  <p className="text-[10px] font-bold text-gray-400 mb-3 line-clamp-1">{post.school}</p>

                  <div className="mt-auto pt-3 border-t-[3px] border-black flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#FFC224] border-[2px] border-black rounded-full flex items-center justify-center font-black text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                        {avatarUrl ? (
                          <img src={resolveFileUrl(avatarUrl)} alt="" className="w-full h-full object-cover" />
                        ) : getAvatarText(post)}
                      </div>
                      <div className="text-[10px] font-bold truncate max-w-[80px]">
                        {getAuthorName(post)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black">
                      <div className="flex items-center gap-1 text-[#EA4335]">
                        <Heart className={`w-3 h-3 ${post.hasLiked ? 'fill-current' : ''}`} />
                        {post.likes || 0}
                      </div>
                      <div className="flex items-center gap-1 text-[#3C73ED]">
                        <Download className="w-3 h-3" />
                        {post.downloads || 0}
                      </div>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95">
            
            {/* Header */}
            <div className="p-6 border-b-[4px] border-black flex justify-between items-start bg-[#FFC224]">
              <div className="flex-1 pr-6">
                <span className={`inline-block px-3 py-1 text-xs font-black uppercase border-[2px] border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-3 ${getCategoryColor(selectedPost.category)}`}>
                  {getCategoryLabel(selectedPost.category)}
                </span>
                <h2 className="text-2xl font-black mb-2 leading-tight">{selectedPost.title}</h2>
                <div className="flex flex-wrap gap-2 text-sm font-bold">
                  {getSubject(selectedPost) && (
                    <span className="bg-white px-3 py-1 rounded-md border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{getSubject(selectedPost)}</span>
                  )}
                  {selectedPost.school && (
                    <span className="bg-white px-3 py-1 rounded-md border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{selectedPost.school}</span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <p className="text-lg font-semibold leading-relaxed mb-8">{getDesc(selectedPost)}</p>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border-[3px] border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8">
                <div className="w-16 h-16 bg-[#3C73ED] border-[3px] border-black rounded-xl flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="font-black text-xl mb-1">{getFileType(selectedPost)} Document</div>
                  <div className="text-gray-500 font-bold">Kích thước: {getFileSizeLabel(selectedPost)} • Đăng ngày: {getPostDateLabel(selectedPost)}</div>
                </div>
                {getFileUrl(selectedPost) ? (
                  <button
                    onClick={(e) => handleDownload(selectedPost, e)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#10B981] text-white font-black border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
                  >
                    <Download className="w-5 h-5" /> Tải Xuống
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-300 text-gray-600 font-black border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-not-allowed opacity-70"
                  >
                    <XCircle className="w-5 h-5" /> Không có tệp
                  </button>
                )}
              </div>

              {/* Comments Section */}
              <div className="space-y-6">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <MessageSquare className="w-6 h-6" /> Bình luận ({(selectedPost.comments || []).length})
                </h3>
                
                <form onSubmit={handleAddComment} className="flex gap-3">
                  <div className="w-10 h-10 bg-black text-white border-[2px] border-black rounded-full flex items-center justify-center font-black flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                    {currentUser.avatar}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text"
                      placeholder="Thêm bình luận..."
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      className="flex-1 px-4 py-2 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#9B51E0] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    />
                    <button type="submit" className="px-6 py-2 bg-[#3C73ED] text-white font-black border-[3px] border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
                      Gửi
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  {(selectedPost.comments || []).map((cmt: any) => (
                    <div key={cmt.id} className="flex gap-4 p-4 bg-white border-[2px] border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <div className="w-10 h-10 bg-gray-200 border-[2px] border-black rounded-full flex items-center justify-center font-black flex-shrink-0">
                        {cmt.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black">{cmt.author}</span>
                          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded border-[1px] border-black">{cmt.time}</span>
                        </div>
                        <p className="font-semibold text-gray-700">{cmt.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t-[4px] border-black bg-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFC224] border-[2px] border-black rounded-full flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  {getAuthorAvatar(selectedPost) ? (
                    <img src={resolveFileUrl(getAuthorAvatar(selectedPost))} alt="" className="w-full h-full object-cover" />
                  ) : getAvatarText(selectedPost)}
                </div>
                <div>
                  <div className="text-sm font-black">{getAuthorName(selectedPost)}</div>
                  <div className="text-xs font-bold text-gray-500">{getAuthorSchool(selectedPost)}</div>
                </div>
              </div>
              <button
                onClick={(e) => handleLikePost(selectedPost, e)}
                className={`flex items-center gap-2 px-4 py-2 border-[3px] border-black rounded-xl font-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  selectedPost.hasLiked ? 'bg-[#EA4335] text-white' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <Heart className={`w-5 h-5 ${selectedPost.hasLiked ? 'fill-current' : ''}`} />
                {selectedPost.likes || 0}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b-[4px] border-black flex justify-between items-center bg-[#10B981] text-white">
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Upload className="w-6 h-6" /> Đóng góp tài liệu
              </h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="w-10 h-10 bg-white text-black border-[3px] border-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5 bg-gray-50 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-sm font-black mb-2">Tiêu đề tài liệu <span className="text-[#EA4335]">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: Đề thi cuối kỳ Cấu trúc dữ liệu và giải thuật..."
                  value={uploadForm.title}
                  onChange={e => setUploadForm({...uploadForm, title: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-[#10B981]/20 shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-black mb-2">Môn học <span className="text-[#EA4335]">*</span></label>
                  <input 
                    type="text"
                    required
                    placeholder="Tên môn học"
                    value={uploadForm.subject}
                    onChange={e => setUploadForm({...uploadForm, subject: e.target.value})}
                    className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black mb-2">Trường Đại học <span className="text-[#EA4335]">*</span></label>
                  <input
                    type="text"
                    required
                    list="university-list"
                    placeholder="Nhập hoặc chọn tên trường..."
                    value={uploadForm.school}
                    onChange={e => setUploadForm({...uploadForm, school: e.target.value})}
                    className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                  />
                  <datalist id="university-list">
                    {Array.from(new Set([...BASE_UNIVERSITIES, ...activeSchools])).map(u => <option key={u} value={u} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black mb-2">Loại tài liệu</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'dethi', label: 'Đề thi', color: 'bg-[#FFC224] text-black' },
                    { id: 'slide', label: 'Bài giảng', color: 'bg-[#3C73ED] text-white' },
                    { id: 'tomtat', label: 'Tóm tắt', color: 'bg-[#EA4335] text-white' },
                    { id: 'baitap', label: 'Bài tập', color: 'bg-[#10B981] text-white' },
                    { id: 'sach', label: 'Giáo trình', color: 'bg-[#9B51E0] text-white' },
                    { id: 'thamkhao', label: 'Tham khảo', color: 'bg-[#F97316] text-white' },
                    { id: 'khac', label: 'Khác', color: 'bg-gray-700 text-white' }
                  ].map(cat => (
                    <label key={cat.id} className="cursor-pointer">
                      <input 
                        type="radio" 
                        name="category" 
                        value={cat.id} 
                        checked={uploadForm.category === cat.id}
                        onChange={e => setUploadForm({...uploadForm, category: e.target.value})}
                        className="sr-only"
                      />
                      <div className={`px-4 py-2 border-[2px] border-black rounded-xl font-black transition-all ${
                        uploadForm.category === cat.id ? `${cat.color} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105` : 'bg-white text-gray-500 hover:bg-gray-100'
                      }`}>
                        {cat.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-black mb-2">Mô tả thêm</label>
                <textarea
                  rows={3}
                  placeholder="Chia sẻ thêm thông tin về tài liệu (VD: có đáp án không, dùng cho học kỳ nào...)"
                  value={uploadForm.desc}
                  onChange={e => setUploadForm({...uploadForm, desc: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-[3px] border-black rounded-xl font-bold focus:outline-none shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)] resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-black mb-2">Tệp tài liệu <span className="text-[#EA4335]">*</span></label>
                <div className="border-[3px] border-dashed border-black bg-white rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                  <input 
                    type="file" 
                    required
                    onChange={e => setUploadForm({...uploadForm, file: e.target.files?.[0] || null})}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex justify-center mb-2">
                    <Upload className="w-8 h-8 text-[#9B51E0]" />
                  </div>
                  {uploadForm.file ? (
                    <div className="font-black text-[#10B981]">{uploadForm.file.name}</div>
                  ) : (
                    <>
                      <div className="font-black text-lg">Kéo thả hoặc nhấn để tải lên</div>
                      <div className="text-sm font-bold text-gray-500">Hỗ trợ PDF, DOCX, PPTX, ZIP (Tối đa 50MB)</div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t-[3px] border-black flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)}
                  className="px-6 py-3 bg-white border-[3px] border-black rounded-xl font-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-3 bg-[#10B981] text-white border-[3px] border-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  {uploading ? 'Đang đăng...' : 'Đăng tài liệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
