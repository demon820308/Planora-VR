import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { PROJECT_STYLE_OPTIONS } from '../../data/projectStyleOptions'
import {
  FloorplanRegion,
  analyzeFloorplanImage,
  buildFloorplanSvg,
  regionsToSvgPoints
} from '../../utils/floorplanAuto'
import {
  clearFloorplanOverrides,
  saveFloorplanOverrides
} from '../../utils/floorplanOverrides'
import { recognizeFloorplanLabels } from '../../utils/floorplanOcr'
import {
  clearImportedStyleAssets,
  getImportedAssetSummary,
  replaceImportedStyleAssets
} from '../../utils/projectImageAssets'
import {
  loadPanoramaSourceConfig,
  savePanoramaSourceConfig
} from '../../utils/panoramaSourceConfig'
import './TestFloorplanLab.css'

type OcrStatus = 'idle' | 'running' | 'done' | 'error'

interface EditableRegion extends FloorplanRegion {
  label: string
  enabled: boolean
}

interface ImageSize {
  width: number
  height: number
}

interface ImportReport {
  importedRoomCount: number
  unmatchedFiles: string[]
  missingRooms: string[]
  sidebarFloorplanFileName: string | null
}

const FLOORPLAN_NAME_PATTERN = /^户型图\.(png|jpg|jpeg|webp)$/i
const IMAGE_FILE_PATTERN = /\.(png|jpg|jpeg|webp)$/i

const defaultRegionLabel = (index: number) => `区域 ${index + 1}`

const isDefaultRegionLabel = (value: string) => /^区域\s*\d+$/i.test(value.trim())

const normalizeName = (value: string) => value.replace(/\s+/g, ' ').trim()

const stripExtension = (fileName: string) => fileName.replace(/\.[^.]+$/, '')

const fileToDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })

const pointInPolygon = (point: { x: number; y: number }, points: Array<[number, number]>) => {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    const intersects = ((yi > point.y) !== (yj > point.y))
      && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-7) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

const pointInBounds = (
  point: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number }
) => {
  return point.x >= bounds.x
    && point.x <= bounds.x + bounds.width
    && point.y >= bounds.y
    && point.y <= bounds.y + bounds.height
}

const createEditableRegions = (regions: FloorplanRegion[]) =>
  regions.map((region, index) => ({
    ...region,
    label: defaultRegionLabel(index),
    enabled: true
  }))

const buildImportAlert = (report: ImportReport) => {
  const lines: string[] = ['请检查效果图命名。']

  if (report.unmatchedFiles.length > 0) {
    lines.push('', '以下文件未匹配到房间名：')
    report.unmatchedFiles.forEach(fileName => lines.push(`- ${fileName}`))
  }

  if (report.missingRooms.length > 0) {
    lines.push('', '以下房间还没有对应效果图：')
    report.missingRooms.forEach(roomName => lines.push(`- ${roomName}`))
  }

  return lines.join('\n')
}

export const TestFloorplanLab = () => {
  const initialConfig = useMemo(() => loadPanoramaSourceConfig(), [])
  const [selectedStyleName, setSelectedStyleName] = useState(initialConfig.selectedStyleName)
  const [threshold, setThreshold] = useState(222)
  const [dilation, setDilation] = useState(1)
  const [minArea, setMinArea] = useState(1200)
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null)
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<ImageSize | null>(null)
  const [regions, setRegions] = useState<EditableRegion[]>([])
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [importReport, setImportReport] = useState<ImportReport | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const folderInputRef = useRef<HTMLInputElement | null>(null)

  const selectedRegion = useMemo(
    () => regions.find(region => region.id === selectedRegionId) || null,
    [regions, selectedRegionId]
  )

  const namedRegions = useMemo(
    () => regions.filter(region => region.enabled && normalizeName(region.label) && !isDefaultRegionLabel(region.label)),
    [regions]
  )

  const svgMarkup = useMemo(() => {
    if (!imageSize || regions.length === 0) return null
    return buildFloorplanSvg(regions, {
      width: imageSize.width,
      height: imageSize.height,
      selectedRegionId,
      title: 'Floorplan preview'
    })
  }, [imageSize, regions, selectedRegionId])

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '')
      folderInputRef.current.setAttribute('directory', '')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadSummary = async () => {
      try {
        const summary = await getImportedAssetSummary(selectedStyleName)
        if (cancelled) return
        setImportReport({
          importedRoomCount: summary.panoramas.length,
          unmatchedFiles: [],
          missingRooms: [],
          sidebarFloorplanFileName: summary.sidebarFloorplanFileName
        })
      } catch {
        if (!cancelled) {
          setImportReport(null)
        }
      }
    }

    void loadSummary()

    return () => {
      cancelled = true
    }
  }, [selectedStyleName])

  const persistStyleName = (styleName: string) => {
    const current = loadPanoramaSourceConfig()
    savePanoramaSourceConfig({
      ...current,
      selectedStyleName: styleName
    })
  }

  const runAnalysis = async (imageUrl: string) => {
    setIsAnalyzing(true)
    setErrorText(null)

    try {
      const image = await loadImageElement(imageUrl)
      const analyzed = await analyzeFloorplanImage(image, {
        threshold,
        dilation,
        minArea
      })

      const editableRegions = createEditableRegions(analyzed)
      setRegions(editableRegions)
      setSelectedRegionId(editableRegions[0]?.id || null)
      setImageSize({
        width: image.naturalWidth,
        height: image.naturalHeight
      })
      setOcrStatus('idle')
    } catch (error) {
      setRegions([])
      setSelectedRegionId(null)
      setErrorText(error instanceof Error ? error.message : '热区分析失败')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetForNewImage = () => {
    setRegions([])
    setSelectedRegionId(null)
    setOcrStatus('idle')
    setImportReport(null)
    setErrorText(null)
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    event.target.value = ''
    if (!nextFile) return

    resetForNewImage()
    setSourceImageFile(nextFile)

    try {
      const dataUrl = await fileToDataUrl(nextFile)
      setSourceImageUrl(dataUrl)
      await runAnalysis(dataUrl)
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '上传图片失败')
    }
  }

  const handleReanalyze = async () => {
    if (!sourceImageUrl) return
    await runAnalysis(sourceImageUrl)
  }

  const handleRecognizeLabels = async () => {
    if (!sourceImageFile || regions.length === 0) return

    setOcrStatus('running')
    setErrorText(null)

    try {
      const labels = await recognizeFloorplanLabels(sourceImageFile)
      const bestMatches = new Map<string, { text: string; score: number }>()

      labels.forEach(label => {
        const polygonMatch = regions.find(region => pointInPolygon(label.center, region.points))
        const boundsMatch = polygonMatch || regions.find(region => pointInBounds(label.center, region.bounds))
        if (!boundsMatch) return

        const previous = bestMatches.get(boundsMatch.id)
        if (!previous || label.score > previous.score || label.text.length > previous.text.length) {
          bestMatches.set(boundsMatch.id, {
            text: normalizeName(label.text),
            score: label.score
          })
        }
      })

      setRegions(current => current.map((region, index) => {
        const matched = bestMatches.get(region.id)
        if (!matched) return region

        if (!isDefaultRegionLabel(region.label) && normalizeName(region.label) !== matched.text) {
          return region
        }

        return {
          ...region,
          label: matched.text || defaultRegionLabel(index)
        }
      }))
      setOcrStatus('done')
    } catch (error) {
      setOcrStatus('error')
      setErrorText(error instanceof Error ? error.message : '房间名识别失败')
    }
  }

  const handleRegionLabelChange = (regionId: string, label: string) => {
    setRegions(current => current.map(region => (
      region.id === regionId
        ? { ...region, label }
        : region
    )))
  }

  const handleRegionEnabledChange = (regionId: string, enabled: boolean) => {
    setRegions(current => current.map(region => (
      region.id === regionId
        ? { ...region, enabled }
        : region
    )))
  }

  const handleApplyToHomepage = () => {
    if (!imageSize) return

    saveFloorplanOverrides({
      version: 2,
      updatedAt: new Date().toISOString(),
      previewImageUrl: sourceImageUrl || undefined,
      viewBox: imageSize,
      regions: regions.map(region => ({
        label: normalizeName(region.label),
        enabled: region.enabled,
        points: regionsToSvgPoints(region.points)
      }))
    })

    window.dispatchEvent(new Event('floorplan-overrides-updated'))
  }

  const handleClearHomepageApply = () => {
    clearFloorplanOverrides()
    window.dispatchEvent(new Event('floorplan-overrides-updated'))
  }

  const handleFolderImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (files.length === 0) return

    const roomNames = namedRegions.map(region => normalizeName(region.label))
    if (roomNames.length === 0) {
      setErrorText('请先完成房间名识别，再导入效果图文件夹。')
      return
    }

    const imageFiles = files.filter(file =>
      file.type.startsWith('image/') || IMAGE_FILE_PATTERN.test(file.name)
    )

    const sidebarFloorplan = imageFiles.find(file => FLOORPLAN_NAME_PATTERN.test(file.name)) || null
    const matchedRoomNames = new Set<string>()
    const unmatchedFiles: string[] = []
    const panoramas: Array<{ roomName: string; fileName: string; blob: Blob }> = []

    imageFiles.forEach(file => {
      if (sidebarFloorplan && file === sidebarFloorplan) {
        return
      }

      const roomName = normalizeName(stripExtension(file.name))
      if (roomNames.includes(roomName) && !matchedRoomNames.has(roomName)) {
        matchedRoomNames.add(roomName)
        panoramas.push({
          roomName,
          fileName: file.name,
          blob: file
        })
      } else {
        unmatchedFiles.push(file.name)
      }
    })

    const missingRooms = roomNames.filter(roomName => !matchedRoomNames.has(roomName))

    try {
      await replaceImportedStyleAssets(
        selectedStyleName,
        panoramas,
        sidebarFloorplan
          ? { fileName: sidebarFloorplan.name, blob: sidebarFloorplan }
          : null
      )

      const summary = await getImportedAssetSummary(selectedStyleName)
      const nextReport: ImportReport = {
        importedRoomCount: summary.panoramas.length,
        unmatchedFiles,
        missingRooms,
        sidebarFloorplanFileName: summary.sidebarFloorplanFileName
      }

      setImportReport(nextReport)

      if (unmatchedFiles.length > 0 || missingRooms.length > 0) {
        window.alert(buildImportAlert(nextReport))
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '效果图导入失败')
    }
  }

  const handleClearImportedAssets = async () => {
    try {
      await clearImportedStyleAssets(selectedStyleName)
      setImportReport({
        importedRoomCount: 0,
        unmatchedFiles: [],
        missingRooms: [],
        sidebarFloorplanFileName: null
      })
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '清空当前风格图片失败')
    }
  }

  return (
    <div className="floorplan-lab">
      <header className="lab-header">
        <div className="lab-heading">
          <span className="lab-kicker">户型图自动热区测试</span>
          <h1>上传一张极简二维平面图，自动生成 SVG 热区</h1>
          <p className="lab-subtitle">分析封闭房间区域，识别房间名</p>
        </div>

        <div className="lab-actions">
          <label className="upload-button">
            上传白底户型导航图
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void handleRecognizeLabels()}
            disabled={!sourceImageFile || regions.length === 0 || ocrStatus === 'running'}
          >
            {ocrStatus === 'running' ? '识别中...' : '自动识别热区名称'}
          </button>
          <button
            type="button"
            className="secondary-button primary-action"
            onClick={handleApplyToHomepage}
            disabled={!sourceImageUrl || regions.length === 0}
          >
            一键应用到首页
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleClearHomepageApply}
          >
            清除首页应用
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsHelpOpen(true)}
          >
            使用帮助
          </button>
        </div>
      </header>

      <div className="lab-grid">
        <div className="lab-stack">
          <section className="preview-card">
            <div className="card-heading">
              <div>
                <span className="section-label">输入图</span>
                <h2>原始上传图 + 自动描边</h2>
              </div>

              <div className="status-pills">
                <span>{sourceImageFile ? `当前文件：${sourceImageFile.name}` : '当前文件：未上传'}</span>
                <span>热区：{regions.length}</span>
                <span>OCR：{ocrStatus}</span>
              </div>
            </div>

            <div className="slider-grid">
              <label>
                线条阈值 {threshold}
                <input
                  type="range"
                  min="160"
                  max="245"
                  value={threshold}
                  onChange={event => setThreshold(Number(event.target.value))}
                />
              </label>
              <label>
                膨胀像素 {dilation}
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={dilation}
                  onChange={event => setDilation(Number(event.target.value))}
                />
              </label>
              <label>
                最小面积 {minArea}
                <input
                  type="range"
                  min="400"
                  max="6000"
                  step="100"
                  value={minArea}
                  onChange={event => setMinArea(Number(event.target.value))}
                />
              </label>
            </div>

            <div className="config-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleReanalyze()}
                disabled={!sourceImageUrl || isAnalyzing}
              >
                {isAnalyzing ? '重新分析中...' : '重新分析热区'}
              </button>
            </div>

            <div className="floorplan-stage">
              {sourceImageUrl && imageSize ? (
                <div
                  className="floorplan-stage-inner"
                  style={{ aspectRatio: `${imageSize.width} / ${imageSize.height}` }}
                >
                  <svg
                    className="floorplan-preview-svg"
                    viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <image
                      href={sourceImageUrl}
                      x="0"
                      y="0"
                      width={imageSize.width}
                      height={imageSize.height}
                      preserveAspectRatio="none"
                    />

                    {regions.map((region, index) => (
                      <g key={region.id}>
                        <polygon
                          points={regionsToSvgPoints(region.points)}
                          className={[
                            'lab-region',
                            selectedRegionId === region.id ? 'active' : '',
                            region.enabled ? '' : 'disabled'
                          ].filter(Boolean).join(' ')}
                          onClick={() => {
                            if (region.enabled) {
                              setSelectedRegionId(region.id)
                            }
                          }}
                        />
                        <text
                          x={Math.round(region.centroid.x)}
                          y={Math.round(region.centroid.y) - 8}
                          className="region-label"
                        >
                          {normalizeName(region.label) || defaultRegionLabel(index)}
                        </text>
                        <text
                          x={Math.round(region.centroid.x)}
                          y={Math.round(region.centroid.y) + 14}
                          className="region-index"
                        >
                          #{index + 1}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <p className="result-footnote">上传一张极简二维平面图后，这里会显示识别结果。</p>
              )}
            </div>

            {errorText && <p className="error-text">{errorText}</p>}
          </section>

          <section className="preview-card result-card">
            <div className="card-heading">
              <div>
                <span className="section-label">结果图</span>
                <h2>生成后的 SVG 热区预览</h2>
              </div>
              <p className="card-note">结果图用于检查房间边界和命名是否稳定，再决定是否一键应用到首页。</p>
            </div>

            <div className="result-stage">
              {svgMarkup && imageSize ? (
                <div
                  className="result-stage-inner"
                  style={{ aspectRatio: `${imageSize.width} / ${imageSize.height}` }}
                >
                  <svg
                    className="floorplan-preview-svg"
                    viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <rect width={imageSize.width} height={imageSize.height} fill="#ffffff" />
                    {regions.map((region, index) => (
                      <g key={region.id}>
                        <polygon
                          points={regionsToSvgPoints(region.points)}
                          fill={selectedRegionId === region.id ? 'rgba(184, 153, 122, 0.92)' : '#ffffff'}
                          fillOpacity={region.enabled ? 1 : 0.55}
                          stroke="#42372c"
                          strokeWidth={selectedRegionId === region.id ? 4 : 3}
                          strokeDasharray={region.enabled ? undefined : '10 8'}
                          strokeLinejoin="round"
                        />
                        <text
                          x={Math.round(region.centroid.x)}
                          y={Math.round(region.centroid.y)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="region-label"
                        >
                          {normalizeName(region.label) || defaultRegionLabel(index)}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <p className="result-footnote">生成热区后，这里会显示更干净的 SVG 结果图。</p>
              )}
            </div>
          </section>
        </div>

        <aside className="side-panel">
          <div className="panel-block">
            <h2>项目设置</h2>
            <p className="panel-note">首页现在只显示一个风格。房间效果图会按“文件名主干 = 房间名”匹配，并保存在当前浏览器本地。</p>

            <label className="label-editor">
              <span>当前项目风格</span>
              <select
                value={selectedStyleName}
                onChange={event => {
                  setSelectedStyleName(event.target.value)
                  persistStyleName(event.target.value)
                }}
              >
                {PROJECT_STYLE_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

          </div>

          {namedRegions.length > 0 && (
            <div className="panel-block">
              <h3>效果图导入</h3>
              <p className="panel-note">在“自动识别热区名称”之后，再导入当前风格的整套图片文件夹。文件夹中可额外包含“户型图.png”或“户型图.jpg”，它会显示在首页左侧空白区域。</p>

              <div className="config-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => folderInputRef.current?.click()}
                >
                  选择文件夹批量导入
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleClearImportedAssets()}
                >
                  清空当前风格图片
                </button>
              </div>

              <input
                ref={folderInputRef}
                type="file"
                className="hidden-file-input"
                multiple
                {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                onChange={handleFolderImport}
              />

              {importReport && (
                <div className="details">
                  <p>已导入房间图：{importReport.importedRoomCount}</p>
                  <p>展示户型图：{importReport.sidebarFloorplanFileName || '未导入'}</p>
                  {importReport.unmatchedFiles.length > 0 && (
                    <p>未匹配文件：{importReport.unmatchedFiles.join('、')}</p>
                  )}
                  {importReport.missingRooms.length > 0 && (
                    <p>缺失房间：{importReport.missingRooms.join('、')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="panel-block">
            <h3>热区列表</h3>
            <div className="panel-list">
              {regions.map((region, index) => (
                <div
                  key={region.id}
                  className={[
                    'region-row',
                    selectedRegionId === region.id ? 'active' : '',
                    region.enabled ? '' : 'disabled'
                  ].filter(Boolean).join(' ')}
                >
                  <button
                    type="button"
                    className="region-row-main"
                    onClick={() => setSelectedRegionId(region.id)}
                  >
                    <div>
                      <strong>{normalizeName(region.label) || defaultRegionLabel(index)}</strong>
                      <p>{region.area.toLocaleString('zh-CN')} px</p>
                    </div>
                    <span>{region.id}</span>
                  </button>

                  <label className="region-toggle">
                    <input
                      type="checkbox"
                      checked={region.enabled}
                      onChange={event => handleRegionEnabledChange(region.id, event.target.checked)}
                    />
                    可点击
                  </label>
                </div>
              ))}
            </div>
          </div>

          {selectedRegion && (
            <div className="panel-block">
              <h3>当前热区</h3>
              <label className="label-editor">
                <span>房间名</span>
                <input
                  type="text"
                  value={selectedRegion.label}
                  onChange={event => handleRegionLabelChange(selectedRegion.id, event.target.value)}
                  placeholder="请输入房间名"
                />
              </label>

              <label className="toggle-editor">
                <input
                  type="checkbox"
                  checked={selectedRegion.enabled}
                  onChange={event => handleRegionEnabledChange(selectedRegion.id, event.target.checked)}
                />
                这个热区可点击
              </label>

              <div className="details">
                <p>bounds: {selectedRegion.bounds.x}, {selectedRegion.bounds.y}, {selectedRegion.bounds.width}, {selectedRegion.bounds.height}</p>
                <p>points: {selectedRegion.points.length}</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {isHelpOpen && (
        <div className="help-overlay" onClick={() => setIsHelpOpen(false)}>
          <div className="help-dialog" onClick={event => event.stopPropagation()}>
            <div className="help-header">
              <div>
                <span className="lab-kicker">使用帮助</span>
                <h2>站点完整使用教程</h2>
              </div>
              <button
                type="button"
                className="help-close"
                onClick={() => setIsHelpOpen(false)}
              >
                关闭
              </button>
            </div>

            <div className="help-content">
              <section className="help-section">
                <h3>1. 整体流程</h3>
                <ol>
                  <li>进入设置页，上传一张用于识别的极简二维平面图。</li>
                  <li>系统先分析封闭房间区域，生成 SVG 热区。</li>
                  <li>点击“自动识别热区名称”，让 PaddleOCR 读取房间名。</li>
                  <li>确认热区名字无误后，选择当前项目风格。</li>
                  <li>导入当前风格的整套效果图文件夹。</li>
                  <li>点击“一键应用到首页”，回首页查看最终效果。</li>
                </ol>
              </section>

              <section className="help-section">
                <h3>2. 户型图要求</h3>
                <ul>
                  <li>建议使用白底、黑灰线条、房间边界闭合的极简二维平面图。</li>
                  <li>房间名称尽量写在房间中心位置，避免压在线条或尺寸标注上。</li>
                  <li>如果识别结果偏差较大，可以先调整“线条阈值、膨胀像素、最小面积”，再重新分析热区。</li>
                </ul>
              </section>

              <section className="help-section">
                <h3>3. 热区识别与房间命名</h3>
                <ul>
                  <li>上传图片后，系统会先生成默认热区名，例如“区域 1、区域 2”。</li>
                  <li>点击“自动识别热区名称”后，识别到的房间名会替换默认名字。</li>
                  <li>如果某个房间名识别不准，可以在右侧“当前热区”里手动修改。</li>
                  <li>不需要显示到首页的区域，可以关闭“可点击”。</li>
                </ul>
              </section>

              <section className="help-section">
                <h3>4. 当前项目风格</h3>
                <ul>
                  <li>首页现在只显示一个风格。</li>
                  <li>你在设置页选择哪个风格，一键应用后，首页就显示这个风格。</li>
                </ul>
              </section>

              <section className="help-section">
                <h3>5. 效果图文件夹导入规则</h3>
                <ul>
                  <li>只有在识别出房间名之后，才会出现“选择文件夹批量导入”。</li>
                  <li>房间效果图必须按“文件名主干 = 房间名”命名。</li>
                  <li>例如识别出的房间名是“主卧A、客厅、书房”，文件夹里就应存在“主卧A.jpg、客厅.png、书房.jpg”。</li>
                  <li>系统不区分 jpg、jpeg、png、webp，只看文件名主干是否与房间名一致。</li>
                </ul>
              </section>

              <section className="help-section">
                <h3>6. 文件夹中的户型图.png / 户型图.jpg</h3>
                <ul>
                  <li>如果文件夹里包含“户型图.png”或“户型图.jpg”，系统会把它当成首页左侧的展示户型图。</li>
                  <li>这张展示图不参与首页热区叠加，所以不会影响底部热点图的对齐。</li>
                </ul>
              </section>

              <section className="help-section">
                <h3>7. 一键应用到首页</h3>
                <ul>
                  <li>会把当前热区轮廓、房间名、启用状态和底部热点图一起同步到首页。</li>
                  <li>首页左侧房间列表只显示“有名字 + 已启用”的热区。</li>
                  <li>首页主视图会优先读取你刚导入到本地的房间效果图。</li>
                </ul>
              </section>

              <section className="help-section">
                <h3>8. 清除首页应用与清空当前风格图片</h3>
                <ul>
                  <li>“清除首页应用”只会移除首页正在使用的热区和底部热点图结果。</li>
                  <li>“清空当前风格图片”会删除当前风格已导入到浏览器本地的效果图和展示户型图。</li>
                  <li>这两个动作互不替代，建议按需要分别使用。</li>
                </ul>
              </section>

              <section className="help-section">
                <h3>9. 常见问题</h3>
                <ul>
                  <li>如果热区识别偏了，先调阈值，再重新分析热区。</li>
                  <li>如果房间名没识别出来，先检查原图中文是否清晰，再手动修改。</li>
                  <li>如果导入后提示“请检查效果图命名”，通常是文件名与房间名没有完全一致。</li>
                  <li>如果首页没看到某个房间，先确认它是否有名字，并且“可点击”处于开启状态。</li>
                </ul>
              </section>

              <section className="help-section">
                <h3>10. 推荐操作顺序</h3>
                <ol>
                  <li>上传户型图。</li>
                  <li>重新分析热区，直到边界稳定。</li>
                  <li>自动识别热区名称。</li>
                  <li>手动修正少量错误房间名。</li>
                  <li>选择当前项目风格。</li>
                  <li>批量导入效果图文件夹。</li>
                  <li>检查导入结果。</li>
                  <li>一键应用到首页。</li>
                </ol>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
