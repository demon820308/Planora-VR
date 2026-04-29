export interface FloorplanRegion {
  id: string
  points: Array<[number, number]>
  bounds: { x: number; y: number; width: number; height: number }
  area: number
  centroid: { x: number; y: number }
}

export interface FloorplanAnalysisOptions {
  threshold?: number
  dilation?: number
  minArea?: number
}

export interface FloorplanLabeledRegion extends FloorplanRegion {
  label?: string
  enabled?: boolean
}

export interface FloorplanSvgOptions {
  width: number
  height: number
  title?: string
  selectedRegionId?: string | null
  background?: string
  selectedFill?: string
  inactiveFill?: string
  strokeColor?: string
  labelColor?: string
}

type Point = [number, number]
type Edge = [Point, Point]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const pointToKey = ([x, y]: Point) => `${x},${y}`

const polygonArea = (points: Point[]) => {
  let area = 0
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2
}

const simplifyOrthogonalLoop = (points: Point[]) => {
  if (points.length <= 4) return points

  const simplified: Point[] = []
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[(i - 1 + points.length) % points.length]
    const current = points[i]
    const next = points[(i + 1) % points.length]
    const sameX = prev[0] === current[0] && current[0] === next[0]
    const sameY = prev[1] === current[1] && current[1] === next[1]
    if (!sameX && !sameY) {
      simplified.push(current)
    }
  }

  return simplified.length >= 3 ? simplified : points
}

const buildRegionOutline = (
  pixels: Point[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
) => {
  const localWidth = bounds.maxX - bounds.minX + 1
  const localHeight = bounds.maxY - bounds.minY + 1
  const regionMask = new Uint8Array(localWidth * localHeight)

  for (const [x, y] of pixels) {
    const localX = x - bounds.minX
    const localY = y - bounds.minY
    regionMask[localY * localWidth + localX] = 1
  }

  const contains = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= localWidth || y >= localHeight) return false
    return regionMask[y * localWidth + x] === 1
  }

  const edges: Edge[] = []

  for (const [x, y] of pixels) {
    const localX = x - bounds.minX
    const localY = y - bounds.minY

    if (!contains(localX, localY - 1)) {
      edges.push([[x, y], [x + 1, y]])
    }
    if (!contains(localX + 1, localY)) {
      edges.push([[x + 1, y], [x + 1, y + 1]])
    }
    if (!contains(localX, localY + 1)) {
      edges.push([[x + 1, y + 1], [x, y + 1]])
    }
    if (!contains(localX - 1, localY)) {
      edges.push([[x, y + 1], [x, y]])
    }
  }

  const adjacency = new Map<string, Edge[]>()
  for (const edge of edges) {
    const key = pointToKey(edge[0])
    const bucket = adjacency.get(key)
    if (bucket) {
      bucket.push(edge)
    } else {
      adjacency.set(key, [edge])
    }
  }

  const visited = new Set<number>()
  const loops: Point[][] = []

  edges.forEach((edge, edgeIndex) => {
    if (visited.has(edgeIndex)) return

    const loop: Point[] = [edge[0]]
    let currentEdge = edge
    let currentIndex = edgeIndex

    while (!visited.has(currentIndex)) {
      visited.add(currentIndex)
      loop.push(currentEdge[1])

      const nextEdges = adjacency.get(pointToKey(currentEdge[1])) ?? []
      const nextIndex = nextEdges.findIndex(candidate => {
        const globalIndex = edges.indexOf(candidate)
        return globalIndex >= 0 && !visited.has(globalIndex)
      })

      if (nextIndex === -1) break

      currentEdge = nextEdges[nextIndex]
      currentIndex = edges.indexOf(currentEdge)
    }

    if (loop.length > 3) {
      if (pointToKey(loop[0]) === pointToKey(loop[loop.length - 1])) {
        loop.pop()
      }
      loops.push(simplifyOrthogonalLoop(loop))
    }
  })

  if (loops.length === 0) {
    return [
      [bounds.minX, bounds.minY],
      [bounds.maxX + 1, bounds.minY],
      [bounds.maxX + 1, bounds.maxY + 1],
      [bounds.minX, bounds.maxY + 1]
    ] satisfies Point[]
  }

  return loops.sort((a, b) => polygonArea(b) - polygonArea(a))[0]
}

export const analyzeFloorplanImage = async (
  image: HTMLImageElement,
  options: FloorplanAnalysisOptions = {}
): Promise<FloorplanRegion[]> => {
  const threshold = options.threshold ?? 222
  const dilation = options.dilation ?? 1
  const minArea = options.minArea ?? 1800

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []

  ctx.drawImage(image, 0, 0)
  const width = canvas.width
  const height = canvas.height
  const { data } = ctx.getImageData(0, 0, width, height)

  const size = width * height
  const wall = new Uint8Array(size)

  for (let i = 0, p = 0; i < size; i += 1, p += 4) {
    const r = data[p]
    const g = data[p + 1]
    const b = data[p + 2]
    const a = data[p + 3]
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    wall[i] = a < 16 || luminance < threshold ? 1 : 0
  }

  if (dilation > 0) {
    const expanded = new Uint8Array(size)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x
        if (!wall[idx]) continue
        for (let dy = -dilation; dy <= dilation; dy += 1) {
          for (let dx = -dilation; dx <= dilation; dx += 1) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            expanded[ny * width + nx] = 1
          }
        }
      }
    }
    wall.set(expanded)
  }

  const outside = new Uint8Array(size)
  const queue = new Int32Array(size)
  let head = 0
  let tail = 0

  const enqueue = (idx: number) => {
    if (outside[idx] || wall[idx]) return
    outside[idx] = 1
    queue[tail] = idx
    tail += 1
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }

  while (head < tail) {
    const idx = queue[head]
    head += 1
    const x = idx % width
    const y = Math.floor(idx / width)

    if (x > 0) enqueue(idx - 1)
    if (x < width - 1) enqueue(idx + 1)
    if (y > 0) enqueue(idx - width)
    if (y < height - 1) enqueue(idx + width)
  }

  const visited = new Uint8Array(size)
  const regions: FloorplanRegion[] = []

  const componentQueue = new Int32Array(size)

  for (let i = 0; i < size; i += 1) {
    if (wall[i] || outside[i] || visited[i]) continue

    let cHead = 0
    let cTail = 0
    componentQueue[cTail] = i
    cTail += 1
    visited[i] = 1

    const pixels: Array<[number, number]> = []
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let sumX = 0
    let sumY = 0

    while (cHead < cTail) {
      const idx = componentQueue[cHead]
      cHead += 1
      const x = idx % width
      const y = Math.floor(idx / width)

      pixels.push([x, y])
      sumX += x
      sumY += y
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      const neighbors = [
        idx - 1,
        idx + 1,
        idx - width,
        idx + width
      ]

      for (const neighbor of neighbors) {
        const nx = neighbor % width
        const ny = Math.floor(neighbor / width)
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue
        }
        if (wall[neighbor] || outside[neighbor]) {
          continue
        }
        if (!visited[neighbor]) {
          visited[neighbor] = 1
          componentQueue[cTail] = neighbor
          cTail += 1
        }
      }
    }

    const area = pixels.length
    if (area < minArea) continue

    const outline = buildRegionOutline(pixels, { minX, minY, maxX, maxY })
    if (outline.length < 3) continue

    regions.push({
      id: `region-${regions.length + 1}`,
      points: outline,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      },
      area,
      centroid: {
        x: sumX / area,
        y: sumY / area
      }
    })
  }

  return regions
}

export const regionsToSvgPoints = (points: Point[]): string => {
  return points.map(([x, y]) => `${clamp(Math.round(x), 0, Number.MAX_SAFE_INTEGER)},${clamp(Math.round(y), 0, Number.MAX_SAFE_INTEGER)}`).join(' ')
}

const escapeXml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export const buildFloorplanSvg = (
  regions: FloorplanLabeledRegion[],
  options: FloorplanSvgOptions
) => {
  const {
    width,
    height,
    title = 'Floorplan regions',
    selectedRegionId = null,
    background = '#ffffff',
    selectedFill = '#b8997a',
    inactiveFill = '#ffffff',
    strokeColor = '#42372c',
    labelColor = '#2b241f'
  } = options

  const regionMarkup = regions
    .map((region, index) => {
      const isSelected = region.id === selectedRegionId
      const label = escapeXml(region.label ?? `区域 ${index + 1}`)
      const enabled = region.enabled !== false
      const fill = isSelected ? selectedFill : inactiveFill
      const fillOpacity = enabled ? (isSelected ? '0.95' : '1') : '0.55'
      const strokeWidth = isSelected ? 4 : 3
      const dashArray = enabled ? '' : ' stroke-dasharray="10 8"'
      const dataEnabled = enabled ? 'true' : 'false'
      const labelOpacity = enabled ? '1' : '0.72'

      return [
        `<polygon data-enabled="${dataEnabled}" points="${regionsToSvgPoints(region.points)}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round"${dashArray} />`,
        `<text x="${Math.round(region.centroid.x)}" y="${Math.round(region.centroid.y) - 4}" text-anchor="middle" dominant-baseline="middle" fill="${labelColor}" fill-opacity="${labelOpacity}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700">${label}</text>`
      ].join('')
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">
  <rect width="100%" height="100%" fill="${background}" />
  <g>${regionMarkup}</g>
</svg>`
}
