import { Button } from 'antd'
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons'

interface AudioClipEditorToolbarProps {
  canAddSelectedRegionToPending: boolean
  selectedRegionId: string
  onAddSelectedRegionToPending: () => void
  onPausePlayback: () => void
  onPlaySelectedRegion: () => void
  onToggleSourcePlayback: () => void
}

export function AudioClipEditorToolbar({
  canAddSelectedRegionToPending,
  selectedRegionId,
  onAddSelectedRegionToPending,
  onPausePlayback,
  onPlaySelectedRegion,
  onToggleSourcePlayback,
}: AudioClipEditorToolbarProps) {
  return (
    <div className="audio-editor-controls">
      <Button icon={<PlayCircleOutlined />} onClick={onToggleSourcePlayback}>
        播放源音频
      </Button>
      <Button icon={<PauseCircleOutlined />} onClick={onPausePlayback}>
        暂停
      </Button>
      <Button icon={<PlayCircleOutlined />} disabled={!selectedRegionId} onClick={onPlaySelectedRegion}>
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
  )
}
