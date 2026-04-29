import { Room, Style } from '../../types'
import './StatusPanel.css'

interface StatusPanelProps {
  currentRoom: Room
  currentStyle: Style
}

export const StatusPanel = ({ currentRoom, currentStyle }: StatusPanelProps) => {
  return (
    <div className="status-panel">
      <h3 className="selector-title">当前状态</h3>
      <div className="status-grid">
        <article className="status-card">
          <strong>{currentRoom.name}</strong>
          <span>当前房间</span>
        </article>
        <article className="status-card">
          <strong>{currentStyle.name}</strong>
          <span>当前风格</span>
        </article>
      </div>
    </div>
  )
}
