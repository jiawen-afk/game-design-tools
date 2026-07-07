import { useEffect, useRef } from 'react'
import { Alert, Button, Input, InputNumber, Space, Switch, Tag, Upload } from 'antd'
import {
  InboxOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  ScissorOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
} from '@ant-design/icons'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.esm.js'

import {
  formatAudioClipTime,
  minAudioClipDurationSeconds,
  normalizeAudioClipRange,
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'

export interface AudioClipEditorPanelProps {
  source: AudioClipSource | null
  durationSeconds: number
  range: AudioClipRange
  currentTimeSeconds: number
  outputName: string
  saving: boolean
  canSave: boolean
  error: string
  onDurationChange: (seconds: number) => void
  onRangeChange: (range: AudioClipRange) => void
  onCurrentTimeChange: (seconds: number) => void
  onOutputNameChange: (name: string) => void
  onImportAudioFile: (file: File) => void
  onSaveClip: () => void
}

export function AudioClipEditorPanel({
  source,
  durationSeconds,
  range,
  currentTimeSeconds,
  outputName,
  saving,
  canSave,
  error,
  onDurationChange,
  onRangeChange,
  onCurrentTimeChange,
  onOutputNameChange,
  onImportAudioFile,
  onSaveClip,
}: AudioClipEditorPanelProps) {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const waveSurferRef = useRef<WaveSurfer | null>(null)
  const regionRef = useRef<Region | null>(null)
  const loopSelectionRef = useRef(false)

  useEffect(() => {
    if (!source || !waveformRef.current) return undefined
    const regions = RegionsPlugin.create()
    const waveSurfer = WaveSurfer.create({
      container: waveformRef.current,
      url: source.record.audioUrl,
      height: 92,
      normalize: true,
      waveColor: '#8ea0ba',
      progressColor: '#315fba',
      cursorColor: '#1c2b4a',
      plugins: [regions],
    })
    waveSurferRef.current = waveSurfer

    waveSurfer.on('ready', () => {
      const duration = waveSurfer.getDuration()
      onDurationChange(duration)
      const initialRange = normalizeAudioClipRange({ startSeconds: 0, endSeconds: Math.min(duration, 3) }, duration)
      onRangeChange(initialRange)
      regionRef.current = regions.addRegion({
        start: initialRange.startSeconds,
        end: initialRange.endSeconds,
        color: 'rgba(49, 95, 186, 0.18)',
        drag: true,
        resize: true,
        minLength: minAudioClipDurationSeconds,
      })
    })
    waveSurfer.on('timeupdate', onCurrentTimeChange)
    regions.on('region-updated', (region) => {
      onRangeChange({ startSeconds: region.start, endSeconds: region.end })
    })
    regions.on('region-out', (region) => {
      if (loopSelectionRef.current) region.play(true)
    })

    return () => {
      waveSurfer.destroy()
      waveSurferRef.current = null
      regionRef.current = null
    }
  }, [source?.record.id])

  useEffect(() => {
    const region = regionRef.current
    if (!region) return
    region.setOptions({
      start: range.startSeconds,
      end: range.endSeconds,
    })
  }, [range.endSeconds, range.startSeconds])

  const playSelection = () => {
    regionRef.current?.play(true)
  }

  const setStartAtCurrentTime = () => {
    onRangeChange({ ...range, startSeconds: currentTimeSeconds })
  }

  const setEndAtCurrentTime = () => {
    onRangeChange({ ...range, endSeconds: currentTimeSeconds })
  }

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

      <div className="audio-waveform" ref={waveformRef} />

      <div className="audio-editor-controls">
        <Button icon={<PlayCircleOutlined />} onClick={() => void waveSurferRef.current?.playPause()}>
          播放源音频
        </Button>
        <Button icon={<PauseCircleOutlined />} onClick={() => waveSurferRef.current?.pause()}>
          暂停
        </Button>
        <Button icon={<PlayCircleOutlined />} onClick={playSelection}>
          播放片段
        </Button>
        <span className="audio-editor-loop">
          循环片段 <Switch size="small" onChange={(checked) => { loopSelectionRef.current = checked }} />
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
            onChange={(value) => onRangeChange({ ...range, endSeconds: Number(value) || 0 })}
          />
        </label>
        <label>
          <span>当前</span>
          <strong>{formatAudioClipTime(currentTimeSeconds)}</strong>
        </label>
        <label>
          <span>片段</span>
          <strong>{formatAudioClipTime(range.endSeconds - range.startSeconds)}</strong>
        </label>
      </div>

      <Space wrap>
        <Button icon={<StepBackwardOutlined />} onClick={setStartAtCurrentTime}>设为开始</Button>
        <Button icon={<StepForwardOutlined />} onClick={setEndAtCurrentTime}>设为结束</Button>
      </Space>

      <div className="audio-editor-save-row">
        <Input
          value={outputName}
          aria-label="剪辑音频名称"
          onChange={(event) => onOutputNameChange(event.target.value)}
        />
        <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!canSave} onClick={onSaveClip}>
          生成新音频
        </Button>
      </div>

      {error ? <Alert type="warning" showIcon title={error} /> : null}
    </section>
  )
}
