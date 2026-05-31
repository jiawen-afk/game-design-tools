import { useEffect, useRef, useState } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import { EMPTY_UNIFORM_CROP, MIN_VIDEO_CROP_SIZE, VIDEO_EXTRACTION_FRAME_LIMIT } from './constants'
import { clampUniformCrop, type UniformCrop } from './cropModel'
import { makeFrameFromFile } from './imagePipeline'
import {
  computeVideoPreviewCropState,
  extractHtmlVideoFrames,
  getContainedImageRect,
  makeCroppedVideoFrameFile,
  revokeExtractedVideoFrames,
} from './videoFramePipeline'
import {
  clampVideoClipRange,
  getVideoExtractionFrameCount,
  getVideoExtractionLimitMessage,
  getVideoPreviewSeekTarget,
  getVideoSourceUrlToRevoke,
  shouldReplayVideoSegment,
} from './videoModel'
import type { MatteDefaults } from './matteModel'
import { getInitialMatteFrameIds } from './model'
import type { ExtractedVideoFrame, FrameItem, VideoCropDragState, VideoCropHandle, VideoDraft } from './types'

export interface UseVideoWorkspaceParams {
  existingFrameCount: number
  matteDefaults: MatteDefaults
  appendFrames: (frames: FrameItem[]) => void
  scheduleMatte: (id: string) => void
}

export type VideoWorkspaceViewModel = ReturnType<typeof useVideoWorkspace>

export function useVideoWorkspace({ existingFrameCount, matteDefaults, appendFrames, scheduleMatte }: UseVideoWorkspaceParams) {
  const [videoDraft, setVideoDraft] = useState<VideoDraft | null>(null)
  const [videoClipStart, setVideoClipStart] = useState(0)
  const [videoClipEnd, setVideoClipEnd] = useState(0)
  const [videoFps, setVideoFps] = useState(12)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoLooping, setVideoLooping] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoExtracting, setVideoExtracting] = useState(false)
  const [videoAdding, setVideoAdding] = useState(false)
  const [videoExtractProgress, setVideoExtractProgress] = useState(0)
  const [videoOperationLabel, setVideoOperationLabel] = useState('')
  const [videoExtractedFrames, setVideoExtractedFrames] = useState<ExtractedVideoFrame[]>([])
  const [videoFramePreviewPlaying, setVideoFramePreviewPlaying] = useState(false)
  const [videoFramePreviewIndex, setVideoFramePreviewIndex] = useState(0)
  const [videoCropMode, setVideoCropMode] = useState(false)
  const [videoCrop, setVideoCrop] = useState<UniformCrop>(EMPTY_UNIFORM_CROP)
  const [videoCropDrag, setVideoCropDrag] = useState<VideoCropDragState | null>(null)
  const [videoPreviewBoxSize, setVideoPreviewBoxSize] = useState({ width: 0, height: 0 })
  const [videoError, setVideoError] = useState<string | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const videoFramePreviewBoxRef = useRef<HTMLDivElement | null>(null)
  const videoClipRangeRef = useRef<[number, number]>([0, 0])
  const videoSourceUrlRef = useRef<string | null>(null)

  const previewVideoFrame = videoExtractedFrames[
    Math.min(videoFramePreviewIndex, Math.max(0, videoExtractedFrames.length - 1))
  ]
  const videoCropPreview = computeVideoPreviewCropState(
    previewVideoFrame,
    videoPreviewBoxSize,
    videoCrop,
    MIN_VIDEO_CROP_SIZE
  )

  useEffect(() => {
    const nextUrl = videoDraft?.sourceUrl ?? null
    const staleUrl = getVideoSourceUrlToRevoke(videoSourceUrlRef.current, nextUrl)
    if (staleUrl) URL.revokeObjectURL(staleUrl)
    videoSourceUrlRef.current = nextUrl
  }, [videoDraft?.sourceUrl])

  useEffect(() => {
    return () => {
      if (videoSourceUrlRef.current) URL.revokeObjectURL(videoSourceUrlRef.current)
    }
  }, [])

  useEffect(() => {
    return () => revokeExtractedVideoFrames(videoExtractedFrames)
  }, [videoExtractedFrames])

  useEffect(() => {
    videoClipRangeRef.current = [videoClipStart, videoClipEnd]
  }, [videoClipEnd, videoClipStart])

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
  }, [videoDraft, videoExtractedFrames.length])

  useEffect(() => {
    if (!videoFramePreviewPlaying || videoExtractedFrames.length === 0) return
    const timer = window.setInterval(() => {
      setVideoFramePreviewIndex((index) => (index + 1) % videoExtractedFrames.length)
    }, 1000 / Math.max(1, videoFps))
    return () => window.clearInterval(timer)
  }, [videoExtractedFrames.length, videoFps, videoFramePreviewPlaying])

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

  const resetVideoExtraction = () => {
    setVideoExtractedFrames([])
    setVideoFramePreviewPlaying(false)
    setVideoFramePreviewIndex(0)
    setVideoExtractProgress(0)
    setVideoCropMode(false)
    setVideoCrop(EMPTY_UNIFORM_CROP)
    setVideoCropDrag(null)
  }

  const resetVideoSegmentPreview = () => {
    videoPreviewRef.current?.pause()
    setVideoPlaying(false)
    setVideoLooping(false)
  }

  const handleVideoUpload = (file: File) => {
    setVideoError(null)
    resetVideoExtraction()
    resetVideoSegmentPreview()
    setVideoLoading(false)
    setVideoOperationLabel('')
    setVideoDraft(null)
    setVideoClipStart(0)
    setVideoClipEnd(0)
    setVideoDraft({
      file,
      sourceUrl: URL.createObjectURL(file),
      sourceName: file.name,
      duration: 0,
      width: 0,
      height: 0,
    })
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

  const setVideoClipRange = (start: number, end: number) => {
    const range = clampVideoClipRange({ duration: videoDraft?.duration ?? 0, start, end })
    const previous = videoClipRangeRef.current
    const next: [number, number] = [range.start, range.end]
    const video = videoPreviewRef.current
    setVideoClipStart(range.start)
    setVideoClipEnd(range.end)
    videoClipRangeRef.current = next
    resetVideoExtraction()
    if (video) {
      const seekTarget = videoPlaying && videoLooping
        ? range.start
        : getVideoPreviewSeekTarget(previous, next)
      video.currentTime = seekTarget
      if (videoPlaying) void video.play().catch(() => undefined)
    }
  }

  const applyNativeVideoMetadata = () => {
    const video = videoPreviewRef.current
    if (!video || !videoDraft) return
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    if (duration <= 0) return
    const width = video.videoWidth
    const height = video.videoHeight
    const nextStart = Math.min(videoClipStart, duration)
    const nextEnd = videoClipEnd > 0 ? Math.min(Math.max(videoClipEnd, nextStart), duration) : duration
    setVideoDraft((current) => (
      current && current.sourceUrl === videoDraft.sourceUrl
        ? { ...current, duration, width, height }
        : current
    ))
    setVideoClipStart(nextStart)
    setVideoClipEnd(nextEnd)
    videoClipRangeRef.current = [nextStart, nextEnd]
  }

  const handleVideoPreviewError = () => {
    if (!videoDraft || videoError) return
    const nextError = '视频读取失败：当前浏览器无法直接播放或解析该视频'
    setVideoError(nextError)
    message.error(nextError)
  }

  const handleVideoTimeUpdate = () => {
    const video = videoPreviewRef.current
    if (!video) return
    const [start, end] = videoClipRangeRef.current
    if (!shouldReplayVideoSegment(video.currentTime, start, end)) return
    if (videoLooping) {
      video.currentTime = start
      void video.play().catch(() => undefined)
      return
    }
    video.pause()
    setVideoPlaying(false)
  }

  const playVideoClip = () => {
    if (!videoDraft || videoDraft.duration <= 0) return
    const video = videoPreviewRef.current
    if (!video) {
      message.info('视频尚未准备好')
      return
    }
    video.currentTime = videoClipStart
    setVideoPlaying(true)
    void video.play().catch((e) => {
      setVideoPlaying(false)
      message.error(`视频播放失败：${String(e)}`)
    })
  }

  const extractVideoFrames = async () => {
    if (!videoDraft) return
    const range = clampVideoClipRange({ duration: videoDraft.duration, start: videoClipStart, end: videoClipEnd })
    const limitMessage = getVideoExtractionLimitMessage(range.start, range.end, videoFps, VIDEO_EXTRACTION_FRAME_LIMIT)
    if (limitMessage) {
      message.warning(limitMessage)
      return
    }
    setVideoExtracting(true)
    setVideoOperationLabel('正在通过 HTML video 提取 PNG 帧')
    videoPreviewRef.current?.pause()
    setVideoPlaying(false)
    setVideoLooping(false)
    setVideoFramePreviewPlaying(false)
    setVideoFramePreviewIndex(0)
    setVideoExtractProgress(0)
    try {
      const video = videoPreviewRef.current
      const created = video
        ? await extractHtmlVideoFrames({
            video,
            draft: videoDraft,
            start: range.start,
            end: range.end,
            fps: videoFps,
            onProgress: setVideoExtractProgress,
          })
        : []
      setVideoExtractedFrames(created)
      setVideoFramePreviewPlaying(created.length > 1)
      message.success(`已提取 ${created.length} 帧`)
    } catch (e) {
      message.error(`视频提帧失败：${String(e)}`)
    } finally {
      setVideoExtracting(false)
      setVideoOperationLabel('')
    }
  }

  const confirmVideoFrames = async () => {
    if (videoExtractedFrames.length === 0) return
    setVideoAdding(true)
    try {
      const files = await Promise.all(
        videoExtractedFrames.map((frame) => makeCroppedVideoFrameFile(frame, videoCrop, MIN_VIDEO_CROP_SIZE))
      )
      const created = await Promise.all(files.map((file) => makeFrameFromFile(file, matteDefaults)))
      appendFrames(created)
      getInitialMatteFrameIds({
        existingFrameCount,
        createdIds: created.map((item) => item.id),
      }).forEach((id) => scheduleMatte(id))
      message.success(`已添加 ${created.length} 帧到流程 2`)
    } catch (e) {
      message.error(`添加视频帧失败：${String(e)}`)
    } finally {
      setVideoAdding(false)
    }
  }

  return {
    videoDraft,
    videoClipStart,
    videoClipEnd,
    videoFps,
    videoPlaying,
    videoLooping,
    videoLoading,
    videoExtracting,
    videoAdding,
    videoExtractProgress,
    videoOperationLabel,
    videoExtractedFrames,
    videoFramePreviewIndex,
    videoCropMode,
    setVideoCropMode,
    videoError,
    videoPreviewRef,
    videoFramePreviewBoxRef,
    videoFrameCount: videoDraft ? getVideoExtractionFrameCount(videoClipStart, videoClipEnd, videoFps) : 0,
    videoLimitMessage: videoDraft
      ? getVideoExtractionLimitMessage(videoClipStart, videoClipEnd, videoFps, VIDEO_EXTRACTION_FRAME_LIMIT)
      : null,
    previewVideoFrame,
    videoCropImageRect: videoCropPreview?.imageRect ?? null,
    videoCropOutputSize: videoCropPreview?.outputSize ?? null,
    videoCropBox: videoCropPreview?.cropBox ?? null,
    handleVideoUpload,
    applyNativeVideoMetadata,
    handleVideoTimeUpdate,
    handleVideoPreviewError,
    setVideoPlaying,
    setVideoLooping,
    playVideoClip,
    setVideoClipRange,
    setVideoFps,
    resetVideoExtraction,
    resetVideoSegmentPreview,
    extractVideoFrames,
    setVideoFramePreviewIndex,
    setVideoFramePreviewPlaying,
    confirmVideoFrames,
    startVideoCropDrag,
  }
}
