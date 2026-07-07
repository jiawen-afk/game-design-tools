import { Button } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

export type AudioContextMenuState =
  | { type: 'waveform'; x: number; y: number; atSeconds: number }
  | { type: 'region'; x: number; y: number; regionId: string }
  | null

interface AudioClipEditorMenusProps {
  contextMenu: AudioContextMenuState
  onAddContextRegion: () => void
  onDeleteContextRegion: () => void
}

export function AudioClipEditorMenus({
  contextMenu,
  onAddContextRegion,
  onDeleteContextRegion,
}: AudioClipEditorMenusProps) {
  if (!contextMenu) return null

  return (
    <div className="audio-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
      {contextMenu.type === 'waveform' ? (
        <Button type="text" size="small" icon={<PlusOutlined />} onClick={onAddContextRegion}>
          添加片段区块
        </Button>
      ) : (
        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onDeleteContextRegion}>
          删除片段区块
        </Button>
      )}
    </div>
  )
}
