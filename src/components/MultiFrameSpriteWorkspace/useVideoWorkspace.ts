import { useEffect, useRef, useState } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import { MIN_VIDEO_CROP_SIZE, VIDEO_EXTRACTION_FRAME_LIMIT } from './constants'
import { createWorkspaceId, makeFrameFromFile } from './imagePipeline'
import {
  extractHtmlVideoFrames,
  makeCroppedVideoFrameFile,
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
import { getInitialMatteFrameIds, getNextMatteGroupName } from './model'
import type { ExtractedVideoFrame, FrameItem, VideoDraft } from './types'
import { useVideoFramePreviewWorkspace } from './useVideoFramePreviewWorkspace'

export interface UseVideoWorkspaceParams {
  framesRef: React.RefObject<FrameItem[]>
  matteDefaults: MatteDefaults
  appendFrames: (frames: FrameItem[]) => void
  scheduleMatte: (id: string) => void
}

export type VideoWorkspaceViewModel = ReturnType<typeof useVideoWorkspace>

export function useVideoWorkspace({ framesRef, matteDefaults, appendFrames, scheduleMatte }: UseVideoWorkspaceParams) {
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
  const [videoError, setVideoError] = useState<string | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const videoClipRangeRef = useRef<[number, number]>([0, 0])
  const videoSourceUrlRef = useRef<string | null>(null)
  const videoPreview = useVideoFramePreviewWorkspace({ videoDraft, videoFps, videoExtractedFrames })

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
    videoClipRangeRef.current = [videoClipStart, videoClipEnd]
  }, [videoClipEnd, videoClipStart])

  const resetVideoExtraction = () => {
    setVideoExtractedFrames([])
    setVideoExtractProgress(0)
    videoPreview.resetVideoFramePreview()
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
    videoPreview.setVideoFramePreviewPlaying(false)
    videoPreview.setVideoFramePreviewIndex(0)
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
      videoPreview.setVideoFramePreviewPlaying(created.length > 1)
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
        videoExtractedFrames.map((frame) => makeCroppedVideoFrameFile(frame, videoPreview.videoCrop, MIN_VIDEO_CROP_SIZE))
      )
      const existingFrameCount = framesRef.current.length
      const group = {
        id: createWorkspaceId(),
        name: getNextMatteGroupName(framesRef.current, 'video'),
        kind: 'video' as const,
      }
      const created = await Promise.all(files.map((file) => makeFrameFromFile(file, matteDefaults, group)))
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
    videoFramePreviewPlaying: videoPreview.videoFramePreviewPlaying,
    videoFramePreviewIndex: videoPreview.videoFramePreviewIndex,
    videoCropMode: videoPreview.videoCropMode,
    setVideoCropMode: videoPreview.setVideoCropMode,
    videoError,
    videoPreviewRef,
    videoFramePreviewBoxRef: videoPreview.videoFramePreviewBoxRef,
    videoFrameCount: videoDraft ? getVideoExtractionFrameCount(videoClipStart, videoClipEnd, videoFps) : 0,
    videoLimitMessage: videoDraft
      ? getVideoExtractionLimitMessage(videoClipStart, videoClipEnd, videoFps, VIDEO_EXTRACTION_FRAME_LIMIT)
      : null,
    previewVideoFrame: videoPreview.previewVideoFrame,
    videoCropImageRect: videoPreview.videoCropImageRect,
    videoCropOutputSize: videoPreview.videoCropOutputSize,
    videoCropBox: videoPreview.videoCropBox,
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
    setVideoFramePreviewIndex: videoPreview.setVideoFramePreviewIndex,
    setVideoFramePreviewPlaying: videoPreview.setVideoFramePreviewPlaying,
    confirmVideoFrames,
    startVideoCropDrag: videoPreview.startVideoCropDrag,
  }
}
