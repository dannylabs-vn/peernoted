import { User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function AboutSection() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-32">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div className="flex justify-center">
          <div className="relative w-full max-w-lg aspect-square border-[4px] border-black rounded-full overflow-hidden bg-[#FF6B6B] shadow-[-8px_8px_0px_0px_rgba(0,0,0,1)]">
            <Image src="/images/student-confused.svg" alt="Confused student illustration" fill className="object-cover" />
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Xây dựng <span className="bg-[#2F81F7] text-white px-3 py-1 inline-block">bộ não thứ hai</span> cho sinh viên.
            </h2>
            <p className="text-gray-600 text-base md:text-lg leading-relaxed">
              PeerNoted không chỉ là một công cụ lưu trữ, mà là hệ thống quản lý tri thức cá nhân thông minh giúp bạn tối ưu hóa thời gian và khai phá tối đa tiềm năng học tập.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-5 h-5 bg-[#6366F1] border-2 border-black rounded-[5px] flex-shrink-0 mt-1"></div>
              <div>
                <h3 className="text-lg md:text-xl font-bold mb-2">Tiết kiệm 80% thời gian</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  AI tự động tóm tắt, trích xuất từ khóa và tạo podcast giúp bạn nạp kiến thức nhanh gấp 5 lần so với cách học truyền thống.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-5 h-5 bg-[#FF6B7A] border-2 border-black rounded-[5px] flex-shrink-0 mt-1"></div>
              <div>
                <h3 className="text-lg md:text-xl font-bold mb-2">Hỗ trợ đa định dạng</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Từ file PDF, Word, PowerPoint đến các video bài giảng dài hàng giờ, tất cả đều được AI của PeerNoted xử lý mượt mà.
                </p>
              </div>
            </div>
          </div>

          <Button className="bg-[#0B0B0B] text-white hover:bg-black/90 rounded-lg py-5 px-8 md:py-[22px] md:px-[62px] text-base md:text-lg font-semibold h-auto w-full sm:w-auto sm:min-w-[240px]">
            <User className="w-5 h-5 mr-2" />
            Trải nghiệm miễn phí
          </Button>
        </div>
      </div>
    </section>
  )
}
