export interface Room {
  id: string
  name: string
  size: string
  description: string
  floorplanPolygon: string
  defaultYaw: number
  defaultPitch: number
  defaultHfov: number
}

export interface Style {
  id: string
  name: string
  description: string
  folder: string
}

export interface ViewerState {
  yaw: number
  pitch: number
  hfov: number
}

export type PanoramaStatus = 'loading' | 'loaded' | 'fallback' | 'missing'
