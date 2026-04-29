const STORAGE_KEY = 'vr-panorama-learned-room-bindings'

const aliasRules: Array<[string, string]> = [
  ['主人房', '主卧'],
  ['主卧室', '主卧'],
  ['次卧室', '次卧'],
  ['客卧室', '客卧'],
  ['起居室', '客厅'],
  ['饭厅', '餐厅'],
  ['公共卫生间', '公卫'],
  ['公用卫生间', '公卫'],
  ['卫生间', '卫'],
  ['洗手间', '卫'],
  ['浴室', '卫'],
  ['过道', '走廊']
]

export const normalizeLearnedBindingLabel = (value: string) => {
  let normalized = value
    .replace(/\s+/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 65248))
    .replace(/[^\u4e00-\u9fa5a-z0-9]/gi, '')
    .toLowerCase()

  aliasRules.forEach(([from, to]) => {
    normalized = normalized.replaceAll(
      from
        .replace(/\s+/g, '')
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 65248))
        .replace(/[^\u4e00-\u9fa5a-z0-9]/gi, '')
        .toLowerCase(),
      to
        .replace(/\s+/g, '')
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 65248))
        .replace(/[^\u4e00-\u9fa5a-z0-9]/gi, '')
        .toLowerCase()
    )
  })

  return normalized
}

export interface LearnedRoomBindingRecord {
  normalizedLabel: string
  roomBindingId: string
  sourceLabel: string
  updatedAt: string
}

export const loadLearnedRoomBindings = () => {
  if (typeof window === 'undefined') return {} as Record<string, LearnedRoomBindingRecord>

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return {} as Record<string, LearnedRoomBindingRecord>

  try {
    const parsed = JSON.parse(raw) as Record<string, LearnedRoomBindingRecord>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export const saveLearnedRoomBindings = (bindings: Record<string, LearnedRoomBindingRecord>) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
}

export const rememberRoomBinding = (sourceLabel: string, roomBindingId: string) => {
  const normalizedLabel = normalizeLearnedBindingLabel(sourceLabel)
  if (!normalizedLabel || !roomBindingId) return loadLearnedRoomBindings()

  const next = {
    ...loadLearnedRoomBindings(),
    [normalizedLabel]: {
      normalizedLabel,
      roomBindingId,
      sourceLabel,
      updatedAt: new Date().toISOString()
    }
  }
  saveLearnedRoomBindings(next)
  return next
}

export const clearLearnedRoomBindings = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
