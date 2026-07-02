import { TEMPLATES, TEMPLATE_KEYS } from './templates'

export default function TemplatePicker({ value, onChange, disabled }) {
  return (
    <div className="cs-template-picker">
      {TEMPLATE_KEYS.map(key => {
        const t = TEMPLATES[key]
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            className={`cs-tpl-thumb${active ? ' active' : ''}`}
            disabled={disabled}
            onClick={() => onChange(key)}
            title={t.description}
          >
            <span className="cs-tpl-icon">{t.icon}</span>
            <span className="cs-tpl-label">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
