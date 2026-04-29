import './MiniLegend.css'

interface MiniLegendProps {
  onExpand: () => void
}

export const MiniLegend = ({ onExpand }: MiniLegendProps) => {
  return (
    <div className="mini-legend">
      <div className="legend-header">
        <h4 className="legend-title">线框索引</h4>
        <button
          type="button"
          className="legend-expand-button"
          onClick={onExpand}
        >
          放大SVG热区图
        </button>
      </div>
      <ul className="legend-list">
        <li className="legend-item">
          <span className="legend-marker current" />
          <span>当前房间</span>
        </li>
        <li className="legend-item">
          <span className="legend-marker hotspot" />
          <span>热点可达</span>
        </li>
        <li className="legend-item">
          <span className="legend-marker outline" />
          <span>房间轮廓</span>
        </li>
      </ul>
      <p className="legend-note">
        点击线框区域可切换房间。风格切换时不换房间，只会切换当前空间的全景资源。
      </p>
    </div>
  )
}
