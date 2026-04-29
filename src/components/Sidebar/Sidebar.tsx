import { Room, Style } from '../../types'
import { ProjectFloorplanPreview } from './ProjectFloorplanPreview'
import { RoomSelector } from './RoomSelector'
import { StatusPanel } from './StatusPanel'
import { StyleSelector } from './StyleSelector'
import './Sidebar.css'

interface SidebarProps {
  styles: Style[]
  rooms: Room[]
  currentStyleId: string
  currentRoomId: string
  currentRoom: Room
  currentStyle: Style
  onStyleChange: (styleId: string) => void
  onRoomChange: (roomId: string) => void
}

export const Sidebar = ({
  styles,
  rooms,
  currentStyleId,
  currentRoomId,
  currentRoom,
  currentStyle,
  onStyleChange,
  onRoomChange
}: SidebarProps) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-tag">自研全景底图路线</span>
        <h1 className="sidebar-title">Planora</h1>
        <p className="sidebar-desc">用于本地 VR 预览、房间切换和户型图导航。</p>
      </div>

      <StyleSelector
        styles={styles}
        currentStyleId={currentStyleId}
        onStyleChange={onStyleChange}
      />

      <RoomSelector
        rooms={rooms}
        currentRoomId={currentRoomId}
        onRoomChange={onRoomChange}
      />

      <StatusPanel
        currentRoom={currentRoom}
        currentStyle={currentStyle}
      />

      <ProjectFloorplanPreview styleName={currentStyle.name} />
    </div>
  )
}
