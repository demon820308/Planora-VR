import { Room } from '../types'

export interface AppliedFloorplanRegion {
  label: string
  enabled: boolean
  points: string
}

export interface FloorplanOverridePayload {
  version: 2
  updatedAt: string
  regions: AppliedFloorplanRegion[]
  previewImageUrl?: string
  viewBox?: {
    width: number
    height: number
  }
}

export const FLOORPLAN_OVERRIDE_STORAGE_KEY = 'vr-panorama-floorplan-overrides'

export const loadFloorplanOverrides = (): FloorplanOverridePayload | null => {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(FLOORPLAN_OVERRIDE_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as FloorplanOverridePayload
    if (!parsed || !Array.isArray(parsed.regions)) {
      return null
    }
    if (parsed.version !== 1 && parsed.version !== 2) {
      return null
    }
    return {
      version: 2,
      updatedAt: parsed.updatedAt,
      regions: parsed.regions,
      previewImageUrl: parsed.previewImageUrl,
      viewBox: parsed.viewBox
    }
  } catch {
    return null
  }
}

export const saveFloorplanOverrides = (payload: FloorplanOverridePayload) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FLOORPLAN_OVERRIDE_STORAGE_KEY, JSON.stringify(payload))
}

export const clearFloorplanOverrides = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(FLOORPLAN_OVERRIDE_STORAGE_KEY)
}

export const resolveHomepageRooms = (baseRooms: Room[]) => {
  const overrides = loadFloorplanOverrides()
  if (!overrides || overrides.regions.length === 0) {
    return baseRooms
  }

  const isNamedRoom = (label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return false
    return !/^区域\s*\d+$/i.test(trimmed)
  }

  const dedupedRooms = new Map<string, Room>()

  overrides.regions
    .filter(region => region.enabled && isNamedRoom(region.label))
    .forEach(region => {
      const roomName = region.label.trim()
      if (dedupedRooms.has(roomName)) return

      dedupedRooms.set(roomName, {
        id: roomName,
        name: roomName,
        size: '--',
        description: roomName,
        floorplanPolygon: region.points,
        defaultYaw: 0,
        defaultPitch: 0,
        defaultHfov: 100
      })
    })

  const resolvedRooms = [...dedupedRooms.values()]
  return resolvedRooms.length > 0 ? resolvedRooms : baseRooms
}
