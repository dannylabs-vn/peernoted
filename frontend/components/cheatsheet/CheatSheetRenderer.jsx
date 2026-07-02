import { forwardRef, useMemo } from 'react'
import { TEMPLATES } from './templates'
import 'katex/dist/katex.min.css'
import './cheatsheet.css'

// OpenAI sometimes returns Vietnamese in NFD form (decomposed: base char +
// combining accent), which renders as a floating mark on fonts that lack good
// combining-mark support (Georgia, Times, etc). Normalize to NFC so accents
// stay glued to the base character.
function nfc(s) {
  return typeof s === 'string' ? s.normalize('NFC') : s
}

function normalizeData(data) {
  if (!data) return data
  return {
    title: nfc(data.title),
    sections: (data.sections || []).map(s => ({
      heading: nfc(s.heading),
      blocks: (s.blocks || []).map(b => ({
        ...b,
        content: nfc(b.content),
        term: nfc(b.term),
        caption: nfc(b.caption),
        items: Array.isArray(b.items) ? b.items.map(nfc) : b.items
      }))
    }))
  }
}

const CheatSheetRenderer = forwardRef(function CheatSheetRenderer({ data, template, font }, ref) {
  const entry = TEMPLATES[template] || TEMPLATES['neo-brutalism']
  const Component = entry.Component

  const normalized = useMemo(() => normalizeData(data), [data])

  return (
    <div className="cs-renderer-wrap" ref={ref}>
      <Component data={normalized} font={font} />
    </div>
  )
})

export default CheatSheetRenderer
