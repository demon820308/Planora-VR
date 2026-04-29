import { useEffect, useRef, useState } from 'react'
import 'pannellum/build/pannellum.css'
import 'pannellum/build/pannellum.js'
import { PanoramaStatus, Room, ViewerState } from '../../types'
import { getPanoramaPath, resolvePanoramaPath } from '../../utils/panoramaPath'
import { PanoramaFallback } from './PanoramaFallback'
import { PanoramaHeader } from './PanoramaHeader'
import './PanoramaViewer.css'

interface PanoramaViewerProps {
  room: Room
  styleId: string
  styleName: string
  assetVersion: number
  viewerState: ViewerState
  panoramaStatus: PanoramaStatus
  onViewerStateChange: (state: ViewerState) => void
  onStatusChange: (status: PanoramaStatus) => void
}

declare global {
  interface Window {
    pannellum?: any
  }
}

export const PanoramaViewer = ({
  room,
  styleId,
  styleName,
  assetVersion,
  viewerState,
  panoramaStatus,
  onViewerStateChange,
  onStatusChange
}: PanoramaViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const statusPollRef = useRef<number | null>(null)
  const [isViewerReady, setIsViewerReady] = useState(false)
  const [resolvedPath, setResolvedPath] = useState(getPanoramaPath(room.id, styleId))

  useEffect(() => {
    let cancelled = false

    const cleanupViewer = () => {
      if (statusPollRef.current !== null) {
        window.clearInterval(statusPollRef.current)
        statusPollRef.current = null
      }

      if (viewerRef.current) {
        try {
          viewerRef.current.destroy()
        } catch {}
        viewerRef.current = null
      }
    }

    const syncViewerState = () => {
      if (!viewerRef.current) return

      onViewerStateChange({
        yaw: typeof viewerRef.current.getYaw === 'function' ? viewerRef.current.getYaw() : room.defaultYaw,
        pitch: typeof viewerRef.current.getPitch === 'function' ? viewerRef.current.getPitch() : room.defaultPitch,
        hfov: typeof viewerRef.current.getHfov === 'function' ? viewerRef.current.getHfov() : room.defaultHfov
      })
    }

    const initViewer = async () => {
      if (!containerRef.current) return

      cleanupViewer()
      setIsViewerReady(false)
      onStatusChange('loading')

      const finalUrl = await resolvePanoramaPath(room.id, styleId)
      if (cancelled) return

      if (!finalUrl) {
        setResolvedPath(getPanoramaPath(room.id, styleId))
        onStatusChange('missing')
        return
      }

      setResolvedPath(finalUrl)
      onStatusChange('loaded')

      await new Promise(resolve => setTimeout(resolve, 50))
      if (cancelled || !containerRef.current || !window.pannellum) return

      try {
        viewerRef.current = window.pannellum.viewer(containerRef.current, {
          type: 'equirectangular',
          panorama: finalUrl,
          autoLoad: true,
          showControls: true,
          compass: false,
          yaw: room.defaultYaw,
          pitch: room.defaultPitch,
          hfov: room.defaultHfov,
          onLoad: () => {
            setIsViewerReady(true)
            syncViewerState()
          },
          onError: (err: string) => {
            console.error('Pannellum error:', err)
          }
        })

        syncViewerState()
        statusPollRef.current = window.setInterval(syncViewerState, 120)
      } catch (error) {
        console.error('Failed to create viewer:', error)
        onStatusChange('missing')
      }
    }

    void initViewer()

    return () => {
      cancelled = true
      cleanupViewer()
    }
  }, [
    room.id,
    room.defaultHfov,
    room.defaultPitch,
    room.defaultYaw,
    styleId,
    assetVersion,
    onStatusChange,
    onViewerStateChange
  ])

  return (
    <div className="panorama-viewer">
      <PanoramaHeader
        roomName={room.name}
        yaw={viewerState.yaw}
        pitch={viewerState.pitch}
        hfov={viewerState.hfov}
      />
      <div className="panorama-container-wrapper">
        {!isViewerReady && panoramaStatus !== 'missing' && <PanoramaFallback status="loading" />}
        {panoramaStatus === 'missing' && <PanoramaFallback status="missing" />}
        <div ref={containerRef} className="panorama-container" />
      </div>
    </div>
  )
}
