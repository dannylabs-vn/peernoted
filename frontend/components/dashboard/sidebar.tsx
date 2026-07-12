"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { LayoutDashboard, FolderOpen, LifeBuoy, Headphones, MessageSquare, Users, Repeat, Settings, Moon, Target, Gift, Stethoscope } from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: '01 Tổng quan', icon: LayoutDashboard },
  { href: '/dashboard/library', label: '02 Thư viện tri thức', icon: FolderOpen },
  { href: '/dashboard/cheatsheets', label: '03 Phao cứu cấp', icon: LifeBuoy },
  { href: '/dashboard/podcasts', label: '04 Podcast học tập', icon: Headphones },
  { href: '/dashboard/quiz', label: '05 Luyện Quiz', icon: Target },
  { href: '/dashboard/tutor', label: '06 Gia sư AI', icon: Stethoscope },
  { href: '/dashboard/forum', label: '07 Diễn đàn chia sẻ', icon: MessageSquare },
  { href: '/dashboard/rooms', label: '08 Phòng Học', icon: Users },
  { href: '/dashboard/rewards', label: '09 Cửa hàng PeerPoint', icon: Gift },
  { href: '/dashboard/settings', label: '10 Cài đặt', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadUser = () => {
        const cached = localStorage.getItem('user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch(e) {}
        } else {
          setUser(null);
        }
      };

      loadUser();
      window.addEventListener('storage', loadUser);
      return () => window.removeEventListener('storage', loadUser);
    }
  }, []);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <aside className="w-64 bg-white border-r-[3px] border-black flex flex-col h-full flex-shrink-0 z-20 shadow-[2px_0px_0px_0px_rgba(0,0,0,1)] relative">
      {/* Brand */}
      <div className="h-16 px-6 border-b-[3px] border-black flex items-center gap-3 bg-white">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
          <span className="font-black text-xl tracking-tight">PeerNoted</span>
          <span className="text-[#3C73ED] font-black text-[10px] ml-1 tracking-wider">V4.2</span>
        </Link>
      </div>

      <div className="px-6 pt-5 pb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">WORKSPACE</span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all ${
                isActive 
                  ? 'bg-[#3C73ED] text-white border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-black border-[2px] border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[13px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Storage */}
      <div className="p-4 border-t-[3px] border-black bg-white">
        {user ? (
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-[#FFC224] rounded-full flex items-center justify-center font-black text-black text-sm border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              {user.avatar_url || user.avatar ? (
                <img src={user.avatar_url || user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-[13px] truncate text-black">{user.name}</div>
              <div className="text-[10px] font-bold text-gray-500 truncate">{user.school || 'ĐH Bách Khoa TP.HCM'}</div>
            </div>
          </div>
        ) : null}
        
        {/* Storage */}
        <div className="bg-[#F8F9FA] rounded-xl p-3 mb-3 border-[2px] border-black">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-gray-600 uppercase">STORAGE</span>
            <span className="text-[10px] font-bold text-gray-500">
              {user ? (user.storage_used ? (user.storage_used / 1024 / 1024 / 1024).toFixed(2) : "0.00") : "0.00"} / 5 GB
            </span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden border border-black">
            <div 
              className="h-full bg-[#3C73ED] border-r border-black" 
              style={{ width: `${user ? (user.storage_used ? Math.min(100, (user.storage_used / (5 * 1024 * 1024 * 1024)) * 100) : 0) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Dark Mode Toggle */}
        <button className="w-full flex items-center gap-2 px-4 py-2 bg-white border-[2px] border-black rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <Moon className="w-4 h-4 text-[#FFC224] fill-[#FFC224]" strokeWidth={2} />
          Chế độ tối
        </button>
      </div>
    </aside>
  );
}
