import { useState } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import { VIDEO_EXTRACTION_FRAME_LIMIT } from './constants'
import { extractHtmlVideoFrames } from './videoFramePipeline'
import { clampVideoClipRange, getVideoExtractionLimitMessage } from './videoModel'
import type { ExtractedVideoFrame, VideoDraft } from './types'

export interface UseVideoExtractionWorkflowParams {
  videoDraft: VideoDraft | null
  videoClipStart: number
  videoClipEnd: number
  videoFps: number
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>
  onBeforeExtract: () => void
  onFramesExtracted: (frames: ExtractedVideoFrame[]) => void
}

export function useVideoExtractionWorkflow({
  videoDraft,
  videoClipStart,
  videoClipEnd,
  videoFps,
  videoPreviewRef,
  onBeforeExtract,
  onFramesExtracted,
}: UseVideoExtractionWorkflowParams) {
  const [videoExtracting, setVideoExtracting] = useState(false)
  const [videoExtractProgress, setVideoExtractProgress] = useState(0)
  const [videoOperationLabel, setVideoOperationLabel] = useState('')
  const videoLimitMessage = videoDraft
    ? getVideoExtractionLimitMessage(videoClipStart, videoClipEnd, videoFps, VIDEO_EXTRACTION_FRAME_LIMIT)
    : null

  const resetVideoExtractProgress = () => setVideoExtractProgress(0)

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
    onBeforeExtract()
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
      onFramesExtracted(created)
      message.success(`已提取 ${created.length} 帧`)
    } catch (e) {
      message.error(`视频提帧失败：${String(e)}`)
    } finally {
      setVideoExtracting(false)
      setVideoOperationLabel('')
    }
  }

  return {
    videoExtracting,
    videoExtractProgress,
    videoOperationLabel,
    videoLimitMessage,
    resetVideoExtractProgress,
    extractVideoFrames,
  }
}
