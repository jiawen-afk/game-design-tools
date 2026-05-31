import { Typography } from 'antd'

import { formatVideoTime } from './videoFramePipeline'
import type { ExtractedVideoFrame } from './types'

const { Text } = Typography

export interface VideoFrameListProps {
  frames: ExtractedVideoFrame[]
  previewIndex: number
  onSelect: (index: number) => void
}

export function VideoFrameList({ frames, previewIndex, onSelect }: VideoFrameListProps) {
  if (frames.length === 0) {
    return <Text type="secondary">帧图片列表会在提取后显示</Text>
  }

  return frames.map((frame) => (
    <button
      key={frame.url}
      type="button"
      onClick={() => onSelect(frame.index)}
      style={{
        border: frame.index === previewIndex ? '1px solid #1677ff' : '1px solid #d8cabc',
        background: '#fff',
        padding: 6,
        cursor: 'pointer',
      }}
    >
      <img src={frame.url} alt={frame.name} />
      <Text style={{ fontSize: 11 }}>{formatVideoTime(frame.time)}</Text>
    </button>
  ))
}
