import { DownloadOutlined, FolderAddOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Input } from 'antd'

import type { AudioPendingSegment } from './audioSegmentModel'

interface AudioClipEditorOutputActionsProps {
  canCollectSound: boolean
  canCollectVoice: boolean
  canExport: boolean
  canGenerateHistory: boolean
  outputName: string
  pendingSegments: AudioPendingSegment[]
  saving: boolean
  onCollectSoundClip: (segments: AudioPendingSegment[]) => void
  onCollectVoiceClip: (segments: AudioPendingSegment[]) => void
  onExportClip: (segments: AudioPendingSegment[]) => void
  onGenerateHistory: (segments: AudioPendingSegment[]) => void
  onOutputNameChange: (name: string) => void
}

export function AudioClipEditorOutputActions({
  canCollectSound,
  canCollectVoice,
  canExport,
  canGenerateHistory,
  outputName,
  pendingSegments,
  saving,
  onCollectSoundClip,
  onCollectVoiceClip,
  onExportClip,
  onGenerateHistory,
  onOutputNameChange,
}: AudioClipEditorOutputActionsProps) {
  return (
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
            onClick={() => onGenerateHistory(pendingSegments)}
          >
            生成到历史
          </Button>
        ) : null}
        <Button
          icon={<DownloadOutlined />}
          loading={saving}
          disabled={!canExport}
          onClick={() => onExportClip(pendingSegments)}
        >
          导出到本地
        </Button>
        {canCollectVoice ? (
          <Button
            icon={<FolderAddOutlined />}
            loading={saving}
            disabled={!canExport}
            onClick={() => onCollectVoiceClip(pendingSegments)}
          >
            收藏到项目空间-配音
          </Button>
        ) : null}
        {canCollectSound ? (
          <Button
            icon={<FolderAddOutlined />}
            loading={saving}
            disabled={!canExport}
            onClick={() => onCollectSoundClip(pendingSegments)}
          >
            收藏到项目空间-音效
          </Button>
        ) : null}
      </div>
    </div>
  )
}
