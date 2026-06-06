import { Button, Card, InputNumber, Segmented, Space, Typography } from 'antd'
import { EyeInvisibleOutlined, PlayCircleOutlined } from '@ant-design/icons'

import { clampInt } from './numberUtils'
import { PlaybackFrameRow } from './PlaybackFrameRow'
import type { PlaybackMode } from './playbackModel'
import type { FrameItem } from './types'

const { Text } = Typography

export interface PlaybackPanelProps {
  frames: FrameItem[]
  selectedCount: number
  fps: number
  playbackMode: PlaybackMode
  playing: boolean
  previewFrame: FrameItem | undefined
  playbackFrameCount: number
  playIndex: number
  visibleFrameCount: number
  selectedFrameIds: Set<string>
  playbackFrameIds: Set<string>
  onStartAll: () => void
  onStartSelected: () => void
  onPause: () => void
  onFpsChange: (fps: number) => void
  onPlaybackModeChange: (mode: PlaybackMode) => void
  onBatchHideSelected: () => void
  onDragStart: (id: string) => void
  onDrop: (id: string) => void
  onSelect: (item: FrameItem, event: React.MouseEvent<HTMLDivElement>) => void
  onToggleHidden: (id: string, event: React.MouseEvent<HTMLElement>) => void
}

export function PlaybackPanel({
  frames,
  selectedCount,
  fps,
  playbackMode,
  playing,
  previewFrame,
  playbackFrameCount,
  playIndex,
  visibleFrameCount,
  selectedFrameIds,
  playbackFrameIds,
  onStartAll,
  onStartSelected,
  onPause,
  onFpsChange,
  onPlaybackModeChange,
  onBatchHideSelected,
  onDragStart,
  onDrop,
  onSelect,
  onToggleHidden,
}: PlaybackPanelProps) {
  return (
    <Card title="4. 预览播放与排序">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap>
          <Button icon={<PlayCircleOutlined />} onClick={playing ? onPause : onStartAll}>
            {playing ? '暂停播放' : '全部播放'}
          </Button>
          <Button icon={<PlayCircleOutlined />} disabled={selectedCount === 0} onClick={onStartSelected}>
            播放选择的图片
          </Button>
          <Text>FPS</Text>
          <InputNumber min={1} max={60} value={fps} onChange={(value) => onFpsChange(clampInt(value ?? 12, 1, 60))} />
          <Segmented
            value={playbackMode}
            onChange={(value) => onPlaybackModeChange(value as PlaybackMode)}
            options={[
              { label: '循环', value: 'loop' },
              { label: '乒乓', value: 'pingpong' },
            ]}
          />
        </Space>
        <div className="playback-workspace-grid">
          <div className="playback-frame-list">
            {frames.map((item, index) => (
              <PlaybackFrameRow
                key={item.id}
                item={item}
                index={index}
                selected={selectedFrameIds.has(item.id)}
                isPreview={previewFrame?.id === item.id}
                inPlaybackList={playbackFrameIds.has(item.id)}
                onDragStart={onDragStart}
                onDrop={onDrop}
                onSelect={onSelect}
                onToggleHidden={onToggleHidden}
              />
            ))}
          </div>
          <div className="playback-preview-box">
            {previewFrame?.composedUrl ? (
              <Space direction="vertical" align="center">
                <img
                  src={previewFrame.composedUrl}
                  alt="preview"
                />
                <Text type="secondary">帧 {Math.min(playIndex + 1, playbackFrameCount)} / {playbackFrameCount}</Text>
              </Space>
            ) : (
              <Text type="secondary">{visibleFrameCount === 0 && frames.length > 0 ? '没有可预览的可见帧' : '等待帧处理完成'}</Text>
            )}
          </div>
        </div>
        <Space wrap>
          <Button
            icon={<EyeInvisibleOutlined />}
            disabled={selectedCount === 0}
            onClick={onBatchHideSelected}
          >
            批量隐藏
          </Button>
          <Text type="secondary">已选 {selectedCount} 张</Text>
        </Space>
      </Space>
    </Card>
  )
}
