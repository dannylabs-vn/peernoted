"use client"

import { useMemo, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

// Google palette cho các nhánh cấp 1 (mỗi nhánh 1 màu, con cháu thừa hưởng)
const BRANCH_COLORS = ['#4285F4', '#EA4335', '#34A853', '#FBBC05', '#9B51E0', '#FF6D01', '#00ACC1', '#EC407A']
const ROOT_COLOR = '#6366F1'

// Bán kính theo độ sâu (px tính từ tâm)
function radiusFor(depth: number) {
  const R = [0, 240, 440, 610, 760]
  return depth < R.length ? R[depth] : 760 + (depth - (R.length - 1)) * 150
}

function textColorFor(bg: string) {
  return bg === '#FBBC05' ? '#000000' : '#FFFFFF'
}

type RawNode = { label?: any; children?: any[] }
type PNode = {
  label: string
  depth: number
  x: number
  y: number
  color: string
  children: PNode[]
}

function countLeaves(n: RawNode): number {
  const ch = Array.isArray(n?.children) ? n.children.filter(Boolean) : []
  if (ch.length === 0) return 1
  return ch.reduce((s, c) => s + countLeaves(c), 0)
}

// Bố cục toả tròn (radial tree): tâm là gốc, các nhánh xoè đều quanh tâm,
// mỗi nhánh chiếm 1 cung tỉ lệ với số lá của nó → không chồng lấn.
function buildLayout(node: RawNode, depth: number, a0: number, a1: number, color: string): PNode {
  const angle = (a0 + a1) / 2
  const r = radiusFor(depth)
  const x = Math.cos(angle) * r
  const y = Math.sin(angle) * r

  const rawChildren = Array.isArray(node?.children) ? node.children.filter(Boolean) : []
  const total = rawChildren.reduce((s, c) => s + countLeaves(c), 0) || 1
  let cur = a0
  const children: PNode[] = rawChildren.map((c, i) => {
    const frac = countLeaves(c) / total
    const span = (a1 - a0) * frac
    const childColor = depth === 0 ? BRANCH_COLORS[i % BRANCH_COLORS.length] : color
    const p = buildLayout(c, depth + 1, cur, cur + span, childColor)
    cur += span
    return p
  })

  const label = typeof node?.label === 'string' ? node.label : String(node?.label ?? '')
  return { label, depth, x, y, color: depth === 0 ? ROOT_COLOR : color, children }
}

function flatten(node: PNode, out: PNode[] = []): PNode[] {
  out.push(node)
  node.children.forEach(c => flatten(c, out))
  return out
}

// Các cạnh nối (parent → child) để vẽ SVG
function edges(node: PNode, out: { from: PNode; to: PNode }[] = []) {
  node.children.forEach(c => {
    out.push({ from: node, to: c })
    edges(c, out)
  })
  return out
}

function NodePill({ node }: { node: PNode }) {
  const { depth, color, label } = node
  if (depth === 0) {
    return (
      <div
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-base md:text-lg text-center"
        style={{ backgroundColor: ROOT_COLOR, color: '#FFFFFF', maxWidth: 220 }}
      >
        <span aria-hidden>🧠</span>
        <span className="break-words">{label}</span>
      </div>
    )
  }
  if (depth === 1) {
    return (
      <div
        className="inline-flex items-center px-4 py-2 rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black text-sm text-center break-words"
        style={{ backgroundColor: color, color: textColorFor(color), maxWidth: 180 }}
      >
        {label}
      </div>
    )
  }
  if (depth === 2) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-xs bg-white text-black text-center break-words"
        style={{ maxWidth: 160 }}
      >
        <span className="inline-block w-2 h-2 rounded-full border border-black shrink-0" style={{ backgroundColor: color }} />
        <span className="break-words">{label}</span>
      </div>
    )
  }
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-[2px] border-black bg-white text-black/80 font-semibold text-[11px] text-center break-words"
      style={{ maxWidth: 150 }}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="break-words">{label}</span>
    </div>
  )
}

export default function MindmapView({ data }: { data: any }) {
  const [zoom, setZoom] = useState(1)
  const root = data?.root
  const title = data?.title || 'Sơ đồ tư duy'

  const layout = useMemo(() => {
    if (!root) return null
    // Bắt đầu từ đỉnh (-90°) và quét trọn vòng tròn
    const tree = buildLayout(root, 0, -Math.PI / 2, (3 * Math.PI) / 2, ROOT_COLOR)
    const nodes = flatten(tree)
    const links = edges(tree)

    const PAD = 150
    const xs = nodes.map(n => n.x)
    const ys = nodes.map(n => n.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const width = maxX - minX + PAD * 2
    const height = maxY - minY + PAD * 2
    const ox = -minX + PAD
    const oy = -minY + PAD
    return { nodes, links, width, height, ox, oy }
  }, [root])

  if (!root || !layout) {
    return (
      <div className="py-10 text-center font-bold text-black/60">
        Không có dữ liệu sơ đồ tư duy.
      </div>
    )
  }

  const { nodes, links, width, height, ox, oy } = layout
  const sx = (n: PNode) => n.x + ox
  const sy = (n: PNode) => n.y + oy

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-black text-black min-w-0">
          <span aria-hidden>🧠</span>
          <span className="truncate">{title}</span>
        </h2>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setZoom(z => Math.max(0.4, +(z - 0.15).toFixed(2)))}
            className="p-2 rounded-lg border-[2px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-none transition-all"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-black w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(2, +(z + 0.15).toFixed(2)))}
            className="p-2 rounded-lg border-[2px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-none transition-all"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-2 rounded-lg border-[2px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-none transition-all"
            title="Về 100%"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas cuộn được — nền chấm bi kiểu Obsidian */}
      <div
        className="relative overflow-auto rounded-2xl border-[3px] border-black bg-[#FAFAFA]"
        style={{
          maxHeight: '65vh',
          backgroundImage: 'radial-gradient(#00000014 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div style={{ width: width * zoom, height: height * zoom }}>
          <div style={{ width, height, transform: `scale(${zoom})`, transformOrigin: 'top left', position: 'relative' }}>
            {/* Cạnh nối */}
            <svg width={width} height={height} className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
              {links.map((e, i) => (
                <line
                  key={i}
                  x1={sx(e.from)} y1={sy(e.from)}
                  x2={sx(e.to)} y2={sy(e.to)}
                  stroke={e.to.color}
                  strokeWidth={e.to.depth <= 1 ? 3 : e.to.depth === 2 ? 2 : 1.5}
                  strokeOpacity={0.55}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {/* Nút */}
            {nodes.map((n, i) => (
              <div
                key={i}
                className="absolute"
                style={{ left: sx(n), top: sy(n), transform: 'translate(-50%, -50%)' }}
              >
                <NodePill node={n} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] font-semibold text-black/50 text-center">
        Kéo thanh cuộn để xem toàn bộ • dùng nút +/− để phóng to thu nhỏ
      </p>
    </div>
  )
}
