import { type DragEvent } from 'react'
import { Button, Switch } from 'antd'
import { DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons'

import { formatAudioClipTime } from './audioClipModel'
import type {
  AudioPendingDropPlacement,
  AudioPendingSegment,
} from './audioSegmentModel'

type AudioPendingDropTarget = { regionId: string; placement: AudioPendingDropPlacement } | null

interface AudioClipEditorSegmentsProps {
  draggedPendingRegionId: string
  pendingDropTarget: AudioPendingDropTarget
  pendingDuration: number
  pendingSegments: AudioPendingSegment[]
  visiblePendingSegments: AudioPendingSegment[]
  onDragEnd: () => void
  onDragLeave: (event: DragEvent<HTMLElement>) => void
  onDragOver: (event: DragEvent<HTMLElement>) => void
  onDragStart: (regionId: string, event: DragEvent<HTMLElement>) => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onLoopChange: (checked: boolean) => void
  onPlayAll: () => void
  onPlayPendingSegment: (index: number) => void
  onRemovePendingSegment: (regionId: string) => void
  onSelectRegion: (regionId: string) => void
}

export function AudioClipEditorSegments({
  draggedPendingRegionId,
  pendingDropTarget,
  pendingDuration,
  pendingSegments,
  visiblePendingSegments,
  onDragEnd,
  onDragLeave,
  onDragOver,
  onDragStart,
  onDrop,
  onLoopChange,
  onPlayAll,
  onPlayPendingSegment,
  onRemovePendingSegment,
  onSelectRegion,
}: AudioClipEditorSegmentsProps) {
  return (
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
            onClick={onPlayAll}
          >
            播放全部
          </Button>
          <span className="audio-editor-loop">
            循环 <Switch size="small" onChange={onLoopChange} />
          </span>
        </div>
      </div>

      <div
        className="audio-editor-pending-list"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
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
              onDragStart={(event) => onDragStart(segment.regionId, event)}
              onDragEnd={onDragEnd}
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
                  onClick={() => onPlayPendingSegment(pendingIndex)}
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
  )
}
