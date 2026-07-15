"use client"

import Image from "next/image"

export function TestimonialsSection() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 pt-4 md:pt-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-[1.3]">
            Hàng ngàn sinh viên nói gì
            <br />
            về <span className="bg-[#2F81F7] text-white px-3 py-1 inline-block">PeerNoted?</span>
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto pb-8">
            Những chia sẻ chân thực từ cộng đồng sinh viên đã trải nghiệm và thay đổi cách học với PeerNoted.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="relative">
            <div className="bg-white border-4 border-black rounded-3xl py-8 md:py-14 px-6 md:px-8">
              <div className="absolute -top-6 md:-top-8 left-6 md:left-8 w-12 h-12 md:w-16 md:h-16">
                <Image
                  src="/images/633b1c81e34cfb82b85454eb-quote-s.png"
                  alt="Quote"
                  width={64}
                  height={64}
                  className="w-full h-full"
                />
              </div>

              <div>
                <p className="text-sm md:text-base lg:text-lg mb-6 leading-relaxed font-medium">
                  "PeerNoted thực sự đã cứu vớt những đêm ôn thi của mình. Tính năng Auto Cheat Sheets và Study Podcast siêu đỉnh, giúp mình tiết kiệm hàng giờ đọc tài liệu và có thể học ôn mọi lúc mọi nơi. Đây chính là 'bộ não thứ hai' mà sinh viên nào cũng cần!"
                </p>

                <div>
                  <div className="font-bold text-base md:text-lg">Nguyễn Trần Minh Anh</div>
                  <div className="text-gray-600 text-sm md:text-base">Sinh viên trường Đại học Bách Khoa TP.HCM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
