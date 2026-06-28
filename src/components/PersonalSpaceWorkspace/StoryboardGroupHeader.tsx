import type { UploadProps } from 'antd'
import { Button, Popconfirm, Upload } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  StarFilled,
  StarOutlined,
  UploadOutlined,
} from '@ant-design/icons'

import type { PersonalSpaceAsset, StoryboardGroup } from './personalSpaceModel'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'
import { StoryboardVoicePicker } from './StoryboardVoicePicker'

export interface StoryboardGroupHeaderProps {
  item: StoryboardGroup
  voiceAssets: PersonalSpaceAsset[]
  getStoryboardVoiceUploadProps: (groupId: string) => UploadProps
  isRenaming: boolean
  storyboardNameDraft: string
  isExportingStoryboard: boolean
  storyboardExportingKey: string
  onRenameOpenChange: (group: StoryboardGroup, open: boolean) => void
  onStoryboardNameDraftChange: (groupId: string, value: string) => void
  onConfirmStoryboardRename: (group: StoryboardGroup) => void
  onCancelStoryboardRename: (groupId: string) => void
  onToggleStoryboardStar: (groupId: string) => void
  onExportStoryboardVoiceAssets: (groupId: string) => void
  onExportStoryboardCharacterAssets: (groupId: string) => void
  onDeleteStoryboard: (groupId: string) => void
  onAssignVoiceToStoryboard: (groupId: string, assetId: string) => void
}

export function StoryboardGroupHeader({
  item,
  voiceAssets,
  getStoryboardVoiceUploadProps,
  isRenaming,
  storyboardNameDraft,
  isExportingStoryboard,
  storyboardExportingKey,
  onRenameOpenChange,
  onStoryboardNameDraftChange,
  onConfirmStoryboardRename,
  onCancelStoryboardRename,
  onToggleStoryboardStar,
  onExportStoryboardVoiceAssets,
  onExportStoryboardCharacterAssets,
  onDeleteStoryboard,
  onAssignVoiceToStoryboard,
}: StoryboardGroupHeaderProps) {
  return (
    <div className="command-row storyboard-command-row">
      <div className="record-name-view storyboard-name-view">
        <span className="field-label">分组名称</span>
        <Button
          size="small"
          type="text"
          className="star-toggle-button"
          icon={item.starred ? <StarFilled /> : <StarOutlined />}
          aria-label={item.starred ? '取消星标剧情分组' : '星标剧情分组'}
          onClick={() => onToggleStoryboardStar(item.id)}
        />
        <strong>{item.name}</strong>
        <PersonalSpaceTextPopover
          open={isRenaming}
          onOpenChange={(open) => onRenameOpenChange(item, open)}
          className="storyboard-name-rename-popover"
          value={storyboardNameDraft}
          ariaLabel={`${item.name}分组名称`}
          placeholder="分组名称"
          confirmDisabled={!storyboardNameDraft.trim()}
          onValueChange={(value) => onStoryboardNameDraftChange(item.id, value)}
          onConfirm={() => onConfirmStoryboardRename(item)}
          onCancel={() => onCancelStoryboardRename(item.id)}
        >
          <Button size="small" icon={<EditOutlined />} aria-label="重命名剧情分组" />
        </PersonalSpaceTextPopover>
      </div>
      <div className="storyboard-header-actions">
        <Upload {...getStoryboardVoiceUploadProps(item.id)}>
          <Button size="small" icon={<UploadOutlined />}>导入配音</Button>
        </Upload>
        <StoryboardVoicePicker
          groupId={item.id}
          voiceAssets={voiceAssets}
          onAssignVoiceToStoryboard={onAssignVoiceToStoryboard}
        />
        <Button
          size="small"
          icon={<ExportOutlined />}
          loading={storyboardExportingKey === `group-voices-${item.id}`}
          disabled={isExportingStoryboard}
          onClick={() => onExportStoryboardVoiceAssets(item.id)}
        >
          导出分组配音资产
        </Button>
        <Button
          size="small"
          icon={<ExportOutlined />}
          loading={storyboardExportingKey === `group-characters-${item.id}`}
          disabled={isExportingStoryboard}
          onClick={() => onExportStoryboardCharacterAssets(item.id)}
        >
          导出分组关联角色资产
        </Button>
        <Popconfirm title="删除剧情组" description="会移除素材中关联到该剧情组的关系。" onConfirm={() => onDeleteStoryboard(item.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
    </div>
  )
}
