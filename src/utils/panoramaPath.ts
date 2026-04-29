import { Style } from '../types'
import { getImportedPanoramaUrl } from './projectImageAssets'
import { loadPanoramaSourceConfig } from './panoramaSourceConfig'

const TEMP_ITALIAN_MASTER_BEDROOM_A = '/temp/italian-master-bedroom-a.png'
const TEMP_FLOORPLAN = '/temp/floorplan.png'
const DEFAULT_PUBLIC_BASE = '/panoramas'

export const SUPPORTED_PANORAMA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const

const imageProbeCache = new Map<string, Promise<boolean>>()
const resolvedPanoramaCache = new Map<string, Promise<string | null>>()

const joinPath = (...parts: string[]) => parts
  .map((part, index) => (
    index === 0 ? part.replace(/\/+$/, '') : part.replace(/^\/+|\/+$/g, '')
  ))
  .filter(Boolean)
  .join('/')

const getActivePanoramaBase = () => {
  const config = loadPanoramaSourceConfig()
  return {
    baseUrl: config.mode === 'custom' && config.servedBaseUrl ? config.servedBaseUrl : DEFAULT_PUBLIC_BASE,
    styleName: config.selectedStyleName.trim()
  }
}

const probeImage = (url: string) => {
  const cached = imageProbeCache.get(url)
  if (cached) return cached

  const promise = new Promise<boolean>(resolve => {
    const image = new Image()
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
    image.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
  })

  imageProbeCache.set(url, promise)
  return promise
}

export const clearPanoramaPathCaches = () => {
  imageProbeCache.clear()
  resolvedPanoramaCache.clear()
}

export const getProjectStyle = (): Style => {
  const config = loadPanoramaSourceConfig()
  const styleName = config.selectedStyleName.trim() || '当前风格'
  return {
    id: styleName,
    name: styleName,
    description: `当前项目风格：${styleName}`,
    folder: styleName
  }
}

export const getPanoramaCandidatePaths = (roomName: string, styleName?: string): string[] => {
  const active = getActivePanoramaBase()
  const finalStyleName = (styleName || active.styleName || '当前风格').trim()

  if (
    active.baseUrl === DEFAULT_PUBLIC_BASE &&
    (finalStyleName === '意式风格' || finalStyleName === 'italian') &&
    roomName === 'master-bedroom-a'
  ) {
    return [TEMP_ITALIAN_MASTER_BEDROOM_A]
  }

  return SUPPORTED_PANORAMA_EXTENSIONS.map(extension =>
    `${joinPath(active.baseUrl, finalStyleName, roomName)}.${extension}`
  )
}

export const getPanoramaPath = (roomName: string, styleName?: string): string => {
  return getPanoramaCandidatePaths(roomName, styleName)[0]
}

export const resolvePanoramaPath = async (roomName: string, styleName?: string) => {
  const cacheKey = `${styleName || ''}::${roomName}`
  const cached = resolvedPanoramaCache.get(cacheKey)
  if (cached) return cached

  const promise = (async () => {
    const finalStyleName = (styleName || getActivePanoramaBase().styleName || '当前风格').trim()
    const importedUrl = await getImportedPanoramaUrl(finalStyleName, roomName)
    if (importedUrl) return importedUrl

    const candidates = getPanoramaCandidatePaths(roomName, styleName)
    for (const candidate of candidates) {
      const ok = await probeImage(candidate)
      if (ok) return candidate
    }
    return null
  })()

  resolvedPanoramaCache.set(cacheKey, promise)
  return promise
}

export const getMissingPath = (): string => '/panoramas/placeholder/missing-panorama.svg'

export const getFloorplanPath = (): string => {
  const config = loadPanoramaSourceConfig()
  if (config.mode === 'custom' && config.servedBaseUrl) {
    return joinPath(config.servedBaseUrl, config.floorplanFileName)
  }
  return TEMP_FLOORPLAN
}
