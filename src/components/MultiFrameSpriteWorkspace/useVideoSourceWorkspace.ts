import { useEffect, useRef, useState } from 'react'
import { message } from 'antd'

import {
  clampVideoClipRange,
  getVideoPreviewSeekTarget,
  shouldReplayVideoSegment,
} from './videoModel'
import type { VideoDraft } from './types'
import { useVideoSourceUrlCleanup } from './useVideoSourceUrlCleanup'

export function useVideoSourceWorkspace() {
  const [videoDraft, setVideoDraft] = useState<VideoDraft | null>(null)
  const [videoClipStart, setVideoClipStart] = useState(0)
  const [videoClipEnd, setVideoClipEnd] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoLooping, setVideoLooping] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const videoClipRangeRef = useRef<[number, number]>([0, 0])

  useVideoSourceUrlCleanup(videoDraft?.sourceUrl)

  useEffect(() => {
    videoClipRangeRef.current = [videoClipStart, videoClipEnd]
  }, [videoClipEnd, videoClipStart])

  const resetVideoSegmentPreview = () => {
    videoPreviewRef.current?.pause()
    setVideoPlaying(false)
    setVideoLooping(false)
  }

  const clearVideoDraft = () => {
    resetVideoSegmentPreview()
    setVideoError(null)
    setVideoLoading(false)
    setVideoDraft(null)
    setVideoClipStart(0)
    setVideoClipEnd(0)
    videoClipRangeRef.current = [0, 0]
  }

  const handleVideoUpload = (file: File) => {
    clearVideoDraft()
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

  return {
    videoDraft,
    videoClipStart,
    videoClipEnd,
    videoPlaying,
    videoLooping,
    videoLoading,
    videoError,
    videoPreviewRef,
    applyNativeVideoMetadata,
    clearVideoDraft,
    handleVideoPreviewError,
    handleVideoTimeUpdate,
    handleVideoUpload,
    playVideoClip,
    resetVideoSegmentPreview,
    setVideoClipRange,
    setVideoLooping,
    setVideoPlaying,
  }
}
