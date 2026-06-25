import { useCallback, useState, type SetStateAction } from 'react'

import {
  applyWheelZoom,
  getAnchoredWheelZoomTransform,
  type Point,
} from './imageProcessingModel'

export function useImagePreviewTransform() {
  const [previewTransform, setPreviewTransform] = useState<{ zoom: number; pan: Point }>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  })

  const setPreviewZoom = useCallback((value: SetStateAction<number>) => {
    setPreviewTransform((current) => ({
      ...current,
      zoom: typeof value === 'function' ? value(current.zoom) : value,
    }))
  }, [])

  const handleWheelZoom = useCallback((deltaY: number, anchorFromCenter?: Point) => {
    setPreviewTransform((current) => {
      if (!anchorFromCenter) {
        return { ...current, zoom: applyWheelZoom(current.zoom, deltaY) }
      }
      return getAnchoredWheelZoomTransform(current.zoom, current.pan, deltaY, anchorFromCenter)
    })
  }, [])

  const resetPreviewTransform = useCallback(() => {
    setPreviewTransform({ zoom: 1, pan: { x: 0, y: 0 } })
  }, [])

  return {
    previewZoom: previewTransform.zoom,
    previewPan: previewTransform.pan,
    setPreviewZoom,
    handleWheelZoom,
    resetPreviewTransform,
  }
}
