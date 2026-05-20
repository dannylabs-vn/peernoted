import { renderLatex } from '../latex'

function Block({ block }) {
  if (block.type === 'formula') {
    return (
      <div className="mn-block mn-formula">
        {block.caption && <div className="mn-caption">— {block.caption}</div>}
        <div className="mn-formula-body" dangerouslySetInnerHTML={{ __html: renderLatex(block.content, true) }} />
      </div>
    )
  }
  if (block.type === 'definition') {
    return (
      <div className="mn-block mn-definition">
        {block.term && <strong className="mn-term">{block.term}.</strong>}{' '}
        <span>{block.content}</span>
      </div>
    )
  }
  if (block.type === 'list') {
    return (
      <div className="mn-block mn-list">
        {block.content && <div className="mn-list-title">{block.content}</div>}
        <ul>
          {(block.items || []).map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    )
  }
  if (block.type === 'example') {
    return (
      <div className="mn-block mn-example">
        {block.caption && <div className="mn-caption">— {block.caption}</div>}
        <div>{block.content}</div>
      </div>
    )
  }
  return (
    <div className="mn-block mn-note">
      <span className="mn-note-marker">·</span> {block.content}
    </div>
  )
}

export default function Minimalist({ data }) {
  return (
    <div className="tpl-minimalist">
      <header className="mn-header">
        <h1>{data.title}</h1>
      </header>
      {data.sections.map((section, i) => (
        <section key={i} className="mn-section">
          <h2 className="mn-section-heading">{section.heading}</h2>
          <div className="mn-blocks">
            {section.blocks.map((b, j) => <Block key={j} block={b} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
