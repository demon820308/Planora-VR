import { Room } from '../../types'
import './RoomSelector.css'

interface RoomSelectorProps {
  rooms: Room[]
  currentRoomId: string
  onRoomChange: (roomId: string) => void
}

export const RoomSelector = ({ rooms, currentRoomId, onRoomChange }: RoomSelectorProps) => {
  return (
    <div className="room-selector">
      <h3 className="selector-title">房间</h3>
      <div className="selector-grid">
        {rooms.map(room => (
          <button
            key={room.id}
            className={`selector-btn ${currentRoomId === room.id ? 'active' : ''}`}
            onClick={() => onRoomChange(room.id)}
          >
            {room.name}
          </button>
        ))}
      </div>
    </div>
  )
}
