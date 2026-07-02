"use client"

import { Mail } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface ServicesSectionProps {
  onWorkspaceClick?: () => void;
}

export function ServicesSection({ onWorkspaceClick }: ServicesSectionProps) {
  const services = [
    {
      title: "Phân loại thông minh",
      description: "Tự động phân loại tài liệu với AI, tạo thẻ và tổ chức thư viện kiến thức của bạn một cách khoa học.",
      image: "/images/feature-smart-sort.svg",
    },
    {
      title: "Study Podcast",
      description: "Chuyển đổi các tập tài liệu phức tạp thành podcast dễ nghe. Nghe và học mọi lúc mọi nơi với AI.",
      image: "/images/feature-podcast.svg",
    },
    {
      title: "Auto Cheat Sheets",
      description: "Tự động tóm tắt kiến thức trọng tâm thành các bảng tra cứu nhanh, công thức và sơ đồ tư duy.",
      image: "/images/feature-cheatsheet.svg",
    },
    {
      title: "Diễn đàn chia sẻ",
      description: "Nơi giao lưu, chia sẻ tài liệu và thảo luận các vấn đề học thuật với cộng đồng sinh viên toàn quốc.",
      image: "/images/feature-forum.svg",
    },
    {
      title: "Phòng học & Quiz",
      description: "Học nhóm trực tuyến, làm bài tập trắc nghiệm và thử thách bản thân với các bộ câu hỏi từ AI.",
      image: "/images/feature-quiz.svg",
    },
  ]

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-4xl md:text-[52px] md:leading-[60px] font-bold mb-4">
              Khám phá <span className="bg-[#FF4A60] text-white px-3 py-1 inline-block">tính năng cốt lõi</span>
            </h2>
            <p className="text-[#393939] text-base md:text-lg font-medium leading-relaxed md:leading-[30px] max-w-2xl mx-auto">
              Tất cả công cụ bạn cần để học tập hiệu quả, tổ chức kiến thức khoa học và chia sẻ cùng cộng đồng.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white border-[3px] border-black rounded-[32px] overflow-hidden hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 min-h-[480px] flex flex-col group cursor-pointer"
              >
                <div className="mb-6 -mx-[3px] -mt-[3px] overflow-hidden rounded-t-[29px]">
                  <Image
                    src={service.image || "/placeholder.svg"}
                    alt={service.title}
                    width={382}
                    height={328}
                    className="w-full h-auto rounded-t-[29px] group-hover:scale-110 transition-transform duration-500 ease-out"
                  />
                </div>
                <div className="px-8 pb-8 flex-1 flex flex-col">
                  <h3 className="text-[28px] leading-[40px] font-bold mb-3 text-[#0B0B0B]">{service.title}</h3>
                  <p className="text-[18px] leading-[30px] font-medium text-[#393939]">{service.description}</p>
                </div>
              </div>
            ))}

            <div className="bg-[#FFC224] border-[3px] border-black rounded-[32px] p-8 md:p-12 flex flex-col items-center justify-center text-center hover:translate-y-[-4px] transition-transform min-h-[480px] relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-8">
                <Image
                  src="/images/get-in-touch.svg"
                  alt="Mở workspace"
                  width={92}
                  height={92}
                  className="w-[92px] h-[92px]"
                />
              </div>
              <h3 className="text-[28px] leading-[40px] font-bold mb-4 text-[#0B0B0B]">Tham gia ngay</h3>
              <p className="text-[18px] leading-[30px] font-medium text-[#393939] mb-8">
                Đăng ký miễn phí để trải nghiệm toàn bộ tính năng và bắt đầu xây dựng bộ não thứ hai của bạn ngay hôm nay!
              </p>
              <Button onClick={onWorkspaceClick} className="bg-black text-white hover:bg-black/90 rounded-[16px] px-12 py-6 font-medium text-[18px] w-full max-w-[340px] h-[64px]">
                <Mail className="w-5 h-5 mr-2" />
                Mở workspace
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
