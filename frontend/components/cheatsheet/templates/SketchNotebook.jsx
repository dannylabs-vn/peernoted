import { useEffect, useMemo } from 'react'
import { renderLatex } from '../latex'

const loadedFonts = new Set()

function ensureFontLoaded(font) {
  if (!font) return
  if (loadedFonts.has(font)) return
  loadedFonts.add(font)
  const link = document.createElement('link')
  // Pacifico has no italics, Be Vietnam Pro Italic needs explicit italic axis
  const family = font.replace(/ /g, '+')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap&subset=vietnamese`
  document.head.appendChild(link)
}

// Deterministic pseudo-random (so html2canvas captures match the on-screen render)
function seededRandom(seed) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6D2B79F5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter('vi', { granularity: 'grapheme' })
  : null

function HandwrittenText({ text, seed }) {
  const spans = useMemo(() => {
    if (!text) return []
    const rng = seededRandom(seed)
    const chars = segmenter
      ? [...segmenter.segment(text)].map(s => s.segment)
      : [...text]
    return chars.map((c, i) => {
      const rot = (rng() * 4 - 2).toFixed(2)
      const op = (0.85 + rng() * 0.15).toFixed(2)
      return { ch: c, rot, op, key: i }
    })
  }, [text, seed])

  return (
    <>
      {spans.map(s => (
        <span
          key={s.key}
          style={{
            display: 'inline-block',
            transform: `rotate(${s.rot}deg)`,
            opacity: s.op
          }}
        >
          {s.ch === ' ' ? ' ' : s.ch}
        </span>
      ))}
    </>
  )
}

function Block({ block, font, seedBase }) {
  if (block.type === 'formula') {
    return (
      <div className="sk-block sk-formula">
        {block.caption && (
          <div className="sk-caption">
            <HandwrittenText text={block.caption} seed={seedBase + ':cap'} />
          </div>
        )}
        <div className="sk-formula-body" dangerouslySetInnerHTML={{ __html: renderLatex(block.content, true) }} />
      </div>
    )
  }
  if (block.type === 'definition') {
    return (
      <div className="sk-block sk-definition">
        {block.term && (
          <span className="sk-term"><HandwrittenText text={block.term + ':'} seed={seedBase + ':term'} /></span>
        )}{' '}
        <span className="sk-def-content"><HandwrittenText text={block.content} seed={seedBase + ':def'} /></span>
      </div>
    )
  }
  if (block.type === 'list') {
    return (
      <div className="sk-block sk-list">
        {block.content && (
          <div className="sk-list-title"><HandwrittenText text={block.content} seed={seedBase + ':lt'} /></div>
        )}
        <ul>
          {(block.items || []).map((it, i) => (
            <li key={i}>
              <span className="sk-bullet">›</span>
              <HandwrittenText text={it} seed={seedBase + ':item:' + i} />
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (block.type === 'example') {
    return (
      <div className="sk-block sk-example">
        {block.caption && (
          <div className="sk-caption"><HandwrittenText text={block.caption} seed={seedBase + ':ecap'} /></div>
        )}
        <div className="sk-example-content"><HandwrittenText text={block.content} seed={seedBase + ':ec'} /></div>
      </div>
    )
  }
  return (
    <div className="sk-block sk-note">
      <span className="sk-note-icon">★</span>
      <HandwrittenText text={block.content} seed={seedBase + ':n'} />
    </div>
  )
}

export default function SketchNotebook({ data, font }) {
  useEffect(() => {
    ensureFontLoaded(font)
  }, [font])

  const fontFamily = font ? `"${font}", "Caveat", cursive` : '"Caveat", cursive'

  return (
    <div className="tpl-sketch-notebook" style={{ fontFamily }}>
      <header className="sk-header">
        <h1><HandwrittenText text={data.title} seed={'title'} /></h1>
      </header>
      <div className="sk-columns">
        {data.sections.map((section, i) => (
          <section key={i} className="sk-section">
            <h2 className="sk-section-heading">
              <HandwrittenText text={section.heading} seed={`sec:${i}`} />
            </h2>
            <div className="sk-blocks">
              {section.blocks.map((b, j) => (
                <Block key={j} block={b} font={font} seedBase={`s${i}b${j}`} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
