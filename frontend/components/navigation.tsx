"use client"

import { Mail, ChevronDown } from "lucide-react"
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

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 pt-8 pb-4">
      <nav className="flex items-center justify-between bg-white border-4 border-black rounded-xl px-5 py-3 max-w-4xl mx-auto shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        {/* Spacer to balance the Mail button on the right */}
        <div className="w-[48px] h-12 flex-shrink-0"></div>

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
    </div>
  )
}
