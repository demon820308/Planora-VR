interface FloorplanHotspotProps {
  polygon: string
  isCurrent: boolean
  onClick: () => void
}

export const FloorplanHotspot = ({ polygon, isCurrent, onClick }: FloorplanHotspotProps) => {
  return (
    <polygon
      points={polygon}
      className={`floorplan-hotspot ${isCurrent ? 'current' : ''}`}
      onClick={onClick}
    />
  )
}
