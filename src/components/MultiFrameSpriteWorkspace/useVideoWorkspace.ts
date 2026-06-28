import { useMemo, useState } from 'react'
import type * as React from 'react'

import { getVideoExtractionFrameCount } from './videoModel'
import type { MatteDefaults } from './matteModel'
import { selectFramesByVisibilityStride } from './playbackModel'
import type { ExtractedVideoFrame, FrameItem } from './types'
import { useVideoExtractionWorkflow } from './useVideoExtractionWorkflow'
import { useVideoFrameConfirmWorkflow } from './useVideoFrameConfirmWorkflow'
import { useVideoFramePreviewWorkspace } from './useVideoFramePreviewWorkspace'
import { useVideoSourceWorkspace } from './useVideoSourceWorkspace'

export interface UseVideoWorkspaceParams {
  framesRef: React.RefObject<FrameItem[]>
  matteDefaults: MatteDefaults
  appendFrames: (frames: FrameItem[]) => void
  scheduleMatte: (id: string) => void
}

export type VideoWorkspaceViewModel = ReturnType<typeof useVideoWorkspace>

export function useVideoWorkspace({ framesRef, matteDefaults, appendFrames, scheduleMatte }: UseVideoWorkspaceParams) {
  const [videoFps, setVideoFps] = useState(12)
  const [videoExtractedFrames, setVideoExtractedFrames] = useState<ExtractedVideoFrame[]>([])
  const [videoVisibilityStride, setVideoVisibilityStrideState] = useState(1)
  const videoSource = useVideoSourceWorkspace()
  const visibleVideoExtractedFrames = useMemo(
    () => selectFramesByVisibilityStride(videoExtractedFrames, videoVisibilityStride),
    [videoExtractedFrames, videoVisibilityStride]
  )
  const videoPreview = useVideoFramePreviewWorkspace({
    videoDraft: videoSource.videoDraft,
    videoFps,
    videoExtractedFrames,
    videoPreviewFrames: visibleVideoExtractedFrames,
  })
  const videoExtraction = useVideoExtractionWorkflow({
    videoDraft: videoSource.videoDraft,
    videoClipStart: videoSource.videoClipStart,
    videoClipEnd: videoSource.videoClipEnd,
    videoFps,
    videoPreviewRef: videoSource.videoPreviewRef,
    onBeforeExtract: () => {
      videoSource.resetVideoSegmentPreview()
      videoPreview.setVideoFramePreviewPlaying(false)
      videoPreview.setVideoFramePreviewIndex(0)
    },
    onFramesExtracted: (created) => {
      setVideoExtractedFrames(created)
      setVideoVisibilityStrideState(1)
      videoPreview.setVideoFramePreviewPlaying(created.length > 1)
    },
  })
  const videoFrameConfirm = useVideoFrameConfirmWorkflow({
    visibleVideoExtractedFrames,
    videoCrop: videoPreview.videoCrop,
    framesRef,
    matteDefaults,
    appendFrames,
    scheduleMatte,
  })

  const resetVideoExtraction = () => {
    setVideoExtractedFrames([])
    setVideoVisibilityStrideState(1)
    videoExtraction.resetVideoExtractProgress()
    videoPreview.resetVideoFramePreview()
  }

  const clearVideoDraft = () => {
    resetVideoExtraction()
    videoSource.clearVideoDraft()
  }

  const handleVideoUpload = (file: File) => {
    resetVideoExtraction()
    videoSource.handleVideoUpload(file)
  }

  const setVideoClipRange = (start: number, end: number) => {
    videoSource.setVideoClipRange(start, end)
    resetVideoExtraction()
  }

  const setVideoVisibilityStride = (stride: number) => {
    const safeStride = Math.min(4, Math.max(1, Math.round(Number.isFinite(stride) ? stride : 1)))
    const nextVisibleFrames = selectFramesByVisibilityStride(videoExtractedFrames, safeStride)
    setVideoVisibilityStrideState(safeStride)
    videoPreview.setVideoFramePreviewIndex(nextVisibleFrames[0]?.index ?? 0)
    videoPreview.setVideoFramePreviewPlaying(nextVisibleFrames.length > 1)
  }

  return {
    videoDraft: videoSource.videoDraft,
    videoClipStart: videoSource.videoClipStart,
    videoClipEnd: videoSource.videoClipEnd,
    videoFps,
    videoPlaying: videoSource.videoPlaying,
    videoLooping: videoSource.videoLooping,
    videoLoading: videoSource.videoLoading,
    videoExtracting: videoExtraction.videoExtracting,
    videoAdding: videoFrameConfirm.videoAdding,
    videoExtractProgress: videoExtraction.videoExtractProgress,
    videoOperationLabel: videoExtraction.videoOperationLabel,
    videoExtractedFrames,
    visibleVideoExtractedFrames,
    videoVisibilityStride,
    videoFramePreviewPlaying: videoPreview.videoFramePreviewPlaying,
    videoFramePreviewIndex: videoPreview.videoFramePreviewIndex,
    videoCropMode: videoPreview.videoCropMode,
    setVideoCropMode: videoPreview.setVideoCropMode,
    videoError: videoSource.videoError,
    videoPreviewRef: videoSource.videoPreviewRef,
    videoFramePreviewBoxRef: videoPreview.videoFramePreviewBoxRef,
    videoFrameCount: videoSource.videoDraft
      ? getVideoExtractionFrameCount(videoSource.videoClipStart, videoSource.videoClipEnd, videoFps)
      : 0,
    videoLimitMessage: videoExtraction.videoLimitMessage,
    previewVideoFrame: videoPreview.previewVideoFrame,
    videoCropImageRect: videoPreview.videoCropImageRect,
    videoCropOutputSize: videoPreview.videoCropOutputSize,
    videoCropBox: videoPreview.videoCropBox,
    handleVideoUpload,
    clearVideoDraft,
    applyNativeVideoMetadata: videoSource.applyNativeVideoMetadata,
    handleVideoTimeUpdate: videoSource.handleVideoTimeUpdate,
    handleVideoPreviewError: videoSource.handleVideoPreviewError,
    setVideoPlaying: videoSource.setVideoPlaying,
    setVideoLooping: videoSource.setVideoLooping,
    playVideoClip: videoSource.playVideoClip,
    setVideoClipRange,
    setVideoFps,
    resetVideoExtraction,
    resetVideoSegmentPreview: videoSource.resetVideoSegmentPreview,
    extractVideoFrames: videoExtraction.extractVideoFrames,
    setVideoFramePreviewIndex: videoPreview.setVideoFramePreviewIndex,
    setVideoFramePreviewPlaying: videoPreview.setVideoFramePreviewPlaying,
    setVideoVisibilityStride,
    confirmVideoFrames: videoFrameConfirm.confirmVideoFrames,
    startVideoCropDrag: videoPreview.startVideoCropDrag,
  }
}
