"use client"

import { useState } from 'react'
import { FileText, ChevronDown, Check } from 'lucide-react'

const fid = (f: any) => f._id || f.id
const isImage = (f: any) => ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes((f.file_type || '').toLowerCase())

/**
 * Bảng chọn file để tạo phao/podcast. Mặc định chọn tất cả (= dùng cả folder).
 * Khi user bỏ chọn bớt → parent sẽ chỉ gửi các file đã chọn lên backend.
 * Chỉ hiện các file có text (bỏ ảnh vì không tạo được nội dung).
 */
export default function FileSelector({
  files,
  selectedIds,
  onChange,
  accent = '#3C73ED',
}: {
  files: any[]
  selectedIds: Set<string>
  onChange: (next: Set<string>) => void
  accent?: string
}) {
  const [open, setOpen] = useState(false)
  const textFiles = (files || []).filter(f => !isImage(f))
  if (textFiles.length < 2) return null // 0-1 file thì khỏi cần chọn

  const allSelected = textFiles.every(f => selectedIds.has(fid(f)))
  const count = textFiles.filter(f => selectedIds.has(fid(f))).length

  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }
  const selectAll = () => onChange(new Set(textFiles.map(fid)))
  const clearAll = () => onChange(new Set())

  const decode = (str: string) => {
    if (!str) return 'Tài liệu'
    try { return decodeURIComponent(str) } catch { return str }
  }

  return (
    <div className="bg-white border-[2px] border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 font-black text-sm text-left hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
          <span className="truncate">
            {allSelected
              ? `Tất cả tài liệu (${textFiles.length})`
              : `Đã chọn ${count}/${textFiles.length} tài liệu`}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t-[2px] border-black">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b-[2px] border-black">
            <button
              onClick={selectAll}
              className="text-xs font-black px-2.5 py-1 rounded-md border-[2px] border-black bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              Chọn tất cả
            </button>
            <button
              onClick={clearAll}
              className="text-xs font-black px-2.5 py-1 rounded-md border-[2px] border-black bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              Bỏ chọn
            </button>
            <span className="ml-auto text-[11px] font-bold text-gray-500">Chọn file để tạo</span>
          </div>
          <div className="max-h-56 overflow-y-auto p-2 space-y-1">
            {textFiles.map(f => {
              const id = fid(f)
              const checked = selectedIds.has(id)
              return (
                <button
                  key={id}
                  onClick={() => toggle(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border-[2px] font-bold text-sm text-left transition-all ${
                    checked
                      ? 'border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                      : 'border-transparent hover:border-gray-300 text-gray-500'
                  }`}
                  style={checked ? { backgroundColor: `${accent}1A` } : undefined}
                >
                  <span
                    className={`w-5 h-5 flex-shrink-0 rounded border-[2px] border-black flex items-center justify-center ${checked ? '' : 'bg-white'}`}
                    style={checked ? { backgroundColor: accent } : undefined}
                  >
                    {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{decode(f.original_name)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
