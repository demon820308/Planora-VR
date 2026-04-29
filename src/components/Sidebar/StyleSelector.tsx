import { Style } from '../../types'
import './StyleSelector.css'

interface StyleSelectorProps {
  styles: Style[]
  currentStyleId: string
  onStyleChange: (styleId: string) => void
}

export const StyleSelector = ({ styles, currentStyleId, onStyleChange }: StyleSelectorProps) => {
  return (
    <div className="style-selector">
      <h3 className="selector-title">风格</h3>
      <div className="selector-grid">
        {styles.map(style => (
          <button
            key={style.id}
            className={`selector-btn ${currentStyleId === style.id ? 'active' : ''}`}
            onClick={() => onStyleChange(style.id)}
          >
            {style.name}
          </button>
        ))}
      </div>
    </div>
  )
}
