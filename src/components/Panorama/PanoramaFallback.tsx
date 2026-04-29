import './PanoramaFallback.css'

type FallbackStatus = 'loading' | 'missing'

interface PanoramaFallbackProps {
  status: FallbackStatus
}

export const PanoramaFallback = ({ status }: PanoramaFallbackProps) => {
  if (status === 'missing') {
    return (
      <div className="panorama-fallback missing">
        <div className="missing-icon">□</div>
        <p className="missing-hint">图片缺失</p>
      </div>
    )
  }

  return (
    <div className="panorama-fallback loading">
      <div className="loading-spinner" />
      <p className="loading-hint">正在加载全景图...</p>
    </div>
  )
}
