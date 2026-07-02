import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import { LogoMarquee } from "@/components/logo-marquee"
import { ServicesSection } from "@/components/services-section"
import { AboutSection } from "@/components/about-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PeerNoted | Trang chủ",
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <LogoMarquee />
      <ServicesSection />
      <AboutSection />
      <div className="w-full border-t-[4px] border-black"></div>
      <TestimonialsSection />
      <Footer />
    </main>
  )
}
