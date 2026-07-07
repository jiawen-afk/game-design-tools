import { useEffect, useRef, useState } from 'react'
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
import type {
  AudioPendingSegment,
  AudioSegmentRegion,
} from './audioSegmentModel'

type AudioContextMenuState =
  | { type: 'waveform'; x: number; y: number; atSeconds: number }
  | { type: 'region'; x: number; y: number; regionId: string }
  | null

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
  onRangeChange: (range: AudioClipRange) => void
  onCurrentTimeChange: (seconds: number) => void
  onOutputNameChange: (name: string) => void
  onImportAudioFile: (file: File) => void
  onGenerateHistory: () => void
  onExportClip: () => void
  onCollectVoiceClip: () => void
  onCollectSoundClip: () => void
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
  onReorderPendingSegment,
  onRangeChange,
  onCurrentTimeChange,
  onOutputNameChange,
  onImportAudioFile,
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
  const draggedPendingIndexRef = useRef<number | null>(null)
  const pendingPlaybackRef = useRef({ active: false, index: 0, loop: false })
  const [contextMenu, setContextMenu] = useState<AudioContextMenuState>(null)

  useEffect(() => {
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

  const playPendingAt = (index: number) => {
    const segment = pendingSegmentsRef.current[index]
    if (!segment) {
      pendingPlaybackRef.current.active = false
      return
    }
    pendingPlaybackRef.current.index = index
    const region = regionMapRef.current.get(segment.regionId)
    if (region) {
      region.play(true)
      return
    }
    waveSurferRef.current?.setTime(segment.startSeconds)
    void waveSurferRef.current?.play()
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

    waveSurfer.on('ready', () => {
      onDurationChange(waveSurfer.getDuration())
    })
    waveSurfer.on('timeupdate', onCurrentTimeChange)
    regionsPlugin.on('region-clicked', (region, event) => {
      event.stopPropagation()
      onSelectRegion(region.id)
      setContextMenu(null)
    })
    regionsPlugin.on('region-updated', (region) => {
      onSelectRegion(region.id)
      onUpdateRegion(region.id, { startSeconds: region.start, endSeconds: region.end })
    })
    regionsPlugin.on('region-out', (region) => {
      const playback = pendingPlaybackRef.current
      const currentSegment = pendingSegmentsRef.current[playback.index]
      if (!playback.active || currentSegment?.regionId !== region.id) return
      const nextIndex = playback.index + 1
      if (nextIndex < pendingSegmentsRef.current.length) {
        playPendingAt(nextIndex)
        return
      }
      if (playback.loop) {
        playPendingAt(0)
        return
      }
      playback.active = false
    })

    return () => {
      waveSurfer.destroy()
      waveSurferRef.current = null
      regionsPluginRef.current = null
      regionMapRef.current = new Map()
      pendingPlaybackRef.current.active = false
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
    pendingPlaybackRef.current.active = false
    regionMapRef.current.get(selectedRegionId)?.play(true)
  }

  const playPendingSegments = () => {
    if (pendingSegments.length === 0) return
    pendingPlaybackRef.current.active = true
    playPendingAt(0)
  }

  const pausePlayback = () => {
    pendingPlaybackRef.current.active = false
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
          pendingPlaybackRef.current.active = false
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
        <Button icon={<PlayCircleOutlined />} disabled={pendingSegments.length === 0} onClick={playPendingSegments}>
          播放待处理
        </Button>
        <span className="audio-editor-loop">
          循环待处理 <Switch size="small" onChange={(checked) => { pendingPlaybackRef.current.loop = checked }} />
        </span>
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

      <div className="audio-editor-pending-header">
        <strong>待处理列表</strong>
        <Button
          size="small"
          icon={<PlusOutlined />}
          disabled={!canAddSelectedRegionToPending}
          onClick={onAddSelectedRegionToPending}
        >
          添加选中区块到待处理列表
        </Button>
      </div>

      <div className="audio-editor-pending-list">
        {pendingSegments.length === 0 ? (
          <div className="audio-editor-empty-row">待处理列表为空</div>
        ) : pendingSegments.map((segment, index) => (
          <div
            key={segment.regionId}
            className="audio-editor-pending-row"
            draggable
            onDragStart={() => { draggedPendingIndexRef.current = index }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const fromIndex = draggedPendingIndexRef.current
              draggedPendingIndexRef.current = null
              if (fromIndex === null) return
              onReorderPendingSegment(fromIndex, index)
            }}
          >
            <span>{index + 1}</span>
            <button type="button" onClick={() => onSelectRegion(segment.regionId)}>
              {formatAudioClipTime(segment.startSeconds)} - {formatAudioClipTime(segment.endSeconds)}
            </button>
            <strong>{formatAudioClipTime(segment.endSeconds - segment.startSeconds)}</strong>
            <Button
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => onRemovePendingSegment(segment.regionId)}
            />
          </div>
        ))}
      </div>

      <div className="audio-editor-save-row">
        <Input
          value={outputName}
          aria-label="剪辑音频名称"
          onChange={(event) => onOutputNameChange(event.target.value)}
        />
        <div className="audio-editor-output-actions">
          {canGenerateHistory ? (
            <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!canExport} onClick={onGenerateHistory}>
              生成到历史
            </Button>
          ) : null}
          <Button icon={<DownloadOutlined />} loading={saving} disabled={!canExport} onClick={onExportClip}>
            导出到本地
          </Button>
          {canCollectVoice ? (
            <Button icon={<FolderAddOutlined />} loading={saving} disabled={!canExport} onClick={onCollectVoiceClip}>
              收藏到项目空间-配音
            </Button>
          ) : null}
          {canCollectSound ? (
            <Button icon={<FolderAddOutlined />} loading={saving} disabled={!canExport} onClick={onCollectSoundClip}>
              收藏到项目空间-音效
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <Alert type="warning" showIcon title={error} /> : null}
    </section>
  )
}
