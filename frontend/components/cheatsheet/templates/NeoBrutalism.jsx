import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

function NeoBrutalism({ data, font }) {
  if (!data) return null
  
  return (
    <div 
      className="cs-tpl-neobrutalism"
      style={{ fontFamily: font || 'inherit' }}
    >
      <div className="cs-neo-header">
        <h1>{data.title}</h1>
        <div className="cs-neo-badge">CHEAT SHEET</div>
      </div>

      <div className="cs-neo-grid">
        {data.sections.map((section, sIdx) => (
          <div key={sIdx} className="cs-neo-section">
            <h2 className="cs-neo-section-title">{section.heading}</h2>
            
            <div className="cs-neo-blocks">
              {section.blocks.map((block, bIdx) => (
                <div key={bIdx} className="cs-neo-block">
                  {block.term && <div className="cs-neo-term">{block.term}</div>}
                  
                  {block.content && (
                    <div className="cs-neo-content markdown-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {block.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {block.items && block.items.length > 0 && (
                    <ul className="cs-neo-list">
                      {block.items.map((item, i) => (
                        <li key={i}>
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {item}
                          </ReactMarkdown>
                        </li>
                      ))}
                    </ul>
                  )}

                  {block.caption && <div className="cs-neo-caption">{block.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NeoBrutalism
