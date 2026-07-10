"use client"

// Google palette dùng cho các nhánh cấp 1 (xoay vòng)
const BRANCH_COLORS = ['#4285F4', '#EA4335', '#34A853', '#FBBC05']
const ROOT_COLOR = '#6366F1' // tím/indigo cho nút trung tâm

// Chữ vàng cần chữ đen để đọc rõ, còn lại dùng chữ trắng
function textColorFor(bg: string) {
  return bg === '#FBBC05' ? '#000000' : '#FFFFFF'
}

function NodePill({ label, depth, color }: { label: string; depth: number; color: string }) {
  if (depth === 0) {
    return (
      <div
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-lg md:text-xl"
        style={{ backgroundColor: ROOT_COLOR, color: '#FFFFFF' }}
      >
        <span aria-hidden>🧠</span>
        <span>{label}</span>
      </div>
    )
  }

  if (depth === 1) {
    return (
      <div
        className="inline-flex items-center px-4 py-2 rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-sm md:text-base"
        style={{ backgroundColor: color, color: textColorFor(color) }}
      >
        {label}
      </div>
    )
  }

  if (depth === 2) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-xs md:text-sm bg-white text-black">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full border border-black shrink-0"
          style={{ backgroundColor: color }}
        />
        <span>{label}</span>
      </div>
    )
  }

  // depth >= 3 → gạch đầu dòng nhỏ
  return (
    <div className="flex items-start gap-2 text-xs md:text-sm font-medium text-black/80">
      <span className="mt-[2px] leading-none" style={{ color }}>
        ●
      </span>
      <span>{label}</span>
    </div>
  )
}

function Node({ node, depth, colorIndex }: { node: any; depth: number; colorIndex: number }) {
  if (!node) return null

  const children = Array.isArray(node.children) ? node.children.filter(Boolean) : []
  const color = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length]
  const label = typeof node.label === 'string' ? node.label : String(node.label ?? '')

  return (
    <div className="relative">
      <NodePill label={label} depth={depth} color={color} />

      {children.length > 0 && (
        <div className="ml-6 mt-3 space-y-3 border-l-[3px] border-black pl-5">
          {children.map((child: any, i: number) => (
            <Node
              key={i}
              node={child}
              depth={depth + 1}
              // Ở gốc: mỗi nhánh cấp 1 nhận 1 màu riêng, rồi truyền màu đó cho con cháu
              colorIndex={depth === 0 ? i : colorIndex}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MindmapView({ data }: { data: any }) {
  const root = data?.root
  const title = data?.title || 'Sơ đồ tư duy'

  if (!root) {
    return (
      <div className="py-10 text-center font-bold text-black/60">
        Không có dữ liệu sơ đồ tư duy.
      </div>
    )
  }

  return (
    <div className="min-w-fit">
      <h2 className="mb-6 flex items-center gap-2 text-2xl md:text-3xl font-black text-black">
        <span aria-hidden>🧠</span>
        <span>{title}</span>
      </h2>
      <Node node={root} depth={0} colorIndex={0} />
    </div>
  )
}
