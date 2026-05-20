import { forwardRef } from 'react'
import { TEMPLATES } from './templates'
import 'katex/dist/katex.min.css'
import './cheatsheet.css'

const CheatSheetRenderer = forwardRef(function CheatSheetRenderer({ data, template, font }, ref) {
  const entry = TEMPLATES[template] || TEMPLATES['academic-blue']
  const Component = entry.Component

  return (
    <div className="cs-renderer-wrap" ref={ref}>
      <Component data={data} font={font} />
    </div>
  )
})

export default CheatSheetRenderer
