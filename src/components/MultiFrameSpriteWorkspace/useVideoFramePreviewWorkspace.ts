import { useEffect, useRef, useState } from 'react'
import type * as React from 'react'

import { EMPTY_UNIFORM_CROP, MIN_VIDEO_CROP_SIZE } from './constants'
import { clampUniformCrop, type UniformCrop } from './cropModel'
import {
  computeVideoPreviewCropState,
  getContainedImageRect,
  revokeExtractedVideoFrames,
} from './videoFramePipeline'
import type { ExtractedVideoFrame, VideoCropDragState, VideoCropHandle, VideoDraft } from './types'

export interface UseVideoFramePreviewWorkspaceParams {
  videoDraft: VideoDraft | null
  videoFps: number
  videoExtractedFrames: ExtractedVideoFrame[]
  videoPreviewFrames?: ExtractedVideoFrame[]
}

export function useVideoFramePreviewWorkspace({
  videoDraft,
  videoFps,
  videoExtractedFrames,
  videoPreviewFrames,
}: UseVideoFramePreviewWorkspaceParams) {
  const [videoFramePreviewPlaying, setVideoFramePreviewPlaying] = useState(false)
  const [videoFramePreviewIndex, setVideoFramePreviewIndex] = useState(0)
  const [videoCropMode, setVideoCropMode] = useState(false)
  const [videoCrop, setVideoCrop] = useState<UniformCrop>(EMPTY_UNIFORM_CROP)
  const [videoCropDrag, setVideoCropDrag] = useState<VideoCropDragState | null>(null)
  const [videoPreviewBoxSize, setVideoPreviewBoxSize] = useState({ width: 0, height: 0 })
  const videoFramePreviewBoxRef = useRef<HTMLDivElement | null>(null)
  const previewFrames = videoPreviewFrames ?? videoExtractedFrames

  const previewVideoFrame = previewFrames.find((frame) => frame.index === videoFramePreviewIndex) ?? previewFrames[0]
  const videoCropPreview = computeVideoPreviewCropState(
    previewVideoFrame,
    videoPreviewBoxSize,
    videoCrop,
    MIN_VIDEO_CROP_SIZE
  )

  useEffect(() => {
    return () => revokeExtractedVideoFrames(videoExtractedFrames)
  }, [videoExtractedFrames])

  useEffect(() => {
    const box = videoFramePreviewBoxRef.current
    if (!box || typeof ResizeObserver === 'undefined') return undefined
    const updateSize = () => {
      const rect = box.getBoundingClientRect()
      setVideoPreviewBoxSize({ width: rect.width, height: rect.height })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(box)
    return () => observer.disconnect()
  }, [videoDraft, previewFrames.length])

  useEffect(() => {
    if (!videoFramePreviewPlaying || previewFrames.length === 0) return
    const timer = window.setInterval(() => {
      setVideoFramePreviewIndex((index) => {
        const currentPosition = previewFrames.findIndex((frame) => frame.index === index)
        const nextPosition = currentPosition < 0 ? 0 : (currentPosition + 1) % previewFrames.length
        return previewFrames[nextPosition]?.index ?? 0
      })
    }, 1000 / Math.max(1, videoFps))
    return () => window.clearInterval(timer)
  }, [previewFrames, videoFps, videoFramePreviewPlaying])

  useEffect(() => {
    if (previewFrames.length === 0) {
      if (videoFramePreviewIndex !== 0) setVideoFramePreviewIndex(0)
      return
    }
    if (!previewFrames.some((frame) => frame.index === videoFramePreviewIndex)) {
      setVideoFramePreviewIndex(previewFrames[0]?.index ?? 0)
    }
  }, [previewFrames, videoFramePreviewIndex])

  useEffect(() => {
    if (!videoCropDrag) return
    const onMove = (event: MouseEvent) => {
      const dx = (event.clientX - videoCropDrag.startX) / videoCropDrag.scale
      const dy = (event.clientY - videoCropDrag.startY) / videoCropDrag.scale
      const { top: startTop, bottom: startBottom, left: startLeft, right: startRight } = videoCropDrag.startCrop
      const { width, height } = videoCropDrag
      let top = startTop
      let bottom = startBottom
      let left = startLeft
      let right = startRight

      switch (videoCropDrag.handle) {
        case 'top':
          top = startTop + dy
          break
        case 'bottom':
          bottom = startBottom - dy
          break
        case 'left':
          left = startLeft + dx
          break
        case 'right':
          right = startRight - dx
          break
        case 'tl':
          top = startTop + dy
          left = startLeft + dx
          break
        case 'tr':
          top = startTop + dy
          right = startRight - dx
          break
        case 'bl':
          bottom = startBottom - dy
          left = startLeft + dx
          break
        case 'br':
          bottom = startBottom - dy
          right = startRight - dx
          break
        case 'move': {
          const cropWidth = width - startLeft - startRight
          const cropHeight = height - startTop - startBottom
          left = Math.max(0, Math.min(width - cropWidth, startLeft + dx))
          top = Math.max(0, Math.min(height - cropHeight, startTop + dy))
          right = width - left - cropWidth
          bottom = height - top - cropHeight
          break
        }
      }

      setVideoCrop(clampUniformCrop({ top, bottom, left, right }, width, height, MIN_VIDEO_CROP_SIZE))
    }
    const onUp = () => setVideoCropDrag(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [videoCropDrag])

  const resetVideoFramePreview = () => {
    setVideoFramePreviewPlaying(false)
    setVideoFramePreviewIndex(0)
    setVideoCropMode(false)
    setVideoCrop(EMPTY_UNIFORM_CROP)
    setVideoCropDrag(null)
  }

  const startVideoCropDrag = (event: React.MouseEvent<HTMLElement>, handle: VideoCropHandle) => {
    if (!previewVideoFrame) return
    const box = videoFramePreviewBoxRef.current
    if (!box) return
    const rect = box.getBoundingClientRect()
    const imageRect = getContainedImageRect(rect.width, rect.height, previewVideoFrame.width, previewVideoFrame.height)
    if (!imageRect) return
    event.preventDefault()
    event.stopPropagation()
    setVideoFramePreviewPlaying(false)
    setVideoCropDrag({
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: clampUniformCrop(videoCrop, previewVideoFrame.width, previewVideoFrame.height, MIN_VIDEO_CROP_SIZE),
      width: previewVideoFrame.width,
      height: previewVideoFrame.height,
      scale: imageRect.scale,
    })
  }

  return {
    videoFramePreviewPlaying,
    setVideoFramePreviewPlaying,
    videoFramePreviewIndex,
    setVideoFramePreviewIndex,
    videoCropMode,
    setVideoCropMode,
    videoCrop,
    videoFramePreviewBoxRef,
    previewVideoFrame,
    videoCropImageRect: videoCropPreview?.imageRect ?? null,
    videoCropOutputSize: videoCropPreview?.outputSize ?? null,
    videoCropBox: videoCropPreview?.cropBox ?? null,
    resetVideoFramePreview,
    startVideoCropDrag,
  }
}
