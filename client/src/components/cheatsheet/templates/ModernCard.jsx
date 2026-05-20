import { renderLatex } from '../latex'

const ACCENTS = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

function Block({ block, accent }) {
  if (block.type === 'formula') {
    return (
      <div className="mc-block mc-formula" style={{ borderColor: accent }}>
        {block.caption && <div className="mc-caption" style={{ color: accent }}>{block.caption}</div>}
        <div className="mc-formula-body" dangerouslySetInnerHTML={{ __html: renderLatex(block.content, true) }} />
      </div>
    )
  }
  if (block.type === 'definition') {
    return (
      <div className="mc-block mc-definition">
        {block.term && <div className="mc-term" style={{ background: accent }}>{block.term}</div>}
        <div className="mc-def-content">{block.content}</div>
      </div>
    )
  }
  if (block.type === 'list') {
    return (
      <div className="mc-block mc-list">
        {block.content && <div className="mc-list-title" style={{ color: accent }}>{block.content}</div>}
        <ul>
          {(block.items || []).map((it, i) => <li key={i}><span className="mc-bullet" style={{ background: accent }} />{it}</li>)}
        </ul>
      </div>
    )
  }
  if (block.type === 'example') {
    return (
      <div className="mc-block mc-example">
        {block.caption && <div className="mc-caption" style={{ color: accent }}>{block.caption}</div>}
        <div className="mc-example-content">{block.content}</div>
      </div>
    )
  }
  return (
    <div className="mc-block mc-note" style={{ background: `${accent}15`, borderLeftColor: accent }}>
      <span className="mc-note-icon">💡</span>
      <span>{block.content}</span>
    </div>
  )
}

export default function ModernCard({ data }) {
  return (
    <div className="tpl-modern-card">
      <header className="mc-header">
        <h1>{data.title}</h1>
      </header>
      <div className="mc-grid">
        {data.sections.map((section, i) => {
          const accent = ACCENTS[i % ACCENTS.length]
          return (
            <section key={i} className="mc-section" style={{ '--mc-accent': accent }}>
              <h2 className="mc-section-heading" style={{ color: accent }}>{section.heading}</h2>
              <div className="mc-blocks">
                {section.blocks.map((b, j) => <Block key={j} block={b} accent={accent} />)}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
