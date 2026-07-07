import { useRef, type MutableRefObject } from 'react'
import WaveSurfer from 'wavesurfer.js'
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js'

import {
  resolvePendingPlaybackStep,
  type AudioPendingSegment,
} from './audioSegmentModel'

interface UseAudioPendingWaveformPlaybackOptions {
  pendingSegmentsRef: MutableRefObject<AudioPendingSegment[]>
  regionMapRef: MutableRefObject<Map<string, Region>>
  waveSurferRef: MutableRefObject<WaveSurfer | null>
  onCurrentTimeChange: (seconds: number) => void
  onStopPendingPreviewPlayback: () => void
  onPlayPendingSegments: (
    segments: AudioPendingSegment[],
    loop: boolean,
    onProgress: (sourceTimeSeconds: number) => void,
  ) => void
}

export function useAudioPendingWaveformPlayback({
  pendingSegmentsRef,
  regionMapRef,
  waveSurferRef,
  onCurrentTimeChange,
  onPlayPendingSegments,
  onStopPendingPreviewPlayback,
}: UseAudioPendingWaveformPlaybackOptions) {
  const pendingPlaybackRef = useRef({
    active: false,
    index: 0,
    loop: false,
    seekingToSeconds: null as number | null,
  })
  const pendingPlaybackFrameRef = useRef<number | null>(null)

  const clearPendingPlaybackFrame = () => {
    if (pendingPlaybackFrameRef.current === null) return
    cancelAnimationFrame(pendingPlaybackFrameRef.current)
    pendingPlaybackFrameRef.current = null
  }

  const stopPendingSequencePlayback = () => {
    clearPendingPlaybackFrame()
    pendingPlaybackRef.current.active = false
    pendingPlaybackRef.current.seekingToSeconds = null
  }

  function playPendingAt(index: number, mode: 'single' | 'sequence' = 'single') {
    const segment = pendingSegmentsRef.current[index]
    if (!segment) {
      stopPendingSequencePlayback()
      return
    }
    pendingPlaybackRef.current.index = index
    if (mode === 'sequence') {
      clearPendingPlaybackFrame()
      pendingPlaybackRef.current.seekingToSeconds = segment.startSeconds
      void waveSurferRef.current?.play(segment.startSeconds, segment.endSeconds)
      schedulePendingPlaybackFrame()
      return
    }
    const region = regionMapRef.current.get(segment.regionId)
    if (region) {
      region.play(true)
      return
    }
    waveSurferRef.current?.setTime(segment.startSeconds)
    void waveSurferRef.current?.play()
  }

  const applyPendingPlaybackStep = (seconds: number) => {
    const waveSurfer = waveSurferRef.current
    if (!waveSurfer) return
    const pendingPlaybackStep = resolvePendingPlaybackStep(
      pendingSegmentsRef.current,
      pendingPlaybackRef.current,
      seconds,
    )
    if (pendingPlaybackStep.action === 'continue' && pendingPlaybackStep.seekSettled) {
      pendingPlaybackRef.current.seekingToSeconds = null
    }
    if (pendingPlaybackStep.action === 'play') {
      playPendingAt(pendingPlaybackStep.index, 'sequence')
      return
    }
    if (pendingPlaybackStep.action === 'stop') {
      stopPendingSequencePlayback()
      waveSurfer.pause()
      if (typeof pendingPlaybackStep.seekSeconds === 'number') {
        waveSurfer.setTime(pendingPlaybackStep.seekSeconds)
        onCurrentTimeChange(pendingPlaybackStep.seekSeconds)
      }
    }
  }

  function schedulePendingPlaybackFrame() {
    clearPendingPlaybackFrame()
    pendingPlaybackFrameRef.current = requestAnimationFrame(() => {
      pendingPlaybackFrameRef.current = null
      const waveSurfer = waveSurferRef.current
      if (!waveSurfer || !pendingPlaybackRef.current.active) return
      applyPendingPlaybackStep(waveSurfer.getCurrentTime())
      if (pendingPlaybackRef.current.active && pendingPlaybackFrameRef.current === null) {
        schedulePendingPlaybackFrame()
      }
    })
  }

  const playPendingSegments = () => {
    if (pendingSegmentsRef.current.length === 0) return
    stopPendingSequencePlayback()
    waveSurferRef.current?.pause()
    onPlayPendingSegments(
      pendingSegmentsRef.current,
      pendingPlaybackRef.current.loop,
      (sourceTimeSeconds) => {
        waveSurferRef.current?.setTime(sourceTimeSeconds)
        onCurrentTimeChange(sourceTimeSeconds)
      },
    )
  }

  const pausePlayback = () => {
    onStopPendingPreviewPlayback()
    stopPendingSequencePlayback()
    waveSurferRef.current?.pause()
  }

  const toggleSourcePlayback = () => {
    onStopPendingPreviewPlayback()
    stopPendingSequencePlayback()
    void waveSurferRef.current?.playPause()
  }

  return {
    applyPendingPlaybackStep,
    pausePlayback,
    playPendingAt,
    playPendingSegments,
    setPendingPlaybackLoop: (checked: boolean) => { pendingPlaybackRef.current.loop = checked },
    stopPendingSequencePlayback,
    toggleSourcePlayback,
  }
}
