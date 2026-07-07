import { useEffect, useRef } from 'react'

import { getDesktopApi } from '../../desktopApi'
import { renderAudioClipWav } from './audioClipService'
import {
  resolvePendingPreviewSourceTime,
  type AudioPendingSegment,
} from './audioSegmentModel'
import type {
  AudioClipRange,
  AudioClipSource,
} from './audioClipModel'

interface UseAudioPendingPreviewPlaybackOptions {
  currentOutputRanges: (segments?: AudioPendingSegment[]) => AudioClipRange[]
  hasValidCurrentPendingSegments: (segments?: AudioPendingSegment[]) => boolean
  outputName: string
  source: AudioClipSource | null
  setError: (error: string) => void
}

export function useAudioPendingPreviewPlayback({
  currentOutputRanges,
  hasValidCurrentPendingSegments,
  outputName,
  source,
  setError,
}: UseAudioPendingPreviewPlaybackOptions) {
  const pendingPreviewAudioRef = useRef<HTMLAudioElement | null>(null)
  const pendingPreviewAudioUrlRef = useRef<string | null>(null)
  const pendingPreviewProgressFrameRef = useRef<number | null>(null)
  const pendingPreviewRequestIdRef = useRef(0)

  const clearPendingPreviewProgressFrame = () => {
    if (pendingPreviewProgressFrameRef.current === null) return
    cancelAnimationFrame(pendingPreviewProgressFrameRef.current)
    pendingPreviewProgressFrameRef.current = null
  }

  const disposePendingPreviewAudio = () => {
    clearPendingPreviewProgressFrame()
    const audio = pendingPreviewAudioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    pendingPreviewAudioRef.current = null
    if (pendingPreviewAudioUrlRef.current) URL.revokeObjectURL(pendingPreviewAudioUrlRef.current)
    pendingPreviewAudioUrlRef.current = null
  }

  const stopPendingPreviewPlayback = () => {
    pendingPreviewRequestIdRef.current += 1
    disposePendingPreviewAudio()
  }

  useEffect(() => () => stopPendingPreviewPlayback(), [])

  const playPendingSegmentsPreview = async (
    segments: AudioPendingSegment[],
    loop: boolean,
    onProgress: (sourceTimeSeconds: number) => void,
  ) => {
    if (!source || !hasValidCurrentPendingSegments(segments)) return
    const requestId = pendingPreviewRequestIdRef.current + 1
    pendingPreviewRequestIdRef.current = requestId
    disposePendingPreviewAudio()
    setError('')
    try {
      const ranges = currentOutputRanges(segments)
      const wav = await renderAudioClipWav({
        source,
        ranges,
        name: outputName,
        desktopApi: getDesktopApi(),
      })
      if (pendingPreviewRequestIdRef.current !== requestId) return
      const previewAudioUrl = URL.createObjectURL(wav)
      const audio = new Audio(previewAudioUrl)
      audio.loop = loop
      pendingPreviewAudioUrlRef.current = previewAudioUrl
      pendingPreviewAudioRef.current = audio
      const updatePreviewProgress = () => {
        const sourceTimeSeconds = resolvePendingPreviewSourceTime(segments, audio.currentTime)
        if (sourceTimeSeconds !== null) onProgress(sourceTimeSeconds)
      }
      const schedulePreviewProgress = () => {
        clearPendingPreviewProgressFrame()
        pendingPreviewProgressFrameRef.current = requestAnimationFrame(() => {
          pendingPreviewProgressFrameRef.current = null
          if (pendingPreviewAudioRef.current !== audio) return
          updatePreviewProgress()
          if (!audio.paused && !audio.ended) schedulePreviewProgress()
        })
      }
      audio.addEventListener('timeupdate', updatePreviewProgress)
      audio.addEventListener('play', schedulePreviewProgress)
      audio.addEventListener('pause', clearPendingPreviewProgressFrame)
      audio.addEventListener('ended', () => {
        updatePreviewProgress()
        if (audio.loop || pendingPreviewAudioRef.current !== audio) return
        disposePendingPreviewAudio()
      })
      audio.addEventListener('error', () => {
        if (pendingPreviewAudioRef.current !== audio) return
        setError('待处理音频预览失败。')
        disposePendingPreviewAudio()
      }, { once: true })
      updatePreviewProgress()
      await audio.play()
    } catch (previewError) {
      if (pendingPreviewRequestIdRef.current !== requestId) return
      setError(previewError instanceof Error ? previewError.message : '待处理音频预览失败。')
      disposePendingPreviewAudio()
    }
  }

  return {
    playPendingSegmentsPreview,
    stopPendingPreviewPlayback,
  }
}
