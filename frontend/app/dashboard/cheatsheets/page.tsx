"use client"

import { useEffect, useState } from 'react';
import { getFolders } from '@/lib/api';
import Link from 'next/link';
import { LifeBuoy, FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CheatsheetsPage() {
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
        <div className="flex items-center gap-2 text-[#EA4335]">
          <LifeBuoy className="w-4 h-4" />
          CHEAT SHEETS - TỔNG HỢP KIẾN THỨC
        </div>
      </div>

      <div className="bg-[#EA4335] border-[3px] border-black rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white relative overflow-hidden mb-6">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight" style={{ textShadow: "3px 3px 0px #000" }}>
            Phao Cứu Cấp
          </h2>
          <p className="text-lg font-bold bg-white text-black inline-block px-4 py-2 border-[2px] border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Ôn tập siêu tốc trước giờ G!
          </p>
        </div>
      </div>

      {folders.length === 0 ? (
        <div className="bg-white border-[3px] border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <FileText className="w-16 h-16 text-gray-300 mb-4" />
          <h4 className="text-xl font-black mb-2">Chưa có môn học nào</h4>
          <p className="text-gray-500 font-semibold mb-6">Hãy tải tài liệu lên thư viện để AI tự động tạo phao cứu cấp.</p>
          <Link href="/dashboard" className="px-6 py-2 bg-[#0B0B0B] text-white font-bold rounded-xl text-sm border-2 border-black hover:bg-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
            Đi đến Thư viện
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {folders.map((folder, index) => {
            const hasCheatSheet = !!folder.cheat_sheet_json || !!folder.cheat_sheet_markdown;
            const colors = ['#3C73ED', '#EA4335', '#35A76A', '#FFC224', '#9B51E0'];
            const color = colors[index % colors.length];

            return (
              <div key={folder._id} className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black uppercase px-2 py-1 border-2 border-black rounded-md" style={{ color: color, borderColor: color, backgroundColor: `${color}1A` }}>
                    {folder.subject || 'MÔN HỌC'}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 border-2 border-black rounded-md ${hasCheatSheet ? 'bg-[#35A76A] text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {hasCheatSheet ? 'SẴN SÀNG' : 'CHƯA TẠO'}
                  </span>
                </div>
                <h3 className="text-xl font-black mb-4 flex-1">{folder.name}</h3>
                
                <button 
                  onClick={() => router.push(`/dashboard/library?folder=${folder._id}&view=cheatsheet`)}
                  className={`w-full flex justify-between items-center px-4 py-3 font-black rounded-xl text-sm border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${!hasCheatSheet ? 'bg-[#FFC224] text-black' : 'bg-[#0B0B0B] text-white'}`}
                >
                  {hasCheatSheet ? 'Xem Phao Cứu Cấp' : 'Tạo bằng AI'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
