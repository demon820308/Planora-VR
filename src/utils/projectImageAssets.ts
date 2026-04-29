const DB_NAME = 'vr-panorama-image-assets'
const DB_VERSION = 1
const STORE_NAME = 'style-assets'
const UPDATE_EVENT = 'panorama-imports-updated'

type AssetKind = 'panorama' | 'sidebar-floorplan'

interface StoredAssetRecord {
  key: string
  styleName: string
  kind: AssetKind
  roomName: string | null
  fileName: string
  blob: Blob
  updatedAt: string
}

export interface ImportedAssetSummary {
  styleName: string
  panoramas: Array<{
    roomName: string
    fileName: string
  }>
  sidebarFloorplanFileName: string | null
}

const objectUrlCache = new Map<string, string>()

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION)

  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      store.createIndex('styleName', 'styleName', { unique: false })
    }
  }

  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'))
})

const assetKey = (styleName: string, kind: AssetKind, roomName?: string | null) =>
  `${styleName}::${kind}::${roomName || '_'}` 

const revokeStyleUrls = (styleName: string) => {
  Array.from(objectUrlCache.keys())
    .filter(key => key.startsWith(`${styleName}::`))
    .forEach(key => {
      const url = objectUrlCache.get(key)
      if (url) {
        URL.revokeObjectURL(url)
      }
      objectUrlCache.delete(key)
    })
}

const getRecordsByStyle = async (styleName: string): Promise<StoredAssetRecord[]> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('styleName')
    const request = index.getAll(styleName)

    request.onsuccess = () => resolve(request.result as StoredAssetRecord[])
    request.onerror = () => reject(request.error || new Error('Failed to read imported assets'))
  })
}

const dispatchUpdated = () => {
  window.dispatchEvent(new Event(UPDATE_EVENT))
}

export const IMPORTED_PANORAMA_UPDATE_EVENT = UPDATE_EVENT

export const replaceImportedStyleAssets = async (
  styleName: string,
  panoramas: Array<{ roomName: string; fileName: string; blob: Blob }>,
  sidebarFloorplan?: { fileName: string; blob: Blob } | null
) => {
  const db = await openDb()
  const existing = await getRecordsByStyle(styleName)

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    existing.forEach(record => {
      store.delete(record.key)
    })

    panoramas.forEach(item => {
      const record: StoredAssetRecord = {
        key: assetKey(styleName, 'panorama', item.roomName),
        styleName,
        kind: 'panorama',
        roomName: item.roomName,
        fileName: item.fileName,
        blob: item.blob,
        updatedAt: new Date().toISOString()
      }
      store.put(record)
    })

    if (sidebarFloorplan) {
      const record: StoredAssetRecord = {
        key: assetKey(styleName, 'sidebar-floorplan', null),
        styleName,
        kind: 'sidebar-floorplan',
        roomName: null,
        fileName: sidebarFloorplan.fileName,
        blob: sidebarFloorplan.blob,
        updatedAt: new Date().toISOString()
      }
      store.put(record)
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Failed to save imported assets'))
  })

  revokeStyleUrls(styleName)
  dispatchUpdated()
}

export const getImportedPanoramaUrl = async (styleName: string, roomName: string): Promise<string | null> => {
  const key = assetKey(styleName, 'panorama', roomName)
  const cached = objectUrlCache.get(key)
  if (cached) return cached

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(key)

    request.onsuccess = () => {
      const record = request.result as StoredAssetRecord | undefined
      if (!record) {
        resolve(null)
        return
      }
      const url = URL.createObjectURL(record.blob)
      objectUrlCache.set(key, url)
      resolve(url)
    }
    request.onerror = () => reject(request.error || new Error('Failed to load imported panorama'))
  })
}

export const getImportedSidebarFloorplanUrl = async (styleName: string): Promise<string | null> => {
  const key = assetKey(styleName, 'sidebar-floorplan', null)
  const cached = objectUrlCache.get(key)
  if (cached) return cached

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(key)

    request.onsuccess = () => {
      const record = request.result as StoredAssetRecord | undefined
      if (!record) {
        resolve(null)
        return
      }
      const url = URL.createObjectURL(record.blob)
      objectUrlCache.set(key, url)
      resolve(url)
    }
    request.onerror = () => reject(request.error || new Error('Failed to load sidebar floorplan'))
  })
}

export const getImportedAssetSummary = async (styleName: string): Promise<ImportedAssetSummary> => {
  const records = await getRecordsByStyle(styleName)
  const panoramas = records
    .filter(record => record.kind === 'panorama' && record.roomName)
    .map(record => ({
      roomName: record.roomName as string,
      fileName: record.fileName
    }))
    .sort((a, b) => a.roomName.localeCompare(b.roomName, 'zh-CN'))

  const sidebarFloorplan = records.find(record => record.kind === 'sidebar-floorplan')

  return {
    styleName,
    panoramas,
    sidebarFloorplanFileName: sidebarFloorplan?.fileName || null
  }
}

export const clearImportedStyleAssets = async (styleName: string) => {
  const db = await openDb()
  const existing = await getRecordsByStyle(styleName)

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    existing.forEach(record => store.delete(record.key))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Failed to clear imported assets'))
  })

  revokeStyleUrls(styleName)
  dispatchUpdated()
}
