import './PanoramaHeader.css'

interface PanoramaHeaderProps {
  roomName: string
  yaw: number
  pitch: number
  hfov: number
}

export const PanoramaHeader = ({ roomName, yaw, pitch, hfov }: PanoramaHeaderProps) => {
  return (
    <div className="panorama-header">
      <div className="panorama-info">
        <h2 className="panorama-room-name">{roomName}</h2>
      </div>
      <div className="panorama-tech-info">
        <span>yaw {yaw.toFixed(0)}°</span>
        <span>/</span>
        <span>pitch {pitch.toFixed(0)}°</span>
        <span>/</span>
        <span>fov {hfov.toFixed(0)}°</span>
      </div>
    </div>
  )
}
