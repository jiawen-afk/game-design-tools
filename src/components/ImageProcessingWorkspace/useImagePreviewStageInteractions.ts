import { useEffect, useRef, useState, type DragEvent } from 'react'

import { getPreviewAnchorFromStagePoint } from './imageProcessingModel'
import type { Point, PreviewRect, RectSize } from './imageProcessingTypes'

interface UseImagePreviewStageInteractionsOptions {
  draft: unknown | null
  previewImageRect: PreviewRect | null
  previewZoom: number
  setCropPreviewContainerSize: (size: RectSize) => void
  handleWheelZoom: (deltaY: number, anchor?: Point) => void
  uploadImage: (file: File) => void | Promise<void>
}

export function useImagePreviewStageInteractions({
  draft,
  previewImageRect,
  previewZoom,
  setCropPreviewContainerSize,
  handleWheelZoom,
  uploadImage,
}: UseImagePreviewStageInteractionsOptions) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const layerRef = useRef<HTMLDivElement | null>(null)
  const [dragDepth, setDragDepth] = useState(0)

  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      setCropPreviewContainerSize({ width: rect.width, height: rect.height })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [setCropPreviewContainerSize])

  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (!draft) return
      const stageRect = element.getBoundingClientRect()
      if (!previewImageRect) {
        handleWheelZoom(event.deltaY)
        return
      }
      handleWheelZoom(event.deltaY, getPreviewAnchorFromStagePoint(
        { x: event.clientX - stageRect.left, y: event.clientY - stageRect.top },
        previewImageRect
      ))
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [draft, handleWheelZoom, previewImageRect])

  const mapClientToLocal = (clientX: number, clientY: number) => {
    const layer = layerRef.current
    if (!layer || !previewImageRect) return null
    const rect = layer.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / previewZoom,
      y: (clientY - rect.top) / previewZoom,
    }
  }

  const hasDraggedFiles = (event: DragEvent<HTMLDivElement>) => Array.from(event.dataTransfer.types).includes('Files')
  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    setDragDepth((current) => current + 1)
  }
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    setDragDepth((current) => Math.max(0, current - 1))
  }
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    setDragDepth(0)
    const [file] = Array.from(event.dataTransfer.files)
    if (file) void uploadImage(file)
  }

  return {
    boxRef,
    layerRef,
    dragDepth,
    mapClientToLocal,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  }
}
