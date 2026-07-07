import { type DragEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Button, Input, InputNumber, Switch, Tag, Upload } from 'antd'
import {
  DeleteOutlined,
  DownloadOutlined,
  FolderAddOutlined,
  InboxOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
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

type AudioContextMenuState =
  | { type: 'waveform'; x: number; y: number; atSeconds: number }
  | { type: 'region'; x: number; y: number; regionId: string }
  | null

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

  const importUploadProps = {
    accept: 'audio/*',
    showUploadList: false,
    beforeUpload: (file: File) => {
      onImportAudioFile(file)
      return false
    },
  }

  const sourceKindLabel = source?.sourceKind === 'voice'
    ? '配音'
    : source?.sourceKind === 'sound-effect'
      ? '音效'
      : '导入音频'

  const selectedDuration = Math.max(0, range.endSeconds - range.startSeconds)
  const pendingDuration = pendingSegments.reduce((sum, segment) => (
    sum + Math.max(0, segment.endSeconds - segment.startSeconds)
  ), 0)
  const visiblePendingSegments = previewPendingSegments ?? pendingSegments

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
      <section className="voice-panel audio-editor-panel" aria-labelledby="audio-editor-title">
        <div className="panel-title">
          <ScissorOutlined />
          <h3 id="audio-editor-title">音频编辑</h3>
        </div>
        <Upload.Dragger {...importUploadProps} className="audio-import-dropzone">
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">拖入音频文件</p>
          <p className="ant-upload-hint">也可以从生成配音或生成音效的历史记录中选择“剪辑片段”。</p>
        </Upload.Dragger>
        {error ? <Alert type="warning" showIcon title={error} /> : null}
      </section>
    )
  }

  return (
    <section className="voice-panel audio-editor-panel" aria-labelledby="audio-editor-title">
      <div className="panel-title">
        <ScissorOutlined />
        <h3 id="audio-editor-title">音频编辑</h3>
      </div>

      <div className="audio-editor-source-row">
        <Tag>{sourceKindLabel}</Tag>
        <strong>{source.record.name}</strong>
        <span>{formatAudioClipTime(durationSeconds)}</span>
        <Upload {...importUploadProps}>
          <Button size="small" icon={<InboxOutlined />}>更换音频</Button>
        </Upload>
      </div>

      <div className="audio-waveform" ref={waveformRef} onContextMenu={handleWaveformContextMenu} />

      {contextMenu ? (
        <div className="audio-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {contextMenu.type === 'waveform' ? (
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={addContextRegion}>
              添加片段区块
            </Button>
          ) : (
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={deleteContextRegion}>
              删除片段区块
            </Button>
          )}
        </div>
      ) : null}

      <div className="audio-editor-controls">
        <Button icon={<PlayCircleOutlined />} onClick={() => {
          onStopPendingPreviewPlayback()
          stopPendingSequencePlayback()
          void waveSurferRef.current?.playPause()
        }}>
          播放源音频
        </Button>
        <Button icon={<PauseCircleOutlined />} onClick={pausePlayback}>
          暂停
        </Button>
        <Button icon={<PlayCircleOutlined />} disabled={!selectedRegionId} onClick={playSelectedRegion}>
          播放选中区块
        </Button>
        <Button
          icon={<PlusOutlined />}
          disabled={!canAddSelectedRegionToPending}
          onClick={onAddSelectedRegionToPending}
        >
          添加选中区块到待处理
        </Button>
      </div>

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
          <strong>{formatAudioClipTime(selectedDuration)}</strong>
        </label>
        <label>
          <span>待处理</span>
          <strong>{formatAudioClipTime(pendingDuration)}</strong>
        </label>
      </div>

      <section className="audio-editor-pending-block" aria-labelledby="audio-editor-pending-title">
        <div className="audio-editor-pending-header">
          <div className="audio-editor-pending-title">
            <strong id="audio-editor-pending-title">待处理</strong>
            <span>{pendingSegments.length} 段 · {formatAudioClipTime(pendingDuration)}</span>
          </div>
          <div className="audio-editor-pending-actions">
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              disabled={pendingSegments.length === 0}
              onClick={playPendingSegments}
            >
              播放全部
            </Button>
            <span className="audio-editor-loop">
              循环 <Switch size="small" onChange={(checked) => { pendingPlaybackRef.current.loop = checked }} />
            </span>
          </div>
        </div>

        <div
          className="audio-editor-pending-list"
          onDragOver={handlePendingListDragOver}
          onDragLeave={handlePendingListDragLeave}
          onDrop={handlePendingListDrop}
        >
          {pendingSegments.length === 0 ? (
            <div className="audio-editor-empty-row">暂无待处理片段</div>
          ) : visiblePendingSegments.map((segment, index) => {
            const isDropTarget = pendingDropTarget?.regionId === segment.regionId
            const cardClassName = [
              'audio-editor-pending-card',
              draggedPendingRegionId === segment.regionId ? 'is-dragging' : '',
              isDropTarget ? 'is-drop-target' : '',
              isDropTarget && pendingDropTarget.placement === 'before' ? 'is-drop-before' : '',
              isDropTarget && pendingDropTarget.placement === 'after' ? 'is-drop-after' : '',
            ].filter(Boolean).join(' ')
            const pendingIndex = pendingSegments.findIndex((item) => item.regionId === segment.regionId)

            return (
              <div
                key={segment.regionId}
                className={cardClassName}
                data-audio-pending-region-id={segment.regionId}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', segment.regionId)
                  draggedPendingRegionIdRef.current = segment.regionId
                  setDraggedPendingRegionId(segment.regionId)
                }}
                onDragEnd={endPendingDrag}
              >
                <div className="audio-editor-pending-card-head">
                  <button
                    type="button"
                    className="audio-editor-pending-index"
                    onClick={() => onSelectRegion(segment.regionId)}
                  >
                    {index + 1}
                  </button>
                  <strong>{formatAudioClipTime(segment.endSeconds - segment.startSeconds)}</strong>
                  <Button
                    size="small"
                    type="text"
                    icon={<PlayCircleOutlined />}
                    onClick={() => {
                      onStopPendingPreviewPlayback()
                      stopPendingSequencePlayback()
                      playPendingAt(pendingIndex)
                    }}
                  >
                    播放
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => onRemovePendingSegment(segment.regionId)}
                  />
                </div>
                <button
                  type="button"
                  className="audio-editor-pending-time"
                  onClick={() => onSelectRegion(segment.regionId)}
                >
                  {formatAudioClipTime(segment.startSeconds)} - {formatAudioClipTime(segment.endSeconds)}
                </button>
                <div className="audio-editor-pending-waveform" aria-hidden="true">
                  {Array.from({ length: 18 }, (_, barIndex) => (
                    <span
                      key={barIndex}
                      style={{ height: `${30 + (((barIndex + 3) * (index + 5) * 13) % 58)}%` }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

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
