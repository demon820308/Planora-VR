import { PaddleOCR, type OcrResultItem } from '@paddleocr/paddleocr-js'

const ORT_WASM_FILE = '/onnxruntime/ort-wasm-simd-threaded.jsep.wasm'

let ocrInstancePromise: Promise<Awaited<ReturnType<typeof PaddleOCR.create>>> | null = null

export interface FloorplanOcrLabel {
  text: string
  score: number
  center: { x: number; y: number }
  poly: Array<[number, number]>
}

const normalizeText = (value: string) => value.replace(/\s+/g, '').trim()

const itemToLabel = (item: OcrResultItem): FloorplanOcrLabel | null => {
  const text = normalizeText(item.text)
  if (!text) return null

  const xs = item.poly.map(([x]) => x)
  const ys = item.poly.map(([, y]) => y)
  return {
    text,
    score: item.score,
    center: {
      x: xs.reduce((sum, x) => sum + x, 0) / xs.length,
      y: ys.reduce((sum, y) => sum + y, 0) / ys.length
    },
    poly: item.poly
  }
}

export const getFloorplanOcr = async () => {
  if (!ocrInstancePromise) {
    ocrInstancePromise = PaddleOCR.create({
      lang: 'ch',
      ocrVersion: 'PP-OCRv5',
      ortOptions: {
        backend: 'wasm',
        wasmPaths: {
          wasm: ORT_WASM_FILE
        }
      }
    })
  }

  return ocrInstancePromise
}

export const recognizeFloorplanLabels = async (image: Blob | File) => {
  const ocr = await getFloorplanOcr()
  const [result] = await ocr.predict(image)
  return (result?.items ?? [])
    .map(itemToLabel)
    .filter((item): item is FloorplanOcrLabel => item !== null)
    .sort((a, b) => b.score - a.score)
}
