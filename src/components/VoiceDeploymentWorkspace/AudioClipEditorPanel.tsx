import { type DragEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Button, Input, InputNumber, type UploadProps } from 'antd'
import {
  DownloadOutlined,
  FolderAddOutlined,
  SaveOutlined,
  ScissorOutlined,
} from '@ant-design/icons'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.esm.js'

import {
  formatAudioClipTime,
  minAudioClipDurationSeconds,
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'
import {
  reorderPendingSegmentsAroundTarget,
  resolvePendingPlaybackStep,
  type AudioPendingDropPlacement,
  type AudioPendingSegment,
  type AudioSegmentRegion,
} from './audioSegmentModel'
import { buildAudioClipEditorViewModel } from './audioClipEditorViewModel'
import { AudioClipEditorImportSurface } from './AudioClipEditorImportSurface'
import {
  AudioClipEditorMenus,
  type AudioContextMenuState,
} from './AudioClipEditorMenus'
import { AudioClipEditorSegments } from './AudioClipEditorSegments'
import { AudioClipEditorToolbar } from './AudioClipEditorToolbar'
import { AudioClipEditorTrack } from './AudioClipEditorTrack'

type AudioPendingDropTarget = { regionId: string; placement: AudioPendingDropPlacement } | null

export interface AudioClipEditorPanelProps {
  source: AudioClipSource | null
  durationSeconds: number
  regions: AudioSegmentRegion[]
  selectedRegionId: string
  pendingSegments: AudioPendingSegment[]
  range: AudioClipRange
  currentTimeSeconds: number
  outputName: string
  saving: boolean
  canGenerateHistory: boolean
  canExport: boolean
  canCollectVoice: boolean
  canCollectSound: boolean
  canAddSelectedRegionToPending: boolean
  error: string
  onDurationChange: (seconds: number) => void
  onAddRegionAt: (seconds: number) => void
  onSelectRegion: (regionId: string) => void
  onUpdateRegion: (regionId: string, range: AudioClipRange) => void
  onDeleteRegion: (regionId: string) => void
  onAddSelectedRegionToPending: () => void
  onRemovePendingSegment: (regionId: string) => void
  onReorderPendingSegment: (fromIndex: number, toIndex: number) => void
  onCommitPendingSegmentsOrder: (segments: AudioPendingSegment[]) => void
  onReorderPendingSegmentAroundTarget: (
    draggedRegionId: string,
    targetRegionId: string,
    placement: AudioPendingDropPlacement,
  ) => void
  onRangeChange: (range: AudioClipRange) => void
  onCurrentTimeChange: (seconds: number) => void
  onOutputNameChange: (name: string) => void
  onImportAudioFile: (file: File) => void
  onPlayPendingSegments: (
    segments: AudioPendingSegment[],
    loop: boolean,
    onProgress: (sourceTimeSeconds: number) => void,
  ) => void
  onStopPendingPreviewPlayback: () => void
  onGenerateHistory: (segments: AudioPendingSegment[]) => void
  onExportClip: (segments: AudioPendingSegment[]) => void
  onCollectVoiceClip: (segments: AudioPendingSegment[]) => void
  onCollectSoundClip: (segments: AudioPendingSegment[]) => void
}

const selectedRegionColor = 'rgba(49, 95, 186, 0.28)'
const regionColor = 'rgba(49, 95, 186, 0.16)'

export function AudioClipEditorPanel({
  source,
  durationSeconds,
  regions,
  selectedRegionId,
  pendingSegments,
  range,
  currentTimeSeconds,
  outputName,
  saving,
  canGenerateHistory,
  canExport,
  canCollectVoice,
  canCollectSound,
  canAddSelectedRegionToPending,
  error,
  onDurationChange,
  onAddRegionAt,
  onSelectRegion,
  onUpdateRegion,
  onDeleteRegion,
  onAddSelectedRegionToPending,
  onRemovePendingSegment,
  onCommitPendingSegmentsOrder,
  onRangeChange,
  onCurrentTimeChange,
  onOutputNameChange,
  onImportAudioFile,
  onPlayPendingSegments,
  onStopPendingPreviewPlayback,
  onGenerateHistory,
  onExportClip,
  onCollectVoiceClip,
  onCollectSoundClip,
}: AudioClipEditorPanelProps) {
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
  const draggedPendingRegionIdRef = useRef<string | null>(null)
  const pendingDropTargetRef = useRef<AudioPendingDropTarget>(null)
  const previewPendingSegmentsRef = useRef<AudioPendingSegment[] | null>(null)
  const pendingPlaybackRef = useRef({
    active: false,
    index: 0,
    loop: false,
    seekingToSeconds: null as number | null,
  })
  const pendingPlaybackFrameRef = useRef<number | null>(null)
  const [contextMenu, setContextMenu] = useState<AudioContextMenuState>(null)
  const [draggedPendingRegionId, setDraggedPendingRegionId] = useState('')
  const [pendingDropTarget, setPendingDropTarget] = useState<AudioPendingDropTarget>(null)
  const [previewPendingSegments, setPreviewPendingSegments] = useState<AudioPendingSegment[] | null>(null)

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
    pendingDropTargetRef.current = null
    previewPendingSegmentsRef.current = null
    setPendingDropTarget(null)
    setPreviewPendingSegments(null)
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

  const schedulePendingPlaybackFrame = () => {
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

  const importUploadProps: UploadProps = {
    accept: 'audio/*',
    showUploadList: false,
    beforeUpload: (file: File) => {
      onImportAudioFile(file)
      return false
    },
  }

  const editorViewModel = source
    ? buildAudioClipEditorViewModel({
      source,
      range,
      pendingSegments,
      previewPendingSegments,
    })
    : null

  const getPendingDropTarget = (
    event: DragEvent<HTMLElement>,
    draggedRegionId: string,
  ): AudioPendingDropTarget => {
    const cards = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-audio-pending-region-id]'))
      .map((card) => ({ card, regionId: card.dataset.audioPendingRegionId ?? '' }))
      .filter((card) => card.regionId && card.regionId !== draggedRegionId)
    if (cards.length === 0) return null

    const beforeCard = cards.find(({ card }) => {
      const rect = card.getBoundingClientRect()
      if (event.clientY < rect.top + rect.height / 2) return true
      return event.clientY <= rect.bottom && event.clientX < rect.left + rect.width / 2
    })
    if (beforeCard) return { regionId: beforeCard.regionId, placement: 'before' }
    return { regionId: cards[cards.length - 1].regionId, placement: 'after' }
  }

  const previewPendingSegmentDrop = (event: DragEvent<HTMLElement>, draggedRegionId: string) => {
    const target = getPendingDropTarget(event, draggedRegionId)
    if (!target) return
    const previewSegments = reorderPendingSegmentsAroundTarget(
      pendingSegmentsRef.current,
      draggedRegionId,
      target.regionId,
      target.placement,
    )
    pendingDropTargetRef.current = target
    previewPendingSegmentsRef.current = previewSegments
    setPendingDropTarget(target)
    setPreviewPendingSegments(previewSegments)
  }

  const clearPendingDropPreview = () => {
    pendingDropTargetRef.current = null
    previewPendingSegmentsRef.current = null
    setPendingDropTarget(null)
    setPreviewPendingSegments(null)
  }

  const endPendingDrag = () => {
    draggedPendingRegionIdRef.current = null
    setDraggedPendingRegionId('')
    clearPendingDropPreview()
  }

  const handlePendingListDragOver = (event: DragEvent<HTMLElement>) => {
    const draggedRegionId = event.dataTransfer.getData('text/plain') || draggedPendingRegionIdRef.current
    if (!draggedRegionId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    previewPendingSegmentDrop(event, draggedRegionId)
  }

  const handlePendingListDragLeave = (event: DragEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    clearPendingDropPreview()
  }

  const handlePendingListDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const draggedRegionId = event.dataTransfer.getData('text/plain') || draggedPendingRegionIdRef.current
    if (draggedRegionId) {
      const target = pendingDropTargetRef.current ?? getPendingDropTarget(event, draggedRegionId)
      if (target) {
        const committedPendingSegments = previewPendingSegmentsRef.current ?? reorderPendingSegmentsAroundTarget(
          pendingSegmentsRef.current,
          draggedRegionId,
          target.regionId,
          target.placement,
        )
        pendingSegmentsRef.current = committedPendingSegments
        onCommitPendingSegmentsOrder(committedPendingSegments)
      }
    }
    endPendingDrag()
  }

  const handleWaveformContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
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

  const addContextRegion = () => {
    if (contextMenu?.type !== 'waveform') return
    onAddRegionAt(contextMenu.atSeconds)
    setContextMenu(null)
  }

  const deleteContextRegion = () => {
    if (contextMenu?.type !== 'region') return
    onDeleteRegion(contextMenu.regionId)
    setContextMenu(null)
  }

  if (!source) {
    return (
      <AudioClipEditorImportSurface
        error={error}
        uploadProps={importUploadProps}
      />
    )
  }

  if (!editorViewModel) return null

  return (
    <section className="voice-panel audio-editor-panel" aria-labelledby="audio-editor-title">
      <div className="panel-title">
        <ScissorOutlined />
        <h3 id="audio-editor-title">音频编辑</h3>
      </div>

      <AudioClipEditorImportSurface
        durationSeconds={durationSeconds}
        source={source}
        sourceKindLabel={editorViewModel.sourceKindLabel}
        uploadProps={importUploadProps}
      />

      <AudioClipEditorTrack
        waveformRef={waveformRef}
        onContextMenu={handleWaveformContextMenu}
      />

      <AudioClipEditorMenus
        contextMenu={contextMenu}
        onAddContextRegion={addContextRegion}
        onDeleteContextRegion={deleteContextRegion}
      />

      <AudioClipEditorToolbar
        canAddSelectedRegionToPending={canAddSelectedRegionToPending}
        selectedRegionId={selectedRegionId}
        onAddSelectedRegionToPending={onAddSelectedRegionToPending}
        onPausePlayback={pausePlayback}
        onPlaySelectedRegion={playSelectedRegion}
        onToggleSourcePlayback={() => {
          onStopPendingPreviewPlayback()
          stopPendingSequencePlayback()
          void waveSurferRef.current?.playPause()
        }}
      />

      <div className="audio-editor-time-grid">
        <label>
          <span>开始</span>
          <InputNumber
            min={0}
            max={durationSeconds}
            step={0.01}
            value={range.startSeconds}
            disabled={!selectedRegionId}
            onChange={(value) => onRangeChange({ ...range, startSeconds: Number(value) || 0 })}
          />
        </label>
        <label>
          <span>结束</span>
          <InputNumber
            min={0}
            max={durationSeconds}
            step={0.01}
            value={range.endSeconds}
            disabled={!selectedRegionId}
            onChange={(value) => onRangeChange({ ...range, endSeconds: Number(value) || 0 })}
          />
        </label>
        <label>
          <span>当前</span>
          <strong>{formatAudioClipTime(currentTimeSeconds)}</strong>
        </label>
        <label>
          <span>选中</span>
          <strong>{formatAudioClipTime(editorViewModel.selectedDuration)}</strong>
        </label>
        <label>
          <span>待处理</span>
          <strong>{formatAudioClipTime(editorViewModel.pendingDuration)}</strong>
        </label>
      </div>

      <AudioClipEditorSegments
        draggedPendingRegionId={draggedPendingRegionId}
        pendingDropTarget={pendingDropTarget}
        pendingDuration={editorViewModel.pendingDuration}
        pendingSegments={pendingSegments}
        visiblePendingSegments={editorViewModel.visiblePendingSegments}
        onDragEnd={endPendingDrag}
        onDragLeave={handlePendingListDragLeave}
        onDragOver={handlePendingListDragOver}
        onDragStart={(regionId, event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', regionId)
          draggedPendingRegionIdRef.current = regionId
          setDraggedPendingRegionId(regionId)
        }}
        onDrop={handlePendingListDrop}
        onLoopChange={(checked) => { pendingPlaybackRef.current.loop = checked }}
        onPlayAll={playPendingSegments}
        onPlayPendingSegment={(index) => {
          onStopPendingPreviewPlayback()
          stopPendingSequencePlayback()
          playPendingAt(index)
        }}
        onRemovePendingSegment={onRemovePendingSegment}
        onSelectRegion={onSelectRegion}
      />

      <div className="audio-editor-save-row">
        <Input
          value={outputName}
          aria-label="剪辑音频名称"
          onChange={(event) => onOutputNameChange(event.target.value)}
        />
        <div className="audio-editor-output-actions">
          {canGenerateHistory ? (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!canExport}
              onClick={() => onGenerateHistory(pendingSegmentsRef.current)}
            >
              生成到历史
            </Button>
          ) : null}
          <Button
            icon={<DownloadOutlined />}
            loading={saving}
            disabled={!canExport}
            onClick={() => onExportClip(pendingSegmentsRef.current)}
          >
            导出到本地
          </Button>
          {canCollectVoice ? (
            <Button
              icon={<FolderAddOutlined />}
              loading={saving}
              disabled={!canExport}
              onClick={() => onCollectVoiceClip(pendingSegmentsRef.current)}
            >
              收藏到项目空间-配音
            </Button>
          ) : null}
          {canCollectSound ? (
            <Button
              icon={<FolderAddOutlined />}
              loading={saving}
              disabled={!canExport}
              onClick={() => onCollectSoundClip(pendingSegmentsRef.current)}
            >
              收藏到项目空间-音效
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <Alert type="warning" showIcon title={error} /> : null}
    </section>
  )
}
