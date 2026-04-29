import { DEFAULT_PROJECT_STYLE } from '../data/projectStyleOptions'

export interface PanoramaSourceConfig {
  mode: 'public' | 'custom'
  sourceFolderPath: string
  servedBaseUrl: string
  floorplanFileName: string
  selectedStyleName: string
}

export const PANORAMA_SOURCE_CONFIG_KEY = 'vr-panorama-source-config'

export const DEFAULT_PANORAMA_SOURCE_CONFIG: PanoramaSourceConfig = {
  mode: 'public',
  sourceFolderPath: '',
  servedBaseUrl: '/panoramas',
  floorplanFileName: 'floorplan.jpg',
  selectedStyleName: DEFAULT_PROJECT_STYLE
}

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, '')

export const loadPanoramaSourceConfig = (): PanoramaSourceConfig => {
  if (typeof window === 'undefined') return DEFAULT_PANORAMA_SOURCE_CONFIG

  const raw = window.localStorage.getItem(PANORAMA_SOURCE_CONFIG_KEY)
  if (!raw) return DEFAULT_PANORAMA_SOURCE_CONFIG

  try {
    const parsed = JSON.parse(raw) as Partial<PanoramaSourceConfig>
    return {
      mode: parsed.mode === 'custom' ? 'custom' : 'public',
      sourceFolderPath: parsed.sourceFolderPath?.trim() || DEFAULT_PANORAMA_SOURCE_CONFIG.sourceFolderPath,
      servedBaseUrl: normalizeBaseUrl(parsed.servedBaseUrl || DEFAULT_PANORAMA_SOURCE_CONFIG.servedBaseUrl),
      floorplanFileName: parsed.floorplanFileName?.trim() || DEFAULT_PANORAMA_SOURCE_CONFIG.floorplanFileName,
      selectedStyleName: parsed.selectedStyleName?.trim() || DEFAULT_PANORAMA_SOURCE_CONFIG.selectedStyleName
    }
  } catch {
    return DEFAULT_PANORAMA_SOURCE_CONFIG
  }
}

export const savePanoramaSourceConfig = (config: PanoramaSourceConfig) => {
  if (typeof window === 'undefined') return

  const payload: PanoramaSourceConfig = {
    ...config,
    servedBaseUrl: normalizeBaseUrl(config.servedBaseUrl),
    selectedStyleName: config.selectedStyleName.trim() || DEFAULT_PANORAMA_SOURCE_CONFIG.selectedStyleName
  }

  window.localStorage.setItem(PANORAMA_SOURCE_CONFIG_KEY, JSON.stringify(payload))
  window.dispatchEvent(new Event('panorama-source-config-updated'))
}
