import { memo } from 'react'
import { Button, Typography } from 'antd'
import { EyeInvisibleOutlined, EyeOutlined, HolderOutlined } from '@ant-design/icons'
import type { FrameItem } from './types'

const { Text } = Typography

type PlaybackFrameRowProps = {
  item: FrameItem
  index: number
  selected: boolean
  isPreview: boolean
  inPlaybackList: boolean
  onDragStart: (id: string) => void
  onDrop: (id: string) => void
  onSelect: (item: FrameItem, e: React.MouseEvent<HTMLDivElement>) => void
  onToggleHidden: (id: string, e: React.MouseEvent<HTMLElement>) => void
}

export const PlaybackFrameRow = memo(function PlaybackFrameRow({
  item,
  index,
  selected,
  isPreview,
  inPlaybackList,
  onDragStart,
  onDrop,
  onSelect,
  onToggleHidden,
}: PlaybackFrameRowProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(item.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(item.id)}
      onClick={(e) => onSelect(item, e)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        border: selected ? '1px solid #1677ff' : inPlaybackList ? '1px solid #ff7ab6' : '1px solid #b8a898',
        background: inPlaybackList ? '#ffe4f0' : selected ? '#e6f4ff' : isPreview ? '#f5e8df' : '#fff',
        boxShadow: isPreview ? `inset 3px 0 0 ${inPlaybackList ? '#d63384' : '#b55233'}` : undefined,
        cursor: 'grab',
        opacity: item.hidden ? 0.48 : 1,
      }}
    >
      <HolderOutlined />
      <Text>{index + 1}</Text>
      {item.composedUrl && <img src={item.composedUrl} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />}
      <Text ellipsis style={{ flex: 1 }}>{item.sourceName}</Text>
      <Button
        size="small"
        type="text"
        aria-label={item.hidden ? '显示此帧' : '隐藏此帧'}
        icon={item.hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        onClick={(e) => onToggleHidden(item.id, e)}
      />
    </div>
  )
})
