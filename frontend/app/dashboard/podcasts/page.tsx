"use client"

import { useEffect, useState } from 'react';
import { getFolders } from '@/lib/api';
import Link from 'next/link';
import { Mic2, Headphones, PlayCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PodcastsPage() {
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const res = await getFolders();
      const filtered = (res.data || []).filter((f: any) => f.name.toLowerCase() !== 'hình ảnh');
      setFolders(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        <div className="flex items-center gap-2 text-[#9B51E0]">
          PODCAST HỌC TẬP - TTS ENGINE
        </div>
      </div>

      <div className="bg-[#9B51E0] border-[3px] border-black rounded-2xl p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white relative overflow-hidden mb-6">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 leading-tight" style={{ textShadow: "3px 3px 0px #000" }}>
            Biến tài liệu khô khan thành podcast sinh động
          </h2>
          <p className="text-lg font-bold bg-white text-black inline-block px-4 py-2 border-[2px] border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Học qua thính giác mọi lúc, mọi nơi!
          </p>
        </div>
      </div>

      {folders.length === 0 ? (
        <div className="bg-white border-[3px] border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <Headphones className="w-16 h-16 text-gray-300 mb-4" />
          <h4 className="text-xl font-black mb-2">Chưa có môn học nào</h4>
          <p className="text-gray-500 font-semibold mb-6">Hãy tải tài liệu lên thư viện để AI tự động chuyển thành Podcast.</p>
          <Link href="/dashboard" className="px-6 py-2 bg-[#0B0B0B] text-white font-bold rounded-xl text-sm border-2 border-black hover:bg-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
            Đi đến Thư viện
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {folders.map((folder, index) => {
            const hasPodcast = !!folder.podcast_audio_url;
            const colors = ['#3C73ED', '#EA4335', '#35A76A', '#FFC224', '#9B51E0'];
            const color = colors[index % colors.length];

            return (
              <div 
                key={folder._id} 
                onClick={() => router.push(`/dashboard/library?folder=${folder._id}&view=podcast`)}
                className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex cursor-pointer"
              >
                <div 
                  className="w-16 h-16 rounded-xl border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mr-5 flex-shrink-0"
                  style={{ backgroundColor: hasPodcast ? color : '#f3f4f6', color: hasPodcast ? '#fff' : '#9ca3af' }}
                >
                  <PlayCircle className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-1 border-[2px] border-black rounded-md truncate max-w-[150px]" style={{ color: color, borderColor: color, backgroundColor: `${color}1A` }}>
                      {folder.subject || 'MÔN HỌC'}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 border-[2px] border-black rounded-md flex-shrink-0 ${hasPodcast ? 'bg-[#35A76A] text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {hasPodcast ? 'SẴN SÀNG' : 'CHƯA TẠO'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black mb-1 truncate">{folder.name}</h3>
                  <p className="text-sm font-semibold text-gray-500 truncate">
                    {hasPodcast ? 'Đã tạo bởi MC Minh & Lan' : 'Nhấp vào để bắt đầu tổng hợp AI'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
