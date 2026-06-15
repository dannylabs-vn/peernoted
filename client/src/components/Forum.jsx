import React, { useState } from 'react';
import './Forum.css';

const BASE_UNIVERSITIES = [
  "Đại học Bách Khoa TP.HCM (HCMUT)",
  "Đại học Kinh tế TP.HCM (UEH)",
  "Đại học Ngoại thương (FTU)",
  "Đại học Công nghệ Thông tin (UIT)",
  "Đại học Quốc gia Hà Nội (VNU)",
  "Đại học RMIT Việt Nam (RMIT)",
  "Đại học Bách Khoa Hà Nội (HUST)",
  "Đại học Kinh tế Quốc dân (NEU)",
  "Đại học Ngoại thương Hà Nội (FTU-HN)",
  "Đại học Ngoại ngữ - ĐHQGHN (ULIS)",
  "Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE)",
  "Đại học Công nghiệp TP.HCM (IUH)",
  "Đại học Giao thông Vận tải (UTC)",
  "Đại học Luật TP.HCM (ULAW)",
  "Đại học Y Dược TP.HCM (UMP)",
  "Đại học Tôn Đức Thắng (TDTU)",
  "Đại học FPT (FPT)",
  "Đại học Hoa Sen (HSU)",
  "Đại học Quốc tế - ĐHQG TP.HCM (IU)",
  "Đại học Khoa học Tự nhiên - ĐHQG TP.HCM (HCMUS)",
  "Đại học Khoa học Xã hội và Nhân văn TP.HCM (USSH)",
  "Đại học Kinh tế - Luật - ĐHQG TP.HCM (UEL)",
  "Đại học Sài Gòn (SGU)",
  "Đại học Cần Thơ (CTU)",
  "Học viện Công nghệ Bưu chính Viễn thông (PTIT)",
  "Học viện Ngoại giao (DAV)",
  "Học viện Tài chính (AOF)",
  "Học viện Ngân hàng (BA)",
  "Trường Đại học VinUniversity (VinUni)"
];

const INITIAL_POSTS = [
  {
    id: 1,
    title: "Đề thi giữa kỳ Giải tích 1 - K23 (Có đáp án chi tiết)",
    subject: "Giải tích 1",
    school: "Đại học Bách Khoa TP.HCM (HCMUT)",
    schoolCode: "BK",
    category: "dethi", // dethi, slide, tomtat, baitap
    desc: "Đề thi chính thức môn Giải tích 1 kì học 20231 dành cho sinh viên nhóm ngành kỹ thuật đại trà của ĐH Bách Khoa TP.HCM. File bao gồm 4 câu tự luận kèm lời giải chi tiết và thang điểm chuẩn của bộ môn Toán ứng dụng.",
    uploader: {
      name: "Trần Minh Quân",
      avatar: "MQ",
      school: "ĐH Bách Khoa"
    },
    fileSize: "1.8 MB",
    fileType: "PDF",
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
    uploader: {
      name: "Nguyễn Hoài Thương",
      avatar: "HT",
      school: "ĐH Kinh Tế"
    },
    fileSize: "4.2 MB",
    fileType: "PPTX",
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
    uploader: {
      name: "Lê Thị Hồng Hạnh",
      avatar: "HH",
      school: "ĐH Ngoại Thương"
    },
    fileSize: "850 KB",
    fileType: "PDF",
    downloads: 412,
    likes: 156,
    hasLiked: false,
    comments: [
      { id: 1, author: "Nguyễn Hoàng Long", avatar: "HL", text: "Cứu cánh cho kỳ thi ngày mai đây rồi! Đầy đủ công thức dễ tra cứu.", time: "1 tuần trước" },
      { id: 2, author: "Vũ Phương Mai", avatar: "PM", text: "Đẹp và rõ ràng lắm, in ra 1 tờ A4 hai mặt mang vào phòng ôn tập siêu tiện.", time: "5 ngày trước" }
    ],
    date: "2026-06-01"
  },
  {
    id: 4,
    title: "Bộ đề ôn thi cuối kỳ Lập trình hướng đối tượng (C++ / Java)",
    subject: "Lập trình hướng đối tượng",
    school: "Đại học Công nghệ Thông tin (UIT)",
    schoolCode: "IT",
    category: "dethi",
    desc: "Tổng hợp 5 đề thi cuối kỳ môn OOP của ĐH Công nghệ Thông tin qua các năm gần đây. Đề bao gồm các câu hỏi lý thuyết về Tính chất OOP (Đa hình, Kế thừa, Đóng gói, Trừu tượng), thiết kế Class UML và viết code giải thuật ứng dụng.",
    uploader: {
      name: "Đỗ Hoàng Nam",
      avatar: "HN",
      school: "ĐH CNTT"
    },
    fileSize: "2.5 MB",
    fileType: "ZIP",
    downloads: 198,
    likes: 64,
    hasLiked: false,
    comments: [],
    date: "2026-05-20"
  },
  {
    id: 5,
    title: "Bài tập lớn mẫu môn Lập trình hệ thống - Đạt điểm 9.5/10",
    subject: "Lập trình hệ thống",
    school: "Đại học Bách Khoa TP.HCM (HCMUT)",
    schoolCode: "BK",
    category: "baitap",
    desc: "Báo cáo bài tập lớn hệ thống Linux, viết shell script tự động hóa tác vụ quản trị hệ thống và quản lý tài nguyên server. File gồm source code tham khảo và file PDF báo cáo lý thuyết chi tiết cấu trúc phần mềm.",
    uploader: {
      name: "Nguyễn Hải Dương",
      avatar: "HD",
      school: "ĐH Bách Khoa"
    },
    fileSize: "3.1 MB",
    fileType: "PDF",
    downloads: 125,
    likes: 41,
    hasLiked: false,
    comments: [
      { id: 1, author: "Đặng Tiến Dũng", avatar: "DD", text: "Source chạy mượt, báo cáo trình bày khoa học ghê.", time: "3 tuần trước" }
    ],
    date: "2026-04-15"
  },
  {
    id: 6,
    title: "Đề cương ôn tập Triết học Mác - Lênin (40 câu hỏi tự luận chọn lọc cực kỳ chi tiết)",
    subject: "Triết học Mác - Lênin",
    school: "Đại học Quốc gia Hà Nội (VNU)",
    schoolCode: "QG",
    category: "tomtat",
    desc: "Tài liệu tổng hợp 40 câu hỏi tự luận trọng tâm môn Triết học Mác-Lênin, bao gồm các chủ đề về bản chất ý thức, quy luật lượng chất, phủ định của phủ định, cặp phạm trù và mối quan hệ biện chứng giữa lực lượng sản xuất và quan hệ sản xuất.",
    uploader: {
      name: "Bùi Tuyết Mai",
      avatar: "TM",
      school: "ĐHQG Hà Nội"
    },
    fileSize: "1.2 MB",
    fileType: "DOCX",
    downloads: 320,
    likes: 112,
    hasLiked: false,
    comments: [
      { id: 1, author: "Lê Minh Tuấn", avatar: "MT", text: "Đọc cái này dễ học hơn đọc giáo trình dày cộp nhiều.", time: "1 tháng trước" }
    ],
    date: "2026-03-28"
  }
];

export default function Forum() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  
  // User profile & gamification states
  const [reputation, setReputation] = useState(120);
  const [downloadsUsed, setDownloadsUsed] = useState(2);
  const [downloadsTotal, setDownloadsTotal] = useState(5);
  const [contributions, setContributions] = useState(3);
  
  // Interactive navigation states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedSchool, setSelectedSchool] = useState("Tất cả");
  const [selectedSort, setSelectedSort] = useState("popular"); // popular | recent

  // Modal states
  const [selectedPost, setSelectedPost] = useState(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form states
  const [uploadForm, setUploadForm] = useState({
    title: "",
    subject: "",
    school: "",
    category: "dethi",
    desc: "",
    file: null
  });

  const quota = downloadsTotal - downloadsUsed;

  // Notification popup handler
  const [notification, setNotification] = useState(null);
  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Like Toggle
  const handleLikePost = (postId, e) => {
    e && e.stopPropagation();
    
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const updatedLike = !post.hasLiked;
          const updatedLikesCount = updatedLike ? post.likes + 1 : post.likes - 1;
          
          const updatedPost = {
            ...post,
            hasLiked: updatedLike,
            likes: updatedLikesCount
          };
          
          if (selectedPost && selectedPost.id === postId) {
            setSelectedPost(updatedPost);
          }
          
          return updatedPost;
        }
        return post;
      })
    );
  };

  // Handle Download Simulation
  const handleDownload = (post, e) => {
    e && e.stopPropagation();
    
    if (quota <= 0) {
      alert("Bạn đã hết hạn ngạch tải tài liệu miễn phí! Hãy đóng góp 1 tài liệu của bạn để nhận ngay 5 lượt tải miễn phí.");
      return;
    }

    setDownloadsUsed(prev => prev + 1);
    
    setPosts(prevPosts => 
      prevPosts.map(p => {
        if (p.id === post.id) {
          const updatedPost = { ...p, downloads: p.downloads + 1 };
          if (selectedPost && selectedPost.id === post.id) {
            setSelectedPost(updatedPost);
          }
          return updatedPost;
        }
        return p;
      })
    );

    showToast(`Đang tải xuống: ${post.title}`, 'success');
  };

  // Submit Comment
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment = {
      id: Date.now(),
      author: "Nguyễn An", 
      avatar: "NA",
      text: newCommentText.trim(),
      time: "Vừa xong"
    };

    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === selectedPost.id) {
          const updatedPost = {
            ...post,
            comments: [...post.comments, newComment]
          };
          setSelectedPost(updatedPost);
          return updatedPost;
        }
        return post;
      })
    );

    setNewCommentText("");
    showToast("Đã gửi bình luận thành công", "success");
  };

  // Handle Document Upload Simulation
  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.subject || !uploadForm.school || !uploadForm.file) {
      alert("Vui lòng điền các thông tin bắt buộc và chọn tệp.");
      return;
    }

    // Try to extract abbreviations (e.g. HCMUT, NEU) from text
    let code = "TL";
    const match = uploadForm.school.match(/\(([^)]+)\)/);
    if (match) {
      code = match[1];
    } else {
      // Create simple initials from typed school name
      code = uploadForm.school
        .split(' ')
        .map(w => w.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 3);
    }

    const newPost = {
      id: Date.now(),
      title: uploadForm.title,
      subject: uploadForm.subject,
      school: uploadForm.school,
      schoolCode: code,
      category: uploadForm.category,
      desc: uploadForm.desc || "Không có mô tả.",
      uploader: {
        name: "Nguyễn An",
        avatar: "NA",
        school: uploadForm.school.split(' (')[0]
      },
      fileSize: `${(uploadForm.file.size / (1024 * 1024)).toFixed(1)} MB`,
      fileType: uploadForm.file.name.split('.').pop().toUpperCase(),
      downloads: 0,
      likes: 0,
      hasLiked: false,
      comments: [],
      date: new Date().toISOString().split('T')[0]
    };

    setPosts(prev => [newPost, ...prev]);
    setContributions(prev => prev + 1);
    setReputation(prev => prev + 50); 
    setDownloadsTotal(prev => prev + 5); 
    
    setUploadForm({
      title: "",
      subject: "",
      school: "",
      category: "dethi",
      desc: "",
      file: null
    });

    setShowUploadModal(false);
    showToast("Đóng góp thành công! Nhận thêm 50 XP và 5 lượt tải mới.", "success");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  // Filtering Logic
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.school.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = 
      selectedCategory === "Tất cả" || 
      (selectedCategory === "Đề thi" && post.category === "dethi") ||
      (selectedCategory === "Slide bài giảng" && post.category === "slide") ||
      (selectedCategory === "Tóm tắt môn" && post.category === "tomtat") ||
      (selectedCategory === "Bài tập mẫu" && post.category === "baitap");

    const matchesSchool = 
      selectedSchool === "Tất cả" || post.school === selectedSchool;

    return matchesSearch && matchesCategory && matchesSchool;
  });

  // Sorting Logic
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (selectedSort === "popular") {
      return b.downloads - a.downloads;
    } else {
      return new Date(b.date) - new Date(a.date);
    }
  });

  const categoriesList = ["Tất cả", "Đề thi", "Slide bài giảng", "Tóm tắt môn", "Bài tập mẫu"];

  // Dynamically extract unique schools present in current posts list
  const activeSchools = Array.from(new Set(posts.map(p => p.school)));

  return (
    <div className="forum-container">
      {notification && (
        <div className={`toast toast-${notification.type}`} style={{ zIndex: 1100 }}>
          {notification.message}
        </div>
      )}

      {/* ── Top Dashboard Stats Row ── */}
      <div className="forum-top-dashboard">
        <div className="forum-welcome-banner">
          <div className="forum-welcome-badge">
            <span className="hero-badge-dot"></span>
            Diễn đàn cộng đồng học thuật
          </div>
          <h2>Chia sẻ tri thức - Vượt qua kỳ thi</h2>
          <p>
            Mạng lưới trao đổi giáo trình, slide bài giảng và đề thi cuối kỳ hoàn toàn ngang hàng (P2P). Hãy đóng góp các ghi chú học tập chất lượng của bạn để nhận lượt tải không giới hạn!
          </p>
        </div>

        <div className="forum-quota-card">
          <div className="quota-header">
            <span className="quota-title">Hồ sơ cống hiến</span>
            <span className="quota-rank-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z"/>
              </svg>
              Bạc đóng góp
            </span>
          </div>

          <div className="quota-stats-grid">
            <div className="quota-stat-box">
              <div className="quota-stat-val">{reputation}</div>
              <div className="quota-stat-lbl">Uy tín XP</div>
            </div>
            <div className="quota-stat-box">
              <div className="quota-stat-val">{contributions}</div>
              <div className="quota-stat-lbl">Đã đóng góp</div>
            </div>
            <div className="quota-stat-box">
              <div className="quota-stat-val">{quota}</div>
              <div className="quota-stat-lbl">Còn lại</div>
            </div>
          </div>

          <div className="quota-progress-container">
            <div className="quota-progress-label">
              <span>Hạn ngạch tải xuống</span>
              <span>{quota} / {downloadsTotal} lượt</span>
            </div>
            <div className="quota-progress-bar">
              <div className="quota-progress-fill" style={{ width: `${(quota / downloadsTotal) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Two Column Layout ── */}
      <div className="forum-main-layout">
        {/* Sidebar Filters */}
        <aside className="forum-sidebar">
          {/* Categories Panel */}
          <div className="forum-filter-panel">
            <div className="filter-panel-title">Phân loại tài liệu</div>
            <div className="filter-button-list">
              {categoriesList.map(cat => {
                const count = posts.filter(post => {
                  if (cat === "Tất cả") return true;
                  if (cat === "Đề thi") return post.category === "dethi";
                  if (cat === "Slide bài giảng") return post.category === "slide";
                  if (cat === "Tóm tắt môn") return post.category === "tomtat";
                  if (cat === "Bài tập mẫu") return post.category === "baitap";
                  return false;
                }).length;

                return (
                  <button
                    key={cat}
                    className={`filter-sidebar-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{cat}</span>
                    <span className="filter-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* School Filter Panel */}
          <div className="forum-filter-panel">
            <div className="filter-panel-title">Lọc theo trường</div>
            <div className="filter-button-list">
              <button
                className={`filter-sidebar-btn ${selectedSchool === "Tất cả" ? 'active' : ''}`}
                onClick={() => setSelectedSchool("Tất cả")}
              >
                <span>Tất cả các trường</span>
              </button>
              {activeSchools.map(univ => {
                const count = posts.filter(p => p.school === univ).length;
                return (
                  <button
                    key={univ}
                    className={`filter-sidebar-btn ${selectedSchool === univ ? 'active' : ''}`}
                    onClick={() => setSelectedSchool(univ)}
                  >
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} title={univ}>
                      {univ.split(' (')[0]}
                    </span>
                    <span className="filter-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Content Feed Pane */}
        <section className="forum-feed-pane">
          {/* Filter, search inputs & share button */}
          <div className="forum-feed-controls">
            <div className="forum-search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="forum-search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input 
                type="text" 
                placeholder="Tìm tài liệu học tập, mã đề thi..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="forum-sort-box">
              <button 
                className="btn btn-primary"
                onClick={() => setShowUploadModal(true)}
                style={{ background: 'var(--gradient-ai)', border: 'none', height: '44px', padding: '0 20px', borderRadius: '22px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                Đóng góp tài liệu
              </button>
              
              <button 
                className="sort-select-btn"
                onClick={() => setSelectedSort(prev => prev === 'popular' ? 'recent' : 'popular')}
              >
                <span>Sắp xếp: {selectedSort === 'popular' ? 'Tải nhiều nhất' : 'Mới nhất'}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Cards Grid list */}
          {sortedPosts.length === 0 ? (
            <div className="forum-empty-feed">
              <div className="forum-empty-feed-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3>Không tìm thấy tài liệu nào</h3>
              <p>Thử nhập từ khóa tìm kiếm khác hoặc thay đổi bộ lọc trường học.</p>
            </div>
          ) : (
            <div className="forum-cards-grid">
              {sortedPosts.map(post => {
                const isDethi = post.category === 'dethi';
                const isSlide = post.category === 'slide';
                const isTomtat = post.category === 'tomtat';
                let tagLabel = 'Tài liệu';
                if (isDethi) tagLabel = 'Đề thi';
                else if (isSlide) tagLabel = 'Bài giảng';
                else if (isTomtat) tagLabel = 'Tóm tắt';
                else if (post.category === 'baitap') tagLabel = 'Bài tập';

                let bgGradient = 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)';
                let docIcon = (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                );
                
                if (isDethi) {
                  bgGradient = 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)';
                  docIcon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  );
                } else if (isSlide) {
                  bgGradient = 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)';
                  docIcon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  );
                } else if (isTomtat) {
                  bgGradient = 'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)';
                  docIcon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .5 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                      <line x1="9" y1="18" x2="15" y2="18" />
                      <line x1="10" y1="22" x2="14" y2="22" />
                    </svg>
                  );
                } else if (post.category === 'baitap') {
                  bgGradient = 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)';
                  docIcon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                  );
                }

                return (
                  <div 
                    key={post.id} 
                    className="forum-doc-card"
                    onClick={() => setSelectedPost(post)}
                  >
                    <div className="doc-card-header">
                      <span className={`doc-card-type-tag ${post.category}`}>
                        {tagLabel}
                      </span>
                      <div className="doc-card-school-logo">
                        {post.schoolCode}
                      </div>
                    </div>

                    <div className="doc-card-preview-area" style={{ background: bgGradient }}>
                      <span className="doc-card-preview-icon">{docIcon}</span>
                      <span className="doc-card-preview-bg-txt">{post.fileType}</span>
                    </div>

                    <div className="doc-card-body">
                      <span className="doc-card-subject" style={{ color: 'var(--primary)' }}>
                        {post.subject}
                      </span>
                      <h3 className="doc-card-title">{post.title}</h3>
                      <div className="doc-card-school-name">{post.school.split(' (')[0]}</div>
                    </div>

                    <div className="doc-card-footer">
                      <div className="doc-card-user-info">
                        <div className="doc-card-user-avatar">
                          {post.uploader.avatar}
                        </div>
                        <span className="doc-card-user-name">{post.uploader.name}</span>
                      </div>

                      <div className="doc-card-stats">
                        <div className="doc-card-stat-item" title="Lượt tải">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                          </svg>
                          <span>{post.downloads}</span>
                        </div>
                        <div 
                          className="doc-card-stat-item" 
                          title="Lượt thích"
                          style={{ cursor: 'pointer', color: post.hasLiked ? '#ef4444' : 'inherit' }}
                          onClick={(e) => handleLikePost(post.id, e)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={post.hasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                          <span>{post.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Modal Chi Tiết Tài Liệu ── */}
      {selectedPost && (
        <div className="forum-modal-backdrop" onClick={() => setSelectedPost(null)}>
          <div className="forum-details-modal glass" onClick={(e) => e.stopPropagation()}>
            {/* Left Column */}
            <div className="forum-modal-left">
              <div className="modal-left-header">
                <div className="modal-header-meta">
                  <span className={`doc-card-type-tag ${selectedPost.category}`}>
                    {selectedPost.category === 'dethi' ? 'Đề thi' : 
                     selectedPost.category === 'slide' ? 'Slide' : 
                     selectedPost.category === 'tomtat' ? 'Tóm tắt' : 'Bài tập'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Đăng ngày {new Date(selectedPost.date).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <h2 className="modal-doc-title">{selectedPost.title}</h2>
                <div className="modal-doc-school">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', color: 'var(--text-secondary)' }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {selectedPost.school}
                </div>
              </div>

              <div className="modal-doc-preview-box">
                <span className="modal-preview-doc-icon">
                  {selectedPost.category === 'dethi' ? (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  ) : selectedPost.category === 'slide' ? (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  ) : selectedPost.category === 'tomtat' ? (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .5 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                      <line x1="9" y1="18" x2="15" y2="18" />
                      <line x1="10" y1="22" x2="14" y2="22" />
                    </svg>
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                  )}
                </span>
                <div className="modal-preview-doc-title">{selectedPost.title.substring(0, 45)}...</div>
                <div className="modal-preview-doc-size">{selectedPost.fileType} • {selectedPost.fileSize}</div>
                
                <div style={{ position: 'absolute', bottom: '10px', fontSize: '0.7rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 11l2 2 4-4" />
                  </svg>
                  Tài liệu đã được quét virus bởi PeerNoted AI
                </div>
              </div>

              <div className="modal-doc-desc">
                <strong>Mô tả tài liệu:</strong>
                <p style={{ marginTop: '4px' }}>{selectedPost.desc}</p>
              </div>

              <div className="modal-left-footer-actions">
                <button 
                  className={`btn-modal-like ${selectedPost.hasLiked ? 'active' : ''}`}
                  onClick={(e) => handleLikePost(selectedPost.id, e)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={selectedPost.hasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span>{selectedPost.hasLiked ? 'Đã thích' : 'Thích'}</span>
                  <span>({selectedPost.likes})</span>
                </button>

                <button 
                  className="btn-modal-download"
                  onClick={(e) => handleDownload(selectedPost, e)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  <span>Tải xuống ({selectedPost.fileType})</span>
                </button>
              </div>
            </div>

            {/* Right Column - Comments section */}
            <div className="forum-modal-right">
              <div className="modal-right-header">
                <span className="modal-right-title">Thảo luận ({selectedPost.comments.length})</span>
                <button className="btn-close-forum-modal" onClick={() => setSelectedPost(null)}>✕</button>
              </div>

              <div className="modal-comments-area">
                {selectedPost.comments.length === 0 ? (
                  <div className="forum-comment-empty">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px auto', display: 'block', color: 'var(--text-muted)' }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Chưa có bình luận nào. Hãy gửi phản hồi hoặc cảm ơn người chia sẻ nhé!
                  </div>
                ) : (
                  selectedPost.comments.map(comment => (
                    <div key={comment.id} className="forum-comment-card">
                      <div className="comment-card-header">
                        <div className="comment-author-info">
                          <div className="comment-author-avatar">
                            {comment.avatar}
                          </div>
                          <span className="comment-author-name">{comment.author}</span>
                        </div>
                        <span className="comment-time">{comment.time}</span>
                      </div>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form className="forum-comment-input-form" onSubmit={handleAddComment}>
                <input 
                  type="text" 
                  placeholder="Gửi bình luận hoặc câu hỏi ôn tập..." 
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                />
                <button type="submit" className="btn-submit-comment" title="Gửi bình luận">
                  ➤
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Đóng Góp Tài Liệu Mới ── */}
      {showUploadModal && (
        <div className="forum-modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div className="forum-upload-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="upload-modal-header">
              <h3>Đóng góp tài liệu học tập</h3>
              <button className="btn-close-forum-modal" onClick={() => setShowUploadModal(false)}>✕</button>
            </div>

            <form className="forum-form" onSubmit={handleUploadSubmit}>
              <div className="forum-form-group">
                <label>Tên tài liệu *</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Đề thi cuối kỳ Lập trình mạng - K22"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(p => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>

              <div className="forum-form-group">
                <label>Bộ môn học *</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Lập trình mạng"
                  value={uploadForm.subject}
                  onChange={(e) => setUploadForm(p => ({ ...p, subject: e.target.value }))}
                  required
                />
              </div>

              <div className="forum-form-group">
                <label>Trường đại học (Chọn từ gợi ý hoặc tự điền) *</label>
                <input
                  type="text"
                  list="university-datalist-options"
                  placeholder="Chọn hoặc nhập trường đại học của bạn..."
                  value={uploadForm.school}
                  onChange={(e) => setUploadForm(p => ({ ...p, school: e.target.value }))}
                  required
                />
                <datalist id="university-datalist-options">
                  {BASE_UNIVERSITIES.map(univ => (
                    <option key={univ} value={univ} />
                  ))}
                </datalist>
              </div>

              <div className="forum-form-group">
                <label>Phân loại tài liệu</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm(p => ({ ...p, category: e.target.value }))}
                >
                  <option value="dethi">Đề thi / Đề kiểm tra</option>
                  <option value="slide">Slide bài giảng / Giáo trình</option>
                  <option value="tomtat">Tóm tắt / Cheat sheet ôn thi</option>
                  <option value="baitap">Bài tập lớn / Bài tập mẫu</option>
                </select>
              </div>

              <div className="forum-form-group">
                <label>Mô tả ngắn</label>
                <textarea 
                  placeholder="Mô tả nội dung tài liệu, ví dụ: bao nhiêu câu, có lời giải hay không, chương mấy..."
                  rows="3"
                  value={uploadForm.desc}
                  onChange={(e) => setUploadForm(p => ({ ...p, desc: e.target.value }))}
                />
              </div>

              <div className="forum-form-group">
                <label>Tệp tài liệu đính kèm *</label>
                {uploadForm.file ? (
                  <div className="forum-selected-file-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>{uploadForm.file.name} ({(uploadForm.file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    <button 
                      type="button" 
                      className="btn-remove-selected-file"
                      onClick={() => setUploadForm(p => ({ ...p, file: null }))}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="forum-file-selector">
                    <div className="forum-file-selector-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                    </div>
                    <div className="forum-file-selector-text">Chọn hoặc kéo tệp tài liệu vào đây</div>
                    <div className="forum-file-selector-subtext">Hỗ trợ PDF, PPTX, DOCX, ZIP tối đa 20MB</div>
                    <input 
                      type="file" 
                      style={{ display: 'none' }}
                      accept=".pdf,.docx,.doc,.pptx,.ppt,.zip"
                      onChange={handleFileChange}
                      required
                    />
                  </label>
                )}
              </div>

              <div className="upload-modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowUploadModal(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ background: 'var(--gradient-ai)', border: 'none' }}
                >
                  Đăng tài liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
