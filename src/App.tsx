import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { FloorplanMap } from './components/Floorplan/FloorplanMap'
import { AppShell } from './components/Layout/AppShell'
import { PanoramaViewer } from './components/Panorama/PanoramaViewer'
import { Sidebar } from './components/Sidebar/Sidebar'
import { rooms } from './data/rooms'
import { PanoramaStatus, ViewerState } from './types'
import { resolveHomepageRooms } from './utils/floorplanOverrides'
import { getProjectStyle } from './utils/panoramaPath'
import { preloadRoomStyles, preloadStyleRooms } from './utils/preloadImages'
import { IMPORTED_PANORAMA_UPDATE_EVENT } from './utils/projectImageAssets'

const TestFloorplanLab = lazy(async () =>
  import('./components/TestFloorplanLab/TestFloorplanLab').then(module => ({ default: module.TestFloorplanLab }))
)

const MainApp = () => {
  const [currentRoomId, setCurrentRoomId] = useState('master-bedroom-a')
  const [panoramaStatus, setPanoramaStatus] = useState<PanoramaStatus>('loading')
  const [roomSourceVersion, setRoomSourceVersion] = useState(0)
  const [sourceConfigVersion, setSourceConfigVersion] = useState(0)
  const [assetVersion, setAssetVersion] = useState(0)
  const [viewerState, setViewerState] = useState<ViewerState>({
    yaw: 0,
    pitch: 0,
    hfov: 100
  })

  useEffect(() => {
    const syncOverrides = () => setRoomSourceVersion(value => value + 1)
    const syncSourceConfig = () => setSourceConfigVersion(value => value + 1)
    const syncAssets = () => setAssetVersion(value => value + 1)

    window.addEventListener('floorplan-overrides-updated', syncOverrides)
    window.addEventListener('panorama-source-config-updated', syncSourceConfig)
    window.addEventListener(IMPORTED_PANORAMA_UPDATE_EVENT, syncAssets)
    window.addEventListener('storage', syncOverrides)
    window.addEventListener('storage', syncSourceConfig)
    window.addEventListener('storage', syncAssets)

    return () => {
      window.removeEventListener('floorplan-overrides-updated', syncOverrides)
      window.removeEventListener('panorama-source-config-updated', syncSourceConfig)
      window.removeEventListener(IMPORTED_PANORAMA_UPDATE_EVENT, syncAssets)
      window.removeEventListener('storage', syncOverrides)
      window.removeEventListener('storage', syncSourceConfig)
      window.removeEventListener('storage', syncAssets)
    }
  }, [])

  const availableRooms = useMemo(() => resolveHomepageRooms(rooms), [roomSourceVersion])
  const currentStyle = useMemo(() => getProjectStyle(), [sourceConfigVersion])
  const availableStyles = useMemo(() => [currentStyle], [currentStyle])

  const currentRoom = useMemo(
    () => availableRooms.find(room => room.id === currentRoomId) || availableRooms[0] || rooms[0],
    [availableRooms, currentRoomId]
  )

  useEffect(() => {
    if (!availableRooms.some(room => room.id === currentRoomId) && availableRooms[0]) {
      setCurrentRoomId(availableRooms[0].id)
      setPanoramaStatus('loading')
      void preloadRoomStyles(availableRooms[0].id)
    }
  }, [availableRooms, currentRoomId])

  useEffect(() => {
    if (availableRooms.length > 0) {
      setPanoramaStatus('loading')
      void preloadStyleRooms(availableRooms.map(room => room.id))
    }
  }, [availableRooms, currentStyle.id])

  const handleStyleChange = useCallback((_styleId: string) => {
    setPanoramaStatus('loading')
  }, [])

  const handleRoomChange = useCallback((roomId: string) => {
    setCurrentRoomId(roomId)
    setPanoramaStatus('loading')
    void preloadRoomStyles(roomId)
  }, [])

  const handleFloorplanRoomClick = useCallback((roomId: string) => {
    setCurrentRoomId(roomId)
    setPanoramaStatus('loading')
    void preloadRoomStyles(roomId)
  }, [])

  const handleViewerStateChange = useCallback((state: ViewerState) => {
    setViewerState(state)
  }, [])

  const handleStatusChange = useCallback((status: PanoramaStatus) => {
    setPanoramaStatus(status)
  }, [])

  return (
    <AppShell
      sidebar={
        <Sidebar
          styles={availableStyles}
          rooms={availableRooms}
          currentStyleId={currentStyle.id}
          currentRoomId={currentRoomId}
          currentRoom={currentRoom}
          currentStyle={currentStyle}
          onStyleChange={handleStyleChange}
          onRoomChange={handleRoomChange}
        />
      }
      mainContent={
        <PanoramaViewer
          room={currentRoom}
          styleId={currentStyle.id}
          styleName={currentStyle.name}
          assetVersion={assetVersion}
          viewerState={viewerState}
          panoramaStatus={panoramaStatus}
          onViewerStateChange={handleViewerStateChange}
          onStatusChange={handleStatusChange}
        />
      }
      floorplan={
        <FloorplanMap
          rooms={availableRooms}
          currentRoomId={currentRoomId}
          onRoomClick={handleFloorplanRoomClick}
        />
      }
    />
  )
}

const App = () => {
  const [labMode, setLabMode] = useState<string | null>(null)

  useEffect(() => {
    const syncFromLocation = () => {
      const params = new URLSearchParams(window.location.search)
      const lab = params.get('lab')
      setLabMode(lab === 'floorplan' ? 'floorplan' : null)
    }

    syncFromLocation()
    window.addEventListener('popstate', syncFromLocation)

    return () => {
      window.removeEventListener('popstate', syncFromLocation)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('floorplan-lab-mode', labMode === 'floorplan')
    return () => {
      document.body.classList.remove('floorplan-lab-mode')
    }
  }, [labMode])

  const navigateTo = (newLabMode: string | null) => {
    const url = new URL(window.location.href)
    if (newLabMode === 'floorplan') {
      url.searchParams.set('lab', 'floorplan')
    } else {
      url.searchParams.delete('lab')
    }
    window.history.pushState({}, '', url.toString())
    setLabMode(newLabMode)
  }

  const handleLabButtonClick = () => {
    navigateTo(labMode === 'floorplan' ? null : 'floorplan')
  }

  const getLabButtonText = () => (
    labMode === 'floorplan' ? '返回首页' : '进入设置页'
  )

  return (
    <>
      {labMode === 'floorplan' && (
        <Suspense fallback={null}>
          <TestFloorplanLab />
        </Suspense>
      )}
      {labMode !== 'floorplan' && <MainApp />}
      <button
        type="button"
        className="lab-entry-button"
        onClick={handleLabButtonClick}
      >
        {getLabButtonText()}
      </button>
    </>
  )
}

export default App
