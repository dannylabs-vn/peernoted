"use client"

import { usePathname } from 'next/navigation';
import { Menu, Search, Bell, Plus } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  
  let pageTitle = 'Tổng quan';
  if (pathname.includes('/library')) pageTitle = 'Thư viện tri thức';
  else if (pathname.includes('/cheatsheets')) pageTitle = 'Phao cứu cấp';
  else if (pathname.includes('/podcasts')) pageTitle = 'Podcast học tập';
  else if (pathname.includes('/forum')) pageTitle = 'Diễn đàn chia sẻ';
  else if (pathname.includes('/rooms')) pageTitle = 'Phòng Học';
  else if (pathname.includes('/spaced-repetition')) pageTitle = 'Ôn tập';
  else if (pathname.includes('/settings')) pageTitle = 'Cài đặt';

  return (
    <header className="h-16 bg-white border-b-[3px] border-black flex items-center justify-between px-6 flex-shrink-0 relative z-10 shadow-[0px_2px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 bg-white border-[2px] border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <Menu className="w-5 h-5" strokeWidth={2.5} />
        </button>
        
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
            WORKSPACE / {pageTitle.toUpperCase()}
          </div>
          <h1 className="text-lg font-black">{pageTitle}</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center border-[2px] border-black rounded-xl px-3 py-1.5 bg-[#F8F9FA]">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Tìm tài liệu, môn học..." 
            className="bg-transparent border-none outline-none text-sm w-48 font-bold placeholder-gray-400 text-black"
          />
          <div className="flex items-center justify-center bg-white border-[2px] border-black rounded-lg px-1.5 py-0.5 ml-2 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[10px] font-black">⌘K</span>
          </div>
        </div>

        {/* Notifications */}
        <button className="p-2 border-[2px] border-black rounded-xl bg-white hover:bg-gray-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <Bell className="w-4 h-4" />
        </button>

        {/* Action Button */}
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0B0B0B] text-white border-[2px] border-black rounded-xl font-bold text-sm hover:bg-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all">
          <Plus className="w-4 h-4" strokeWidth={3} />
          Tải tài liệu
        </button>
      </div>
    </header>
  );
}
