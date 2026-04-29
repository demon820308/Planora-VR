import { useEffect, useMemo, useRef, useState } from 'react'
import { PaddleOCR, type InitializationSummary, type OcrResultItem } from '@paddleocr/paddleocr-js'
import testImage from '../../image/test.png'
import './TestOCR.css'

type RecognitionState = 'idle' | 'loading' | 'ready' | 'recognizing' | 'done' | 'error'

interface PreviewSource {
  url: string
  name: string
  file?: File
}

const SAMPLE_SOURCE: PreviewSource = {
  url: testImage,
  name: 'test.png'
}

// Keep PaddleOCR's packaged .mjs loader, but pin the final wasm binary to our static file.
const ORT_WASM_FILE = '/onnxruntime/ort-wasm-simd-threaded.jsep.wasm'

const isBlobUrl = (value: string) => value.startsWith('blob:')

const polygonPoints = (poly: OcrResultItem['poly']) => poly.map(([x, y]) => `${x},${y}`).join(' ')

const getBounds = (poly: OcrResultItem['poly']) => {
  const xs = poly.map(([x]) => x)
  const ys = poly.map(([, y]) => y)

  return {
    x: Math.min(...xs),
    y: Math.min(...ys)
  }
}

export const TestOCR = () => {
  const [source, setSource] = useState<PreviewSource>(SAMPLE_SOURCE)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [state, setState] = useState<RecognitionState>('idle')
  const [statusText, setStatusText] = useState('等待初始化 PaddleOCR 引擎')
  const [recognizedItems, setRecognizedItems] = useState<OcrResultItem[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [summary, setSummary] = useState<InitializationSummary | null>(null)
  const ocrRef = useRef<Awaited<ReturnType<typeof PaddleOCR.create>> | null>(null)
  const sourceRef = useRef<PreviewSource>(SAMPLE_SOURCE)

  useEffect(() => {
    sourceRef.current = source
  }, [source])

  const rawText = useMemo(
    () => recognizedItems.map(item => item.text.trim()).filter(Boolean).join('\n'),
    [recognizedItems]
  )

  const onUpload = (file: File | null) => {
    if (!file) return

    setSource(current => {
      if (isBlobUrl(current.url)) {
        URL.revokeObjectURL(current.url)
      }

      return {
        url: URL.createObjectURL(file),
        name: file.name,
        file
      }
    })

    setRecognizedItems([])
    setErrorMessage('')
    setState(ocrRef.current ? 'ready' : 'idle')
    setStatusText(
      ocrRef.current
        ? '图片已更新，可以开始 PaddleOCR 识别'
        : '图片已更新，请先初始化 PaddleOCR 引擎'
    )
  }

  const useSampleImage = async () => {
    const response = await fetch(testImage)
    const blob = await response.blob()
    const file = new File([blob], 'test.png', { type: blob.type || 'image/png' })

    setSource(current => {
      if (isBlobUrl(current.url)) {
        URL.revokeObjectURL(current.url)
      }

      return {
        url: testImage,
        name: 'test.png',
        file
      }
    })

    setRecognizedItems([])
    setErrorMessage('')
    setState(ocrRef.current ? 'ready' : 'idle')
    setStatusText(
      ocrRef.current
        ? '示例图已加载，可以开始 PaddleOCR 识别'
        : '示例图已加载，请先初始化 PaddleOCR 引擎'
    )
  }

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
  }

  const initOCR = async () => {
    if (ocrRef.current) {
      setState('ready')
      setStatusText('PaddleOCR 引擎已就绪')
      return
    }

    setState('loading')
    setErrorMessage('')
    setStatusText('正在初始化 PaddleOCR，首次会加载模型和本地 wasm 资源...')

    try {
      const ocr = await PaddleOCR.create({
        lang: 'ch',
        ocrVersion: 'PP-OCRv5',
        ortOptions: {
          backend: 'wasm',
          wasmPaths: {
            wasm: ORT_WASM_FILE
          }
        }
      })

      ocrRef.current = ocr
      const initSummary = ocr.getInitializationSummary()
      setSummary(initSummary)
      setState('ready')
      setStatusText(
        initSummary
          ? `PaddleOCR 引擎已就绪，当前后端：${initSummary.backend}`
          : 'PaddleOCR 引擎已就绪'
      )
    } catch (error) {
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'PaddleOCR 初始化失败')
      setStatusText('初始化失败，请查看错误信息')
    }
  }

  const startRecognition = async () => {
    if (!ocrRef.current) {
      setStatusText('请先初始化 PaddleOCR 引擎')
      return
    }

    const currentSource = sourceRef.current
    if (!currentSource.file) {
      setStatusText('当前图片未准备好，请重新上传或切换示例图')
      return
    }

    try {
      setState('recognizing')
      setErrorMessage('')
      setStatusText('正在识别图片中的中文房间名...')

      const [result] = await ocrRef.current.predict(currentSource.file)
      setRecognizedItems(result?.items ?? [])
      setState('done')
      setStatusText(
        result
          ? `识别完成，共找到 ${result.items.length} 条文本，耗时 ${Math.round(result.metrics.totalMs)} ms`
          : '识别完成，但未返回结果'
      )
    } catch (error) {
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'PaddleOCR 识别失败')
      setStatusText('识别失败，请查看错误信息')
    }
  }

  const copyToClipboard = async () => {
    if (!rawText) return

    try {
      await navigator.clipboard.writeText(rawText)
      setStatusText('识别文本已复制')
    } catch {
      setStatusText('复制失败，请手动复制')
    }
  }

  useEffect(() => {
    return () => {
      const currentSource = sourceRef.current
      if (isBlobUrl(currentSource.url)) {
        URL.revokeObjectURL(currentSource.url)
      }

      const currentOcr = ocrRef.current
      if (currentOcr) {
        void currentOcr.dispose()
      }
    }
  }, [])

  return (
    <div className="ocr-lab">
      <header className="lab-header">
        <div className="lab-heading">
          <p className="lab-kicker">PaddleOCR 设置页</p>
          <h1>PaddleOCR 中文识别测试</h1>
          <p className="lab-subtitle">
            这里专门验证 PaddleOCR 在浏览器端对户型图中文标签的识别效果。当前版本只覆写最终的 wasm 二进制路径，避免 Vite 把 `/public` 下的 `.mjs` 当源码模块处理。
          </p>
        </div>

        <div className="lab-actions">
          <label className="upload-button">
            上传图片
            <input
              type="file"
              accept="image/*"
              onChange={(event) => onUpload(event.target.files?.[0] ?? null)}
            />
          </label>
          <button type="button" className="secondary-button" onClick={useSampleImage}>
            使用示例图
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={initOCR}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? '初始化中...' : '初始化 PaddleOCR'}
          </button>
          <button
            type="button"
            className="secondary-button primary-action"
            onClick={startRecognition}
            disabled={state === 'loading' || state === 'recognizing' || !source.file}
          >
            {state === 'recognizing' ? '识别中...' : '开始 PaddleOCR 识别'}
          </button>
        </div>
      </header>

      <main className="lab-grid">
        <section className="lab-stack">
          <article className="preview-card">
            <div className="card-heading">
              <div>
                <span className="section-label">输入图</span>
                <h2>原始平面图 + 识别框覆盖</h2>
              </div>
              <div className="status-pills">
                <span>当前文件：{source.name}</span>
                <span>状态：{state}</span>
                {imageSize.width > 0 && (
                  <span>
                    尺寸：{imageSize.width} x {imageSize.height}
                  </span>
                )}
              </div>
            </div>

            {source.url ? (
              <div className="ocr-image-container">
                <img
                  src={source.url}
                  alt="ocr source"
                  className="ocr-source"
                  onLoad={onImageLoad}
                />
                {imageSize.width > 0 && recognizedItems.length > 0 && (
                  <svg
                    className="ocr-overlay"
                    viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                    preserveAspectRatio="none"
                  >
                    {recognizedItems.map((item, index) => {
                      const { x, y } = getBounds(item.poly)
                      return (
                        <g key={`${item.text}-${index}`}>
                          <polygon
                            points={polygonPoints(item.poly)}
                            fill="rgba(196, 166, 132, 0.18)"
                            stroke="#8a6846"
                            strokeWidth="2"
                          />
                          <text
                            x={x}
                            y={Math.max(16, y - 6)}
                            fontSize="14"
                            fill="#5f452f"
                          >
                            {item.text} ({Math.round(item.score * 100)}%)
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                )}
              </div>
            ) : (
              <div className="empty-placeholder">
                <p>请先上传一张户型图</p>
              </div>
            )}

            {errorMessage && <p className="error-text">{errorMessage}</p>}
          </article>
        </section>

        <aside className="side-panel">
          <div className="panel-block">
            <h2>识别结果</h2>
            <p className="panel-note">
              当前页面使用 PaddleOCR 浏览器方案。首次初始化会加载 OCR 模型和本地 ONNX Runtime wasm 文件，所以会比后续识别慢一些。
            </p>
          </div>

          <div className="panel-block">
            <h3>运行提示</h3>
            <p className="panel-note">
              现在只依赖 `/onnxruntime/ort-wasm-simd-threaded.jsep.wasm` 这一个静态文件。`.mjs` 继续使用包内版本，因此不会再触发 Vite 对 `/public/*.mjs` 的限制。
            </p>
          </div>

          {summary && (
            <div className="panel-block details">
              <h3>初始化摘要</h3>
              <div className="text-list compact-list">
                <div className="text-item high">
                  <span className="text-content">后端</span>
                  <span className="text-confidence">{summary.backend}</span>
                </div>
                <div className="text-item high">
                  <span className="text-content">检测 Provider</span>
                  <span className="text-confidence">{summary.detProvider}</span>
                </div>
                <div className="text-item high">
                  <span className="text-content">识别 Provider</span>
                  <span className="text-confidence">{summary.recProvider}</span>
                </div>
                <div className="text-item high">
                  <span className="text-content">初始化耗时</span>
                  <span className="text-confidence">{Math.round(summary.elapsedMs)} ms</span>
                </div>
              </div>
            </div>
          )}

          {recognizedItems.length > 0 && (
            <>
              <div className="panel-block details">
                <h3>文本列表（{recognizedItems.length}）</h3>
                <div className="text-list">
                  {recognizedItems.map((item, index) => (
                    <div key={`${item.text}-${index}`} className="text-item high">
                      <span className="text-content">{item.text}</span>
                      <span className="text-confidence">{Math.round(item.score * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-block details">
                <div className="raw-text-header">
                  <h3>原始文本</h3>
                  <button type="button" className="copy-button" onClick={copyToClipboard}>
                    复制
                  </button>
                </div>
                <pre className="raw-text">{rawText || '未识别到文本'}</pre>
              </div>
            </>
          )}

          <div className="panel-block">
            <p className="panel-note">{statusText}</p>
          </div>
        </aside>
      </main>
    </div>
  )
}
