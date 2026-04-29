import { useState } from 'react'
import { Room } from '../../types'
import { getFloorplanPath } from '../../utils/panoramaPath'
import { loadFloorplanOverrides } from '../../utils/floorplanOverrides'
import { MiniLegend } from './MiniLegend'
import './FloorplanMap.css'

interface FloorplanMapProps {
  rooms: Room[]
  currentRoomId: string
  onRoomClick: (roomId: string) => void
}

const DEFAULT_FLOORPLAN_VIEWBOX = { width: 1333, height: 1180 }

export const FloorplanMap = ({ rooms, currentRoomId, onRoomClick }: FloorplanMapProps) => {
  const overrides = loadFloorplanOverrides()
  const floorplanUrl = overrides?.previewImageUrl || getFloorplanPath()
  const viewBox = overrides?.viewBox || DEFAULT_FLOORPLAN_VIEWBOX
  const [hasFloorplanImage, setHasFloorplanImage] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  const renderFloorplanSvg = (className: string) => (
    <svg
      className={className}
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {hasFloorplanImage ? (
        <image
          href={floorplanUrl}
          x="0"
          y="0"
          width={viewBox.width}
          height={viewBox.height}
          preserveAspectRatio="none"
          onError={() => setHasFloorplanImage(false)}
        />
      ) : (
        <rect x="0" y="0" width={viewBox.width} height={viewBox.height} fill="#f5f3ef" />
      )}

      {rooms.map(room => (
        <polygon
          key={room.id}
          points={room.floorplanPolygon}
          className={`floorplan-hotspot ${currentRoomId === room.id ? 'current' : ''}`}
          onClick={event => {
            event.stopPropagation()
            onRoomClick(room.id)
          }}
        />
      ))}
    </svg>
  )

  return (
    <>
      <div className="floorplan-map">
        <div className="floorplan-content">
          <div className="floorplan-canvas-wrap">
            <div className="floorplan-canvas">
              {renderFloorplanSvg('floorplan-svg')}
            </div>
          </div>
        </div>
        <MiniLegend onExpand={() => setIsExpanded(true)} />
      </div>

      {isExpanded && (
        <div
          className="floorplan-lightbox"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="floorplan-lightbox-dialog"
            onClick={event => event.stopPropagation()}
          >
            <div className="floorplan-lightbox-header">
              <h3>户型图放大预览</h3>
              <button
                type="button"
                className="floorplan-lightbox-close"
                onClick={() => setIsExpanded(false)}
              >
                关闭
              </button>
            </div>
            <div className="floorplan-lightbox-stage">
              <div className="floorplan-lightbox-canvas">
                {renderFloorplanSvg('floorplan-svg floorplan-svg-expanded')}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
