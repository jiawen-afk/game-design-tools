import { Button, Card, Space, Typography } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

import { MatteFrameCard, type MatteFrameCardProps } from './MatteFrameCard'
import type { FrameItem } from './types'

const { Text } = Typography

export interface MatteWorkspacePanelProps {
  frames: FrameItem[]
  activeFrameId: string | null
  onOpenDefaults: () => void
  onRemoveAll: () => void
  onActivate: MatteFrameCardProps['onActivate']
  onRemove: MatteFrameCardProps['onRemove']
  onSampleColor: MatteFrameCardProps['onSampleColor']
  onPreview: MatteFrameCardProps['onPreview']
  onMatteParamChange: MatteFrameCardProps['onMatteParamChange']
  onConfirmApplyToAll: MatteFrameCardProps['onApplyToFollowing']
  onCustomSpillPickerColor: MatteFrameCardProps['onCustomSpillPickerColor']
  onCustomSpillColor: MatteFrameCardProps['onCustomSpillColor']
  applyingToAll: boolean
}

export function MatteWorkspacePanel({
  frames,
  activeFrameId,
  onOpenDefaults,
  onRemoveAll,
  onActivate,
  onRemove,
  onSampleColor,
  onPreview,
  onMatteParamChange,
  onConfirmApplyToAll,
  onCustomSpillPickerColor,
  onCustomSpillColor,
  applyingToAll,
}: MatteWorkspacePanelProps) {
  const firstFrame = frames[0] ?? null

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
      {firstFrame ? (
        <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 16 }}>
          <Text type="secondary">
            仅显示第 1 帧用于调试去背参数。确认后会把当前参数应用到全部 {frames.length} 帧，并开始批量处理。
          </Text>
          <div style={{ maxWidth: 620 }}>
            <MatteFrameCard
              key={firstFrame.id}
              item={firstFrame}
              index={0}
              frameCount={frames.length}
              active={activeFrameId === firstFrame.id}
              onActivate={onActivate}
              onRemove={onRemove}
              onSampleColor={onSampleColor}
              onPreview={onPreview}
              onMatteParamChange={onMatteParamChange}
              onApplyToFollowing={onConfirmApplyToAll}
              onCustomSpillPickerColor={onCustomSpillPickerColor}
              onCustomSpillColor={onCustomSpillColor}
              applyButtonLabel="确定应用到所有帧"
              applyButtonLoading={applyingToAll}
              applyButtonDisabled={applyingToAll || frames.length === 0}
            />
          </div>
        </Space>
      ) : (
        <Text type="secondary">请先在流程 1 上传多张图片，或上传精灵图切分后添加到这里。</Text>
      )}
    </Card>
  )
}
