import { type MouseEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.esm.js'

import { minAudioClipDurationSeconds, type AudioClipRange, type AudioClipSource } from './audioClipModel'
import {
  resolvePendingPlaybackStep,
  type AudioPendingSegment,
  type AudioSegmentRegion,
} from './audioSegmentModel'
import type { AudioContextMenuState } from './AudioClipEditorMenus'

interface UseAudioClipWaveformOptions {
  source: AudioClipSource | null
  durationSeconds: number
  regions: AudioSegmentRegion[]
  selectedRegionId: string
  pendingSegments: AudioPendingSegment[]
  onDurationChange: (seconds: number) => void
  onCurrentTimeChange: (seconds: number) => void
  onSelectRegion: (regionId: string) => void
  onUpdateRegion: (regionId: string, range: AudioClipRange) => void
  onStopPendingPreviewPlayback: () => void
  onPlayPendingSegments: (
    segments: AudioPendingSegment[],
    loop: boolean,
    onProgress: (sourceTimeSeconds: number) => void,
  ) => void
}

const selectedRegionColor = 'rgba(49, 95, 186, 0.28)'
const regionColor = 'rgba(49, 95, 186, 0.16)'

export function useAudioClipWaveform({
  source,
  durationSeconds,
  regions,
  selectedRegionId,
  pendingSegments,
  onDurationChange,
  onCurrentTimeChange,
  onSelectRegion,
  onUpdateRegion,
  onStopPendingPreviewPlayback,
  onPlayPendingSegments,
}: UseAudioClipWaveformOptions) {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const waveSurferRef = useRef<WaveSurfer | null>(null)
  const regionsPluginRef = useRef<RegionsPlugin | null>(null)
  const regionMapRef = useRef<Map<string, Region>>(new Map())
  const pendingSegmentsRef = useRef(pendingSegments)
  const editorCallbacksRef = useRef({
    onDurationChange,
    onCurrentTimeChange,
    onSelectRegion,
    onUpdateRegion,
  })
  const pendingPlaybackRef = useRef({
    active: false,
    index: 0,
    loop: false,
    seekingToSeconds: null as number | null,
  })
  const pendingPlaybackFrameRef = useRef<number | null>(null)
  const [contextMenu, setContextMenu] = useState<AudioContextMenuState>(null)

  useEffect(() => {
    editorCallbacksRef.current = {
      onDurationChange,
      onCurrentTimeChange,
      onSelectRegion,
      onUpdateRegion,
    }
  }, [onCurrentTimeChange, onDurationChange, onSelectRegion, onUpdateRegion])

  useLayoutEffect(() => {
    pendingSegmentsRef.current = pendingSegments
  }, [pendingSegments])

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null)
    window.addEventListener('click', closeContextMenu)
    window.addEventListener('keydown', closeContextMenu)
    return () => {
      window.removeEventListener('click', closeContextMenu)
      window.removeEventListener('keydown', closeContextMenu)
    }
  }, [])

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

  const playPendingAt = (index: number, mode: 'single' | 'sequence' = 'single') => {
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
        editorCallbacksRef.current.onCurrentTimeChange(pendingPlaybackStep.seekSeconds)
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

  useEffect(() => {
    if (!source || !waveformRef.current) return undefined
    const regionsPlugin = RegionsPlugin.create()
    const waveSurfer = WaveSurfer.create({
      container: waveformRef.current,
      url: source.record.audioUrl,
      height: 92,
      normalize: true,
      waveColor: '#8ea0ba',
      progressColor: '#315fba',
      cursorColor: '#1c2b4a',
      plugins: [regionsPlugin],
    })
    waveSurferRef.current = waveSurfer
    regionsPluginRef.current = regionsPlugin
    regionMapRef.current = new Map()

    const syncUpdatedRegion = (region: Region) => {
      editorCallbacksRef.current.onSelectRegion(region.id)
      editorCallbacksRef.current.onUpdateRegion(region.id, {
        startSeconds: region.start,
        endSeconds: region.end,
      })
    }

    waveSurfer.on('ready', () => {
      editorCallbacksRef.current.onDurationChange(waveSurfer.getDuration())
    })
    waveSurfer.on('timeupdate', (seconds) => {
      editorCallbacksRef.current.onCurrentTimeChange(seconds)
      applyPendingPlaybackStep(seconds)
    })
    waveSurfer.on('finish', () => {
      const seconds = waveSurfer.getCurrentTime()
      editorCallbacksRef.current.onCurrentTimeChange(seconds)
      applyPendingPlaybackStep(seconds)
    })
    regionsPlugin.on('region-clicked', (region, event) => {
      event.stopPropagation()
      editorCallbacksRef.current.onSelectRegion(region.id)
      setContextMenu(null)
    })
    regionsPlugin.on('region-updated', syncUpdatedRegion)
    return () => {
      waveSurfer.destroy()
      waveSurferRef.current = null
      regionsPluginRef.current = null
      regionMapRef.current = new Map()
      stopPendingSequencePlayback()
    }
  }, [source?.record.id])

  useEffect(() => {
    const plugin = regionsPluginRef.current
    if (!plugin) return
    const desiredIds = new Set(regions.map((region) => region.id))

    for (const [regionId, pluginRegion] of regionMapRef.current.entries()) {
      if (!desiredIds.has(regionId)) {
        pluginRegion.remove()
        regionMapRef.current.delete(regionId)
      }
    }

    for (const region of regions) {
      const pluginRegion = regionMapRef.current.get(region.id)
      const color = region.id === selectedRegionId ? selectedRegionColor : regionColor
      if (pluginRegion) {
        const changed = pluginRegion.start !== region.startSeconds
          || pluginRegion.end !== region.endSeconds
          || pluginRegion.color !== color
        if (changed) {
          pluginRegion.setOptions({
            start: region.startSeconds,
            end: region.endSeconds,
            color,
          })
        }
        continue
      }
      const nextRegion = plugin.addRegion({
        id: region.id,
        start: region.startSeconds,
        end: region.endSeconds,
        color,
        drag: true,
        resize: true,
        minLength: minAudioClipDurationSeconds,
      })
      regionMapRef.current.set(region.id, nextRegion)
      nextRegion.element?.addEventListener('contextmenu', (event) => {
        event.preventDefault()
        event.stopPropagation()
        onSelectRegion(region.id)
        setContextMenu({ type: 'region', x: event.clientX, y: event.clientY, regionId: region.id })
      })
    }
  }, [onSelectRegion, regions, selectedRegionId])

  const handleWaveformContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || durationSeconds <= 0) return
    event.preventDefault()
    const rect = waveformRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    setContextMenu({
      type: 'waveform',
      x: event.clientX,
      y: event.clientY,
      atSeconds: ratio * durationSeconds,
    })
  }

  const playSelectedRegion = () => {
    onStopPendingPreviewPlayback()
    stopPendingSequencePlayback()
    regionMapRef.current.get(selectedRegionId)?.play(true)
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
        editorCallbacksRef.current.onCurrentTimeChange(sourceTimeSeconds)
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
    contextMenu,
    pendingSegmentsRef,
    playPendingAt,
    waveformRef,
    handleWaveformContextMenu,
    pausePlayback,
    playPendingSegments,
    playSelectedRegion,
    setContextMenu,
    setPendingPlaybackLoop: (checked: boolean) => { pendingPlaybackRef.current.loop = checked },
    stopPendingSequencePlayback,
    toggleSourcePlayback,
  }
}
