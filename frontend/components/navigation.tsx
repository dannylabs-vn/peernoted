"use client"

import { Mail, ChevronDown, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useState } from "react"

interface NavigationProps {
  onLoginClick?: () => void;
  onWorkspaceClick?: () => void;
  onHomeClick?: () => void;
}

export function Navigation({ onLoginClick, onWorkspaceClick, onHomeClick }: NavigationProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 pt-8 pb-4">
      <div className="relative max-w-4xl mx-auto">
        <nav className="flex items-center justify-between bg-white border-4 border-black rounded-xl px-4 sm:px-5 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          {/* Hamburger on mobile, spacer (to balance the Mail button) on desktop */}
          <div className="w-[48px] h-12 flex-shrink-0 flex items-center">
            <button
              type="button"
              aria-label="Mở menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-12 h-12 -ml-1 rounded-lg hover:bg-[#EDEDED] transition-colors"
            >
              {isMenuOpen ? <X className="w-7 h-7" strokeWidth={2.5} /> : <Menu className="w-7 h-7" strokeWidth={2.5} />}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 flex-1 justify-center">
            <a href="#home" onClick={(e) => e.preventDefault()} className="whitespace-nowrap text-[18px] font-bold leading-[20px] px-4 py-2 rounded-xl hover:bg-[#EDEDED] hover:-translate-y-1 transition-all duration-200">
              Giải pháp
            </a>
            <a href="#about" onClick={(e) => e.preventDefault()} className="whitespace-nowrap text-[18px] font-bold leading-[20px] px-4 py-2 rounded-xl hover:bg-[#EDEDED] hover:-translate-y-1 transition-all duration-200">
              Tài liệu kỹ thuật
            </a>
            <a href="#portfolio" onClick={(e) => e.preventDefault()} className="whitespace-nowrap text-[18px] font-bold leading-[20px] px-4 py-2 rounded-xl hover:bg-[#EDEDED] hover:-translate-y-1 transition-all duration-200">
              Bảo mật
            </a>
            <button className="flex items-center gap-1 whitespace-nowrap text-[18px] font-bold leading-[20px] px-4 py-2 rounded-xl hover:bg-[#EDEDED] hover:-translate-y-1 transition-all duration-200">
              Bảng giá
              <ChevronDown className="w-4 h-4" />
            </button>
            <Link href={isAuthenticated ? "/dashboard" : "/login"} className="whitespace-nowrap text-[18px] font-bold leading-[20px] px-4 py-2 rounded-xl hover:bg-[#FDB927] border-2 border-transparent hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200">
              {isAuthenticated ? "Vào ứng dụng" : "Đăng nhập"}
            </Link>
          </div>

          <Button onClick={onWorkspaceClick} className="bg-black text-white hover:bg-black/90 rounded-sm px-5 h-12 min-w-[48px] flex-shrink-0">
            <Mail className="w-10 h-10" strokeWidth={2.5} />
          </Button>
        </nav>

        {/* Mobile dropdown menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute left-0 right-0 top-full mt-3 z-50 bg-white border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-3 flex flex-col gap-1">
            <a href="#home" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); }} className="text-[18px] font-bold px-4 py-3 rounded-xl hover:bg-[#EDEDED] transition-colors">
              Giải pháp
            </a>
            <a href="#about" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); }} className="text-[18px] font-bold px-4 py-3 rounded-xl hover:bg-[#EDEDED] transition-colors">
              Tài liệu kỹ thuật
            </a>
            <a href="#portfolio" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); }} className="text-[18px] font-bold px-4 py-3 rounded-xl hover:bg-[#EDEDED] transition-colors">
              Bảo mật
            </a>
            <button onClick={() => setIsMenuOpen(false)} className="flex items-center gap-1 text-[18px] font-bold px-4 py-3 rounded-xl hover:bg-[#EDEDED] transition-colors text-left">
              Bảng giá
              <ChevronDown className="w-4 h-4" />
            </button>
            <Link href={isAuthenticated ? "/dashboard" : "/login"} onClick={() => setIsMenuOpen(false)} className="text-[18px] font-bold px-4 py-3 rounded-xl border-2 border-black bg-[#FDB927] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mt-1">
              {isAuthenticated ? "Vào ứng dụng" : "Đăng nhập"}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
