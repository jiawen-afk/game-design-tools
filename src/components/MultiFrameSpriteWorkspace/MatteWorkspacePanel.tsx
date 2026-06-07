import { Button, Card, Space, Typography } from 'antd'
import { DeleteOutlined, DownloadOutlined, StarOutlined } from '@ant-design/icons'

import { MatteFrameCard, type MatteFrameCardProps } from './MatteFrameCard'
import { buildMatteFrameGroups } from './model'
import type { FrameItem } from './types'

const { Text } = Typography

export interface MatteWorkspacePanelProps {
  frames: FrameItem[]
  activeFrameId: string | null
  onOpenDefaults: () => void
  onRemoveAll: () => void
  onExportMatteGroup: (groupId: string) => void
  onImportMatteGroupToPersonalSpace: (groupId: string) => void
  onActivate: MatteFrameCardProps['onActivate']
  onRemoveGroup: (groupId: string) => void
  onSampleColor: MatteFrameCardProps['onSampleColor']
  onPreview: MatteFrameCardProps['onPreview']
  onMatteParamChange: MatteFrameCardProps['onMatteParamChange']
  onConfirmApplyToAll: MatteFrameCardProps['onApplyToFollowing']
  onCustomSpillPickerColor: MatteFrameCardProps['onCustomSpillPickerColor']
  onCustomSpillColor: MatteFrameCardProps['onCustomSpillColor']
  applyingGroupId: string | null
}

export function MatteWorkspacePanel({
  frames,
  activeFrameId,
  onOpenDefaults,
  onRemoveAll,
  onExportMatteGroup,
  onImportMatteGroupToPersonalSpace,
  onActivate,
  onRemoveGroup,
  onSampleColor,
  onPreview,
  onMatteParamChange,
  onConfirmApplyToAll,
  onCustomSpillPickerColor,
  onCustomSpillColor,
  applyingGroupId,
}: MatteWorkspacePanelProps) {
  const groups = buildMatteFrameGroups(frames)

  return (
    <Card
      title="2. 抠图去背"
      extra={
        <Space wrap>
          <Button onClick={onOpenDefaults}>抠图参数配置</Button>
          <Button danger icon={<DeleteOutlined />} disabled={frames.length === 0} onClick={onRemoveAll}>
            移除所有图片
          </Button>
        </Space>
      }
    >
      {groups.length > 0 ? (
        <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 16 }}>
          <Text type="secondary">
            每个任务组仅显示第 1 帧用于调试去背参数。确认后只会应用到该任务组内的图片帧。
          </Text>
          {groups.map((group) => (
            <div key={group.id} style={{ maxWidth: 620 }}>
              <MatteFrameCard
                key={group.firstFrame.id}
                item={group.firstFrame}
                title={(
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>{group.name} · 第 1 帧</span>
                    <Space size={6} wrap>
                      <Text type="secondary">共 {group.frameCount} 帧</Text>
                      <Button size="small" icon={<DownloadOutlined />} onClick={() => onExportMatteGroup(group.id)}>
                        导出组图片
                      </Button>
                      <Button size="small" icon={<StarOutlined />} onClick={() => onImportMatteGroupToPersonalSpace(group.id)}>
                        收藏到个人空间
                      </Button>
                    </Space>
                  </div>
                )}
                index={0}
                frameCount={group.frameCount}
                active={activeFrameId === group.firstFrame.id}
                onActivate={onActivate}
                onRemove={() => onRemoveGroup(group.id)}
                onSampleColor={onSampleColor}
                onPreview={onPreview}
                onMatteParamChange={onMatteParamChange}
                onApplyToFollowing={onConfirmApplyToAll}
                onCustomSpillPickerColor={onCustomSpillPickerColor}
                onCustomSpillColor={onCustomSpillColor}
                applyButtonLabel="应用到组所有帧"
                applyButtonLoading={applyingGroupId === group.id}
                applyButtonDisabled={Boolean(applyingGroupId) || group.frameCount === 0}
              />
            </div>
          ))}
        </Space>
      ) : (
        <Text type="secondary">请先在流程 1 上传多张图片，或上传精灵图切分后添加到这里。</Text>
      )}
    </Card>
  )
}
