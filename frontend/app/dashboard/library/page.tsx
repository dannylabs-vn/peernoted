"use client"

import { useEffect, useState, useRef, Suspense } from 'react';
import { getFolders, getFiles, uploadFiles, createFolder, generateFileCheatSheet } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Folder, FileText, ChevronRight, Download, Eye, Trash2, Clock, Hash, Tag, List, LayoutGrid, Image as ImageIcon, Upload, UploadCloud, FolderPlus, X, Loader2, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const CheatSheet = dynamic(() => import('@/components/CheatSheet'), {
  ssr: false,
});
const CheatSheetRenderer: any = dynamic(() => import('@/components/cheatsheet/CheatSheetRenderer'), {
  ssr: false,
});
import AudioPlayer from '@/components/AudioPlayer';
import { resolveFileUrl } from '@/lib/fileUrl';

function LibraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const folderId = searchParams.get('folder');

  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'files'|'cheatsheet'|'podcast'>('files');
  const [layoutMode, setLayoutMode] = useState<'list'|'grid'>('list');

  // Manual (Google-Drive-style) file management
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderSubject, setNewFolderSubject] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [toast, setToast] = useState<{ type: 'success'|'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ===== PER-FILE CHEAT SHEET (Phao cho từng file) =====
  const [cheatFile, setCheatFile] = useState<{ id: string; name: string } | null>(null);
  const [cheatLoading, setCheatLoading] = useState(false);
  const [cheatError, setCheatError] = useState<string | null>(null);
  const [cheatCache, setCheatCache] = useState<Record<string, any>>({});

  const showToast = (type: 'success'|'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const v = searchParams.get('view');
    if (v === 'cheatsheet') setView('cheatsheet');
    else if (v === 'podcast') setView('podcast');
  }, [searchParams]);

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (folderId) {
      fetchFiles(folderId);
    } else {
      setFiles([]);
    }
  }, [folderId]);

  const fetchFolders = async () => {
    try {
      const res = await getFolders();
      setFolders(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa môn học này? Mọi tài liệu bên trong sẽ bị xóa vĩnh viễn!')) return;
    try {
      const { deleteFolder } = await import('@/lib/api');
      await deleteFolder(id);
      if (folderId === id) {
        router.push('/dashboard/library');
      }
      setSelectedFolderIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      await fetchFolders();
    } catch (err) {
      console.error(err);
      alert('Không thể xóa môn học lúc này');
    }
  };

  const handleRenameFolder = async (e: React.MouseEvent, id: string, currentName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newName = prompt('Nhập tên mới cho thư mục này:', currentName);
    if (!newName || newName.trim() === '' || newName === currentName) return;
    
    try {
      const { updateFolder } = await import('@/lib/api');
      await updateFolder(id, { name: newName.trim() });
      await fetchFolders();
    } catch (err) {
      console.error(err);
      alert('Không thể đổi tên môn học lúc này');
    }
  };

  const handleDeleteFile = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
    try {
      const { deleteFile } = await import('@/lib/api');
      await deleteFile(id);
      if (folderId) {
        await fetchFiles(folderId);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể xóa tài liệu lúc này');
    }
  };

  const handleBatchDeleteFolders = async () => {
    if (selectedFolderIds.size === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selectedFolderIds.size} môn học đã chọn? Mọi tài liệu bên trong sẽ bị xóa vĩnh viễn!`)) return;
    try {
      const { deleteFolders } = await import('@/lib/api');
      await deleteFolders(Array.from(selectedFolderIds));
      if (folderId && selectedFolderIds.has(folderId)) {
        router.push('/dashboard/library');
      }
      setSelectedFolderIds(new Set());
      await fetchFolders();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa nhiều môn học');
    }
  };

  const toggleFolderSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchFiles = async (id: string) => {
    setFilesLoading(true);
    try {
      const res = await getFiles(id);
      setFiles(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFilesLoading(false);
    }
  };

  // ===== PER-FILE CHEAT SHEET HANDLERS =====
  const openFileCheatSheet = async (id: string, name: string, force = false) => {
    setCheatFile({ id, name });
    setCheatError(null);
    // Dùng lại kết quả đã cache nếu có (trừ khi bấm "Tạo lại")
    if (!force && cheatCache[id]) {
      setCheatLoading(false);
      return;
    }
    setCheatLoading(true);
    try {
      const res = await generateFileCheatSheet(id);
      setCheatCache(prev => ({ ...prev, [id]: res.json }));
    } catch (err: any) {
      setCheatError(
        err?.response?.data?.error || err?.message || null
      );
    } finally {
      setCheatLoading(false);
    }
  };

  const regenerateFileCheatSheet = () => {
    if (!cheatFile) return;
    const { id, name } = cheatFile;
    setCheatCache(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    openFileCheatSheet(id, name, true);
  };

  // ===== MANUAL UPLOAD (Google-Drive-style) =====
  const handleManualUpload = async (fileList: FileList | File[] | null) => {
    if (!folderId) {
      showToast('error', 'Vui lòng chọn một thư mục trước khi tải lên');
      return;
    }
    const selected = fileList ? Array.from(fileList) : [];
    if (selected.length === 0) return;
    setUploading(true);
    try {
      await uploadFiles(folderId, selected);
      await fetchFiles(folderId);
      await fetchFolders();
      showToast('success', `Đã tải lên ${selected.length} file thành công!`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Tải lên thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleManualUpload(e.target.files);
  };

  // ===== CREATE FOLDER (empty, manual) =====
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const res = await createFolder({ name, subject: newFolderSubject.trim() || undefined });
      const created = res.data;
      await fetchFolders();
      setShowCreateFolder(false);
      setNewFolderName('');
      setNewFolderSubject('');
      showToast('success', 'Đã tạo thư mục mới!');
      const newId = created?._id || created?.id;
      if (newId) router.push(`/dashboard/library?folder=${newId}`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Không thể tạo thư mục. Vui lòng thử lại.');
    } finally {
      setCreatingFolder(false);
    }
  };

  // ===== DRAG & DROP =====
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!folderId || uploading) return;
    if (!dragOver) setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!folderId) return;
    const dropped = e.dataTransfer?.files;
    if (dropped && dropped.length > 0) handleManualUpload(dropped);
  };

  const decodeFilename = (str: string) => {
    if (!str) return '';
    try { return decodeURIComponent(str); } catch(e) { return str; }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getTagColor = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes('bài giảng') || t.includes('slide')) return 'bg-[#E8F0FE] text-[#3C73ED] border-[#3C73ED]';
    if (t.includes('đề thi') || t.includes('quiz')) return 'bg-[#FCE8E8] text-[#EA4335] border-[#EA4335]';
    if (t.includes('bài tập')) return 'bg-[#E6F4EA] text-[#34A853] border-[#34A853]';
    if (t.includes('tóm tắt')) return 'bg-[#FFF8E1] text-[#FBBC04] border-[#FBBC04]';
    return 'bg-white text-gray-800 border-black';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-[4px] border-black border-t-[#3C73ED] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-auto md:h-[calc(100vh-120px)]">
      {/* Left Column: Folders */}
      <div className="w-full md:w-72 max-w-full max-h-[45vh] md:max-h-none bg-white border-[3px] border-black rounded-2xl flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex-shrink-0">
        <div className="p-4 border-b-[3px] border-black bg-[#FFC224] flex justify-between items-center gap-2">
          <h2 className="font-black text-lg">Thư mục của bạn</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {selectedFolderIds.size > 0 && (
              <button
                onClick={handleBatchDeleteFolders}
                className="text-xs font-bold bg-[#EA4335] text-white px-2 py-1 rounded-md border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-all hover:-translate-y-[1px]"
              >
                Xóa ({selectedFolderIds.size})
              </button>
            )}
            <button
              onClick={() => setShowCreateFolder(true)}
              className="text-xs font-black bg-[#0B0B0B] text-white px-2.5 py-1.5 rounded-md border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] transition-all flex items-center gap-1 whitespace-nowrap"
              title="Tạo thư mục mới"
            >
              <FolderPlus className="w-3.5 h-3.5" /> Tạo
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {folders.length === 0 ? (
            <p className="text-center text-gray-500 font-semibold text-sm mt-4">Chưa có thư mục nào</p>
          ) : (
            folders.map((folder) => {
              const isActive = folderId === folder._id;
              const isSelected = selectedFolderIds.has(folder._id);
              return (
                <button
                  key={folder._id}
                  onClick={() => router.push(`/dashboard/library?folder=${folder._id}`)}
                  className={`w-full h-[52px] flex items-center justify-between p-3 rounded-xl border-[2px] font-bold text-sm transition-all text-left group/folder relative ${
                    isActive 
                      ? 'bg-[#0B0B0B] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]' 
                      : 'bg-white border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate pr-6">
                    <input 
                      type="checkbox" 
                      className={`w-4 h-4 flex-shrink-0 rounded-sm border-2 border-black focus:ring-0 ${isActive ? 'accent-white' : 'accent-[#0B0B0B]'}`}
                      checked={isSelected}
                      onClick={(e) => toggleFolderSelection(e, folder._id)}
                      onChange={() => {}}
                    />
                    <Folder className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#FFC224]' : 'text-gray-400'}`} />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                  
                  {/* Actions (only show on hover) */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/folder:opacity-100 flex items-center gap-1 z-10 bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-md border-[2px] border-black p-0.5">
                    <div 
                      onClick={(e) => handleRenameFolder(e, folder._id, folder.name)}
                      className="p-1.5 text-gray-400 hover:text-[#3C73ED] hover:bg-blue-50 rounded-sm transition-all"
                      title="Đổi tên"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </div>
                    <div 
                      onClick={(e) => handleDeleteFolder(e, folder._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-all"
                      title="Xóa môn học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Files & Tags */}
      <div
        className="flex-1 bg-white border-[3px] border-black rounded-2xl flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden min-h-[400px] relative"
        onDragOver={folderId ? handleDragOver : undefined}
        onDragLeave={folderId ? handleDragLeave : undefined}
        onDrop={folderId ? handleDrop : undefined}
      >
        {/* Drag & drop overlay */}
        {dragOver && folderId && (
          <div className="absolute inset-0 z-30 bg-[#3C73ED]/90 border-[4px] border-dashed border-white rounded-2xl flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-16 h-16 text-white mb-3 animate-bounce" />
            <p className="text-white font-black text-xl">Thả file để tải lên</p>
          </div>
        )}
        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 z-30 bg-white/85 flex flex-col items-center justify-center pointer-events-none">
            <Loader2 className="w-12 h-12 text-[#3C73ED] animate-spin mb-3" />
            <p className="font-black text-lg">Đang tải lên...</p>
          </div>
        )}
        {!folderId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Folder className="w-20 h-20 mb-4 opacity-20" />
            <h3 className="text-xl font-black text-black mb-2">Chưa chọn môn học</h3>
            <p className="font-semibold text-sm">Vui lòng chọn một môn học bên trái để xem tài liệu</p>
          </div>
        ) : (
          <>
            <div className="p-5 border-b-[3px] border-black bg-[#F8F9FA] flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="font-black text-xl mb-1">
                  {folders.find(f => f._id === folderId)?.name || 'Tài liệu môn học'}
                </h2>
                <p className="text-sm font-semibold text-gray-500">{files.length} tài liệu đã phân loại</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {view === 'files' && (
                  <div className="flex bg-white border-[2px] border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mr-1">
                    <button 
                      onClick={() => setLayoutMode('list')}
                      className={`p-2 transition-colors ${layoutMode === 'list' ? 'bg-[#3C73ED] text-white' : 'hover:bg-gray-100 text-gray-500'}`}
                      title="Danh sách"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <div className="w-[2px] bg-black"></div>
                    <button 
                      onClick={() => setLayoutMode('grid')}
                      className={`p-2 transition-colors ${layoutMode === 'grid' ? 'bg-[#3C73ED] text-white' : 'hover:bg-gray-100 text-gray-500'}`}
                      title="Lưới"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {folders.find(f => f._id === folderId)?.name !== 'Hình Ảnh' && (
                  <>
                    <button 
                      onClick={() => setView(view === 'podcast' ? 'files' : 'podcast')}
                      className={`px-3 sm:px-4 py-2 font-black rounded-xl text-sm border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${
                        view === 'podcast' ? 'bg-[#0B0B0B] text-white' : 'bg-[#9B51E0] text-white'
                      }`}
                    >
                      {view === 'podcast' ? '← File' : 'Podcast'}
                    </button>
                    <button 
                      onClick={() => setView(view === 'cheatsheet' ? 'files' : 'cheatsheet')}
                      className={`px-3 sm:px-4 py-2 font-black rounded-xl text-sm border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${
                        view === 'cheatsheet' ? 'bg-[#0B0B0B] text-white' : 'bg-[#FFC224] text-black'
                      }`}
                    >
                      {view === 'cheatsheet' ? '← File' : 'Phao Cứu Cấp'}
                    </button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Tải file trực tiếp vào thư mục này"
                  className="px-3 sm:px-4 py-2 bg-[#3C73ED] text-white font-black rounded-xl text-sm border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Tải lên</>
                  )}
                </button>
                <Link href="/dashboard" title="Dùng AI tự động phân loại file" className="hidden md:flex px-3 py-2 bg-white text-black font-bold rounded-xl text-sm border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all items-center gap-1">
                  ✨ AI phân loại
                </Link>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {view === 'podcast' ? (
                <AudioPlayer folderId={folderId} folderName={folders.find(f => f._id === folderId)?.name} files={files} />
              ) : view === 'cheatsheet' ? (
                <CheatSheet folderId={folderId} folderName={folders.find(f => f._id === folderId)?.name} files={files} />
              ) : filesLoading ? (
                <div className="flex justify-center mt-10">
                  <div className="w-8 h-8 border-[3px] border-black border-t-[#3C73ED] rounded-full animate-spin"></div>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center text-gray-500 font-semibold mt-10 border-[2px] border-dashed border-gray-300 p-10 rounded-xl">Thư mục này hiện chưa có file nào</div>
              ) : (
                <div className={layoutMode === 'list' ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"}>
                  {files.map((file) => (
                    layoutMode === 'list' ? (
                      // LIST VIEW
                      <div key={file._id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-white border-[2px] border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition-colors gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-[#FFC224]/20 border-[2px] border-[#FFC224] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FileText className="w-4 h-4 text-[#FFC224]" />
                          </div>
                          <div className="overflow-hidden">
                            <a href={resolveFileUrl(file.storage_url)} target="_blank" rel="noreferrer" className="font-bold text-sm truncate mb-0.5 hover:text-[#3C73ED] hover:underline block" title={decodeFilename(file.original_name)}>
                              {decodeFilename(file.original_name) || 'Tài liệu không tên'}
                            </a>
                            <div className="flex items-center gap-2 text-[10px] font-semibold text-gray-500">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDate(file.createdAt)}</span>
                              <span className="flex items-center gap-1"><Hash className="w-3 h-3"/> {formatSize(file.file_size)}</span>
                            </div>
                          </div>
                        </div>

                        {/* AI Tags Section */}
                        <div className="flex flex-wrap gap-2 md:w-1/3 justify-start md:justify-end">
                          {(file.ai_tags || []).map((tag: string, i: number) => {
                            const decodedTag = decodeFilename(tag);
                            const colorClass = getTagColor(decodedTag);
                            return (
                              <span 
                                key={i} 
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border-[2px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${colorClass}`}
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {decodedTag}
                              </span>
                            );
                          })}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openFileCheatSheet(file._id, decodeFilename(file.original_name) || 'Tài liệu'); }}
                            className="px-2.5 py-2 border-[2px] border-black rounded-lg bg-[#FBBC05] text-black font-black text-xs hover:bg-[#f5b400] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-[1px] active:shadow-none flex items-center gap-1 whitespace-nowrap"
                            title="Tạo phao (cheat sheet) cho file này"
                          >
                            📝 <span className="hidden sm:inline">Phao</span>
                          </button>
                          <a href={resolveFileUrl(file.storage_url)} target="_blank" rel="noreferrer" className="p-2 border-[2px] border-black rounded-lg bg-white hover:bg-gray-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-[1px] active:shadow-none" title="Xem">
                            <Eye className="w-4 h-4" />
                          </a>
                          <a href={resolveFileUrl(file.storage_url)} target="_blank" rel="noreferrer" download className="p-2 border-[2px] border-black rounded-lg bg-[#0B0B0B] text-white hover:bg-[#1a1a1a] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-[1px] active:shadow-none" title="Tải xuống">
                            <Download className="w-4 h-4" />
                          </a>
                          <button onClick={(e) => handleDeleteFile(e, file._id)} className="p-2 border-[2px] border-black rounded-lg bg-[#EA4335] text-white hover:bg-red-600 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-[1px] active:shadow-none" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // GRID VIEW
                      <div key={file._id} className="group bg-white border-[2px] border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col h-[260px] relative">
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/90 backdrop-blur-sm p-1 rounded-lg border-[2px] border-black">
                           <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openFileCheatSheet(file._id, decodeFilename(file.original_name) || 'Tài liệu'); }} className="p-1 bg-[#FBBC05] hover:bg-[#f5b400] text-black rounded border-[2px] border-black" title="Tạo phao (cheat sheet) cho file này">
                             📝
                           </button>
                           <button onClick={(e) => handleDeleteFile(e, file._id)} className="p-1 hover:bg-red-100 text-red-500 rounded" title="Xóa">
                             <Trash2 className="w-4 h-4" />
                           </button>
                           <a href={resolveFileUrl(file.storage_url)} target="_blank" rel="noreferrer" download className="p-1 hover:bg-gray-200 rounded text-black" title="Tải xuống">
                             <Download className="w-4 h-4" />
                           </a>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 border-[2px] border-gray-200 rounded-lg mb-3 relative overflow-hidden group-hover:border-black transition-colors w-full">
                          {['png', 'jpg', 'jpeg', 'webp', 'gif'].includes((file.file_type || '').toLowerCase()) ? (
                            <img 
                              src={resolveFileUrl(file.storage_url)} 
                              alt={decodeFilename(file.original_name)}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <>
                              <div className="absolute top-0 w-full h-1 bg-[#FFC224]" />
                              <FileText className="w-12 h-12 text-gray-300 group-hover:text-[#FFC224] transition-colors" strokeWidth={1.5} />
                              <div className="mt-2 text-xs font-bold text-gray-400 uppercase">{file.file_type || 'FILE'}</div>
                            </>
                          )}
                        </div>
                        <a href={resolveFileUrl(file.storage_url)} target="_blank" rel="noreferrer" className="font-bold text-sm truncate w-full hover:text-[#3C73ED] hover:underline flex items-center gap-2" title={decodeFilename(file.original_name)}>
                          {['png', 'jpg', 'jpeg', 'webp', 'gif'].includes((file.file_type || '').toLowerCase()) ? (
                            <ImageIcon className="w-4 h-4 text-[#EA4335] flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-[#3C73ED] flex-shrink-0" />
                          )}
                          <span className="truncate">{decodeFilename(file.original_name) || 'Tài liệu không tên'}</span>
                        </a>
                        <div className="flex justify-between items-center w-full mt-2 text-[10px] text-gray-500 font-bold">
                           <span>{formatDate(file.createdAt)}</span>
                           <span>{formatSize(file.file_size)}</span>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openFileCheatSheet(file._id, decodeFilename(file.original_name) || 'Tài liệu'); }}
                          className="mt-2 w-full px-2 py-1.5 bg-[#FBBC05] text-black font-black text-xs rounded-lg border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center justify-center gap-1"
                          title="Tạo phao (cheat sheet) cho file này"
                        >
                          📝 Tạo phao
                        </button>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !creatingFolder && setShowCreateFolder(false)}
        >
          <div
            className="bg-white border-[3px] border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b-[3px] border-black bg-[#FFC224] flex justify-between items-center">
              <h3 className="font-black text-lg flex items-center gap-2">
                <FolderPlus className="w-5 h-5" /> Tạo thư mục mới
              </h3>
              <button
                onClick={() => setShowCreateFolder(false)}
                disabled={creatingFolder}
                className="p-1 hover:bg-black/10 rounded-lg transition-colors disabled:opacity-50"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
              <div>
                <label className="block font-black text-sm mb-1.5">
                  Tên thư mục <span className="text-[#EA4335]">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="VD: Toán 12, Vật Lý..."
                  className="w-full px-3 py-2.5 border-[2px] border-black rounded-xl font-semibold text-sm focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                />
              </div>
              <div>
                <label className="block font-black text-sm mb-1.5">Môn học (tùy chọn)</label>
                <input
                  type="text"
                  value={newFolderSubject}
                  onChange={(e) => setNewFolderSubject(e.target.value)}
                  placeholder="VD: Toán học"
                  className="w-full px-3 py-2.5 border-[2px] border-black rounded-xl font-semibold text-sm focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFolder(false)}
                  disabled={creatingFolder}
                  className="flex-1 px-4 py-2.5 bg-white text-black font-black rounded-xl text-sm border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="flex-1 px-4 py-2.5 bg-[#3C73ED] text-white font-black rounded-xl text-sm border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creatingFolder ? (<><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>) : 'Tạo thư mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Per-file Cheat Sheet Modal (Phao cho từng file) */}
      {cheatFile && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-2"
          onClick={() => setCheatFile(null)}
        >
          <div
            className="bg-white border-[3px] border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-4xl w-full mx-4 max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-[3px] border-black px-5 py-3 rounded-t-2xl bg-[#FBBC05]">
              <h3 className="flex items-center gap-2 font-black text-black text-lg min-w-0">
                <span aria-hidden>📝</span>
                <span className="truncate">Phao: {cheatFile.name}</span>
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={regenerateFileCheatSheet}
                  disabled={cheatLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-[2px] border-black bg-white text-black font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  🔄 Tạo lại
                </button>
                <button
                  onClick={() => setCheatFile(null)}
                  aria-label="Đóng"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-[2px] border-black bg-white text-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 md:p-6">
              {cheatLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <div
                    className="w-14 h-14 rounded-full border-[4px] border-black border-t-transparent animate-spin"
                    style={{ borderRightColor: '#FBBC05', borderBottomColor: '#FBBC05' }}
                  />
                  <p className="font-black text-black text-lg">AI đang tạo phao cho file {cheatFile.name}...</p>
                  <p className="font-medium text-black/60 text-sm">
                    Quá trình này có thể mất khoảng 10-20 giây.
                  </p>
                </div>
              ) : cheatCache[cheatFile.id] ? (
                <CheatSheetRenderer data={cheatCache[cheatFile.id]} template="academic-blue" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                  <span className="text-4xl" aria-hidden>😵</span>
                  <p className="font-black text-black text-lg">Không thể tạo phao cho file này</p>
                  <p className="max-w-md font-medium text-black/70 text-sm">
                    File này chưa có nội dung text (ảnh, hoặc tải trước bản cập nhật → tải lại file PDF/Word/TXT).
                  </p>
                  {cheatError && (
                    <p className="max-w-md font-medium text-black/50 text-xs">Chi tiết: {String(cheatError)}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <button
                      onClick={regenerateFileCheatSheet}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border-[3px] border-black text-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      style={{ backgroundColor: '#FBBC05' }}
                    >
                      🔄 Thử lại
                    </button>
                    <button
                      onClick={() => setCheatFile(null)}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border-[3px] border-black bg-white text-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] px-5 py-3 rounded-xl border-[3px] border-black font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 max-w-[calc(100vw-3rem)] ${
            toast.type === 'success' ? 'bg-[#34A853] text-white' : 'bg-[#EA4335] text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <X className="w-5 h-5 flex-shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <div className="max-w-[1400px] mx-auto h-full">
      <Suspense fallback={<div className="p-10 text-center font-bold">Đang tải thư viện...</div>}>
        <LibraryContent />
      </Suspense>
    </div>
  );
}
