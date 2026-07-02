export function LogoMarquee() {
  const items = [
    { logo: "/logos/harvard.svg", alt: "Harvard" },
    { logo: "/logos/oxford.svg", alt: "Oxford" },
    { logo: "/logos/due.png", alt: "DUE" },
    { logo: "/logos/dut.png", alt: "DUT" },
    { logo: "/logos/fpt.png", alt: "FPT" },
    { logo: "/logos/ftu.png", alt: "FTU" },
    { logo: "/logos/hcmiu.png", alt: "HCMIU" },
    { logo: "/logos/hcmut.png", alt: "HCMUT" },
    { logo: "/logos/hcmute.png", alt: "HCMUTE" },
    { logo: "/logos/hiu.png", alt: "HIU" },
    { logo: "/logos/hus.png", alt: "HUS" },
    { logo: "/logos/hust.png", alt: "HUST" },
    { logo: "/logos/hutech.png", alt: "HUTECH" },
    { logo: "/logos/neu.png", alt: "NEU" },
    { logo: "/logos/ptit.png", alt: "PTIT" },
    { logo: "/logos/rmit.png", alt: "RMIT" },
    { logo: "/logos/tdtu.png", alt: "TDTU" },
    { logo: "/logos/uit.png", alt: "UIT" },
    { logo: "/logos/ussh.png", alt: "USSH" },
    { logo: "/logos/usth.png", alt: "USTH" },
    { logo: "/logos/vnuhcm.png", alt: "VNU-HCM" }
  ]

  return (
    <div className="w-full">
      <div className="relative overflow-hidden bg-[#EDEDED] border-y-[4px] border-black py-16 -rotate-[5deg] mt-32 mb-16 w-[150vw] -ml-[25vw]">
        <div className="flex items-center gap-16 animate-marquee whitespace-nowrap">
          {[...items, ...items, ...items, ...items].map((item, index) => (
            <img key={index} src={item.logo || "/placeholder.svg"} alt={item.alt} className="h-12 w-auto" />
          ))}
        </div>
      </div>
    </div>
  )
}
