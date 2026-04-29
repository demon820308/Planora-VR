import { resolvePanoramaPath, getProjectStyle } from './panoramaPath'

export const preloadRoomStyles = async (roomName: string): Promise<void> => {
  const style = getProjectStyle()
  await resolvePanoramaPath(roomName, style.id)
}

export const preloadStyleRooms = async (roomNames: string[]): Promise<void> => {
  const style = getProjectStyle()
  await Promise.allSettled(roomNames.map(roomName => resolvePanoramaPath(roomName, style.id)))
}
