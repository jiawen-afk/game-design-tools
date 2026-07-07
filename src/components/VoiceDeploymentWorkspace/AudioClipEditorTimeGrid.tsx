import { InputNumber } from 'antd'

import {
  formatAudioClipTime,
  type AudioClipRange,
} from './audioClipModel'

interface AudioClipEditorTimeGridProps {
  currentTimeSeconds: number
  durationSeconds: number
  pendingDuration: number
  range: AudioClipRange
  selectedDuration: number
  selectedRegionId: string
  onRangeChange: (range: AudioClipRange) => void
}

export function AudioClipEditorTimeGrid({
  currentTimeSeconds,
  durationSeconds,
  pendingDuration,
  range,
  selectedDuration,
  selectedRegionId,
  onRangeChange,
}: AudioClipEditorTimeGridProps) {
  return (
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
  )
}
