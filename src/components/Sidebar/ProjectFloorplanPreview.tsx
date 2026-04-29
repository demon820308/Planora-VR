import { useEffect, useState } from 'react'
import {
  getImportedSidebarFloorplanUrl,
  IMPORTED_PANORAMA_UPDATE_EVENT
} from '../../utils/projectImageAssets'
import './ProjectFloorplanPreview.css'

interface ProjectFloorplanPreviewProps {
  styleName: string
}

export const ProjectFloorplanPreview = ({ styleName }: ProjectFloorplanPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadPreview = async () => {
      try {
        const nextUrl = await getImportedSidebarFloorplanUrl(styleName)
        if (!cancelled) {
          setPreviewUrl(nextUrl)
        }
      } catch {
        if (!cancelled) {
          setPreviewUrl(null)
        }
      }
    }

    void loadPreview()

    const reload = () => {
      void loadPreview()
    }

    window.addEventListener(IMPORTED_PANORAMA_UPDATE_EVENT, reload)
    window.addEventListener('storage', reload)

    return () => {
      cancelled = true
      window.removeEventListener(IMPORTED_PANORAMA_UPDATE_EVENT, reload)
      window.removeEventListener('storage', reload)
    }
  }, [styleName])

  return (
    <>
      <div className="project-floorplan-preview">
        {previewUrl ? (
          <button
            type="button"
            className="project-floorplan-button"
            onClick={() => setIsExpanded(true)}
            aria-label="放大查看展示户型图"
            title="放大查看展示户型图"
          >
            <img src={previewUrl} alt={`${styleName} 户型展示图`} className="project-floorplan-image" />
          </button>
        ) : (
          <div className="project-floorplan-empty">
            <p>导入文件夹中的“户型图.png / 户型图.jpg”后，这里会显示展示图。</p>
          </div>
        )}
      </div>

      {isExpanded && previewUrl && (
        <div
          className="project-floorplan-lightbox"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="project-floorplan-lightbox-dialog"
            onClick={event => event.stopPropagation()}
          >
            <div className="project-floorplan-lightbox-header">
              <h3>展示户型图放大预览</h3>
              <button
                type="button"
                className="project-floorplan-lightbox-close"
                onClick={() => setIsExpanded(false)}
              >
                关闭
              </button>
            </div>
            <div className="project-floorplan-lightbox-stage">
              <img
                src={previewUrl}
                alt={`${styleName} 户型展示图`}
                className="project-floorplan-lightbox-image"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
