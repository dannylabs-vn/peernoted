"use client"

import { Mail, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeroSectionProps {
  onStartClick?: () => void;
  onContactClick?: () => void;
}

export function HeroSection({ onStartClick, onContactClick }: HeroSectionProps) {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-[34px] leading-[42px] sm:text-[42px] sm:leading-[50px] md:text-[72px] font-bold md:leading-[85px]">
            Nâng tầm <span className="bg-[#FF6B7A] text-white px-3 py-1 inline-block">tri thức</span> bằng{" "}
            <span className="bg-[#2F81F7] text-white px-3 py-1 inline-block">trí tuệ nhân tạo.</span>
          </h1>

          <p className="text-[#393939] text-[16px] md:text-[18px] font-medium leading-[28px] md:leading-[30px] max-w-xl">
            Hệ thống quản lý kiến thức cá nhân thông minh dành cho giới học thuật Việt Nam. Tự động phân loại tài liệu, tạo cheat sheet và chuyển đổi ghi chú thành podcast học tập.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-7 pt-4">
            <Button onClick={onStartClick} className="bg-[#0B0B0B] text-white hover:bg-black/90 rounded-lg py-5 px-8 md:py-[22px] md:px-[62px] text-base md:text-lg font-semibold h-auto w-full sm:w-auto sm:min-w-[240px]">
              <FolderOpen className="w-5 h-5 mr-2" />
              Bắt đầu miễn phí
            </Button>
            <Button
              variant="outline"
              onClick={onContactClick}
              className="bg-white border-[3px] border-black hover:bg-gray-50 rounded-lg py-5 px-8 md:py-[22px] md:px-[62px] text-base md:text-lg font-semibold h-auto w-full sm:w-auto sm:min-w-[240px]"
            >
              <Mail className="w-5 h-5 mr-2" />
              Liên hệ kinh doanh
            </Button>
          </div>
        </div>

        <div className="flex justify-center md:justify-end group cursor-pointer">
          <div className="relative w-full max-w-md aspect-square bg-white border-4 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 group-hover:-translate-y-4 group-hover:shadow-[12px_16px_0px_0px_rgba(0,0,0,1)]">
            <img
              src="/logo.png"
              alt="PeerNoted Project Logo"
              className="w-full h-full object-contain p-8 transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
