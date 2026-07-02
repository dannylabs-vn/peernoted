import { renderLatex } from '../latex'

function Block({ block }) {
  if (block.type === 'formula') {
    return (
      <div className="cs-block cs-formula">
        {block.caption && <div className="cs-formula-caption">{block.caption}</div>}
        <div className="cs-formula-body" dangerouslySetInnerHTML={{ __html: renderLatex(block.content, true) }} />
      </div>
    )
  }
  if (block.type === 'definition') {
    return (
      <div className="cs-block cs-definition">
        {block.term && <span className="cs-term">{block.term}:</span>}{' '}
        <span className="cs-def-content">{block.content}</span>
      </div>
    )
  }
  if (block.type === 'list') {
    return (
      <div className="cs-block cs-list">
        {block.content && <div className="cs-list-title">{block.content}</div>}
        <ul>
          {(block.items || []).map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    )
  }
  if (block.type === 'example') {
    return (
      <div className="cs-block cs-example">
        {block.caption && <div className="cs-example-caption">{block.caption}</div>}
        <div className="cs-example-content">{block.content}</div>
      </div>
    )
  }
  return (
    <div className="cs-block cs-note">
      <span className="cs-note-icon">✦</span>
      <span>{block.content}</span>
    </div>
  )
}

export default function AcademicBlue({ data }) {
  return (
    <div className="tpl-academic-blue">
      <header className="tpl-header">
        <h1>{data.title}</h1>
      </header>
      <div className="tpl-columns">
        {data.sections.map((section, i) => (
          <section key={i} className="tpl-section">
            <h2 className="tpl-section-heading">{section.heading}</h2>
            <div className="tpl-blocks">
              {section.blocks.map((b, j) => <Block key={j} block={b} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
