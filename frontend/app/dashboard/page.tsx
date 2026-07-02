"use client"

import { useEffect, useState } from 'react';
import { getMe, getFolders, deleteFolder } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { FileText, FolderOpen, Sparkles, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    folders: 0,
    files: 0,
    cheatsheets: 0,
    podcasts: 0
  });
  const [user, setUser] = useState<{name: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [foldersList, setFoldersList] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const socket = connectSocket(token);
      socket.on('global-online-users', (count: number) => {
        setOnlineUsers(count);
      });
    }

    return () => {
      // Clean up socket listener
      const socket = connectSocket(token || '');
      if (socket) {
        socket.off('global-online-users');
      }
      disconnectSocket();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [meRes, foldersRes] = await Promise.all([
        getMe(),
        getFolders()
      ]);
      
      setUser(meRes.data);
      
      const folders = foldersRes.data || [];
      setFoldersList(folders);
      
      let totalFiles = 0;
      let totalCS = 0;
      let totalPods = 0;
      
      folders.forEach((f: any) => {
        totalFiles += (f.fileCount || 0);
        if (f.cheat_sheet_json || f.cheat_sheet_markdown) totalCS++;
        if (f.podcast_audio_url || (f.podcast_script && f.podcast_script.length > 0)) totalPods++;
      });

      setStats({
        folders: folders.length,
        files: totalFiles,
        cheatsheets: totalCS,
        podcasts: totalPods
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa môn học này? Mọi tài liệu bên trong sẽ bị xóa vĩnh viễn!')) return;
    try {
      await deleteFolder(id);
      await fetchDashboardData();
    } catch (err) {
      console.error('Lỗi khi xóa:', err);
      alert('Có lỗi xảy ra khi xóa môn học');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleUpload(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleUpload(Array.from(e.target.files));
    }
  };

  const handleUpload = async (files: File[]) => {
    // Validate file sizes and types client-side
    const validFiles = [];
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_MIMES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        alert(`File ${file.name} vượt quá giới hạn 50MB và đã bị bỏ qua.`);
        continue;
      }
      if (!ALLOWED_MIMES.includes(file.type) && !file.name.toLowerCase().endsWith('.txt')) {
        alert(`File ${file.name} có định dạng không được hỗ trợ. Chỉ chấp nhận PDF, Word, TXT hoặc hình ảnh.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const { classifyFiles } = await import('@/lib/api');
      const res = await classifyFiles(validFiles);
      await fetchDashboardData();
      
      const results = res.data?.results || [];
      if (results.length > 0) {
        const folderObj = results[0].folder;
        const folderId = folderObj?._id || folderObj;
        if (folderId) {
          router.push(`/dashboard/library?folder=${folderId}`);
          return;
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Có lỗi xảy ra khi tải tài liệu. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-[4px] border-black border-t-[#3C73ED] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10">
      
      {/* Top Action Bar */}
      <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        <div className="flex items-center gap-2 text-[#3C73ED]">
          <Sparkles className="w-4 h-4" />
          SMART ORGANIZER - ACTIVE
        </div>
        <div className="text-gray-400">
          ENGINE V4.2 - GEMINI FLASH
        </div>
      </div>

      {/* Welcome Section with Sun */}
      <div className="bg-[#1C92FF] border-[3px] border-black rounded-2xl p-8 md:p-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white relative overflow-hidden mb-6">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight" style={{ textShadow: "3px 3px 0px #000" }}>
            Chào mừng trở lại, {user?.name}!
          </h2>
          <p className="text-lg font-bold bg-white text-black inline-block px-4 py-2 border-[2px] border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
            Hôm nay bạn muốn học gì nào?
          </p>
        </div>
        {/* Decorative elements: Sun in top right corner */}
        <div className="absolute right-0 top-0 hidden md:block z-0 pointer-events-none">
          {/* Rotating rays */}
          <svg className="absolute right-0 top-0 w-[350px] h-[350px] translate-x-1/2 -translate-y-1/2 animate-[spin_30s_linear_infinite]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((angle, i) => (
              <path key={i} d="M100 5 L108 50 L92 50 Z" fill="#FFC224" stroke="#0B0B0B" strokeWidth="2" strokeLinejoin="round" transform={`rotate(${angle} 100 100)`} />
            ))}
          </svg>
          {/* Sun core */}
          <div className="absolute right-0 top-0 w-56 h-56 bg-[#FFC224] border-[3px] border-black rounded-full translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <label 
        htmlFor="dashboard-file-upload"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full bg-white border-[3px] border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative ${
          isDragging ? 'border-[#3C73ED] bg-[#E8F0FE]' : 'border-gray-300 hover:border-black hover:bg-gray-50'
        }`}
      >
        <input id="dashboard-file-upload" type="file" multiple className="hidden" onChange={handleFileSelect} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-[4px] border-black border-t-[#3C73ED] rounded-full animate-spin"></div>
            <h3 className="text-xl font-black text-[#3C73ED]">AI đang phân tích và tải lên...</h3>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <FileText className="w-8 h-8 text-gray-300" />
              <FolderOpen className={`w-10 h-10 ${isDragging ? 'text-[#3C73ED]' : 'text-gray-400'}`} />
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-black mb-2 text-black">{isDragging ? 'Thả tài liệu vào đây!' : 'Kéo & Thả tài liệu vào đây'}</h3>
            <p className="text-gray-500 font-semibold text-sm">PDF, Word, TXT, Ảnh — AI sẽ tự phân loại</p>
          </>
        )}
      </label>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-[2px] border-black p-5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-default">
          <div className="text-[10px] font-black uppercase text-gray-500 mb-2">TÀI LIỆU</div>
          <div className="text-3xl font-black mb-1">{stats.files}</div>
          <div className="text-xs font-bold text-[#35A76A]">Đã phân loại</div>
        </div>

        <div className="bg-white border-[2px] border-black p-5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-default relative overflow-hidden">
          <div className="text-[10px] font-black uppercase text-gray-500 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            ĐỒNG CHÍ ĐANG ONLINE
          </div>
          <div className="text-3xl font-black mb-1">{onlineUsers}</div>
          <div className="text-xs font-bold text-gray-600">Cùng bạn cày deadline</div>
        </div>

        <div className="bg-white border-[2px] border-black p-5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-default">
          <div className="text-[10px] font-black uppercase text-gray-500 mb-2">CHEAT SHEETS</div>
          <div className="text-3xl font-black mb-1 text-[#EA4335]">{stats.cheatsheets}</div>
          <div className="text-xs font-bold text-gray-600">Tài liệu ôn tập</div>
        </div>

        <div className="bg-white border-[2px] border-black p-5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-default">
          <div className="text-[10px] font-black uppercase text-gray-500 mb-2">PODCAST ĐÃ TẠO</div>
          <div className="text-3xl font-black mb-1">{stats.podcasts}</div>
          <div className="text-xs font-bold text-gray-600">Podcast học tập</div>
        </div>
      </div>

      {/* Two Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        
        {/* Left Column (2/3) - Quick Access */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center px-1">
            <div>
              <div className="text-[10px] font-black text-[#3C73ED] uppercase tracking-wider mb-0.5">THƯ VIỆN • {foldersList.length} MÔN HỌC</div>
              <h3 className="text-lg font-black">Truy cập nhanh</h3>
            </div>
            <Link href="/dashboard/library" className="text-sm font-bold text-[#3C73ED] hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {foldersList.length === 0 ? (
            <div className="bg-white border-[2px] border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <FolderOpen className="w-16 h-16 text-[#FFC224] fill-[#FFC224]/20 mb-4" strokeWidth={1.5} />
              <h4 className="text-xl font-black mb-2">Thư viện tài liệu trống</h4>
              <p className="text-sm text-gray-500 font-semibold max-w-md mx-auto mb-6">
                Kéo thả tài liệu của bạn vào khu vực phía trên. AI sẽ tự động phân tích ngữ nghĩa, phân loại và tạo các thư mục môn học tương ứng.
              </p>
              <label htmlFor="dashboard-file-upload" className="cursor-pointer px-6 py-2 bg-[#0B0B0B] text-white font-bold rounded-xl text-sm border-2 border-black hover:bg-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] transition-all inline-block">
                + Tải lên file đầu tiên
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {foldersList.slice(0, 4).map(folder => (
                <Link key={folder._id} href={`/dashboard/library?folder=${folder._id}`} className="flex items-center gap-4 bg-white border-[2px] border-black p-4 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group/folder relative">
                  <div className="w-12 h-12 bg-[#FFC224]/20 border-2 border-[#FFC224] rounded-lg flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-6 h-6 text-[#FFC224]" />
                  </div>
                  <div className="flex-1 overflow-hidden pr-8">
                    <div className="font-bold text-sm truncate">{folder.name}</div>
                    <div className="text-xs text-gray-500 font-semibold">{folder.fileCount || 0} tài liệu</div>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteFolder(e, folder._id)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/folder:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border-[2px] border-transparent hover:border-red-200"
                    title="Xóa môn học"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1/3) - Activity & AI Status */}
        <div className="space-y-6">
          {/* Activity Log */}
          <div className="space-y-3">
            <div className="px-1">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">ACTIVITY LOG</div>
              <h3 className="text-lg font-black">Sự kiện gần đây</h3>
            </div>
            <div className={`bg-white border-[2px] ${foldersList.length === 0 ? 'border-dashed border-gray-300 p-8 flex flex-col items-center justify-center text-center min-h-[220px]' : 'border-black p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
              {foldersList.length === 0 ? (
                <p className="text-sm text-gray-400 font-semibold">
                  Chưa có hoạt động nào. Hãy kéo thả tài liệu để bắt đầu phân loại.
                </p>
              ) : (
                foldersList.slice(0, 4).map((folder: any) => (
                  <div key={folder._id} className="flex gap-4 items-start pb-4 border-b-2 border-gray-100 last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-[#3C73ED] mt-1.5 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-bold text-black mb-1">
                        Đã khởi tạo và đồng bộ thư mục "{folder.name}"
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                          {new Date(folder.updated_at || folder.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] font-black text-white bg-[#3C73ED] px-2 py-0.5 rounded-md">AI</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Status Widget */}
          <div className="bg-[#0B0B0B] border-[2px] border-black rounded-2xl p-6 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#35A76A] animate-pulse"></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI STATUS</span>
            </div>
            <p className="text-sm font-semibold text-gray-300 mb-6 leading-relaxed">
              Lớp ngữ nghĩa đang hoạt động. Hàng đợi xử lý: <span className="text-white font-bold">0 task</span>.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#1A1A1A] rounded-xl p-3 text-center border border-gray-800">
                <div className="text-sm font-black text-white">112MS</div>
                <div className="text-[9px] font-bold text-gray-500 uppercase mt-1">LATENCY</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-3 text-center border border-gray-800">
                <div className="text-sm font-black text-white">12.4K</div>
                <div className="text-[9px] font-bold text-gray-500 uppercase mt-1">TOKENS</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-3 text-center border border-gray-800">
                <div className="text-sm font-black text-[#35A76A]">99.98%</div>
                <div className="text-[9px] font-bold text-gray-500 uppercase mt-1">UPTIME</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
