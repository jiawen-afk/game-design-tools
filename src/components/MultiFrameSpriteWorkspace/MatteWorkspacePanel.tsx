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
  onApplyToFollowing: MatteFrameCardProps['onApplyToFollowing']
  onCustomSpillPickerColor: MatteFrameCardProps['onCustomSpillPickerColor']
  onCustomSpillColor: MatteFrameCardProps['onCustomSpillColor']
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
  onApplyToFollowing,
  onCustomSpillPickerColor,
  onCustomSpillColor,
}: MatteWorkspacePanelProps) {
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
      {frames.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
          {frames.map((item, index) => (
            <MatteFrameCard
              key={item.id}
              item={item}
              index={index}
              frameCount={frames.length}
              active={activeFrameId === item.id}
              onActivate={onActivate}
              onRemove={onRemove}
              onSampleColor={onSampleColor}
              onPreview={onPreview}
              onMatteParamChange={onMatteParamChange}
              onApplyToFollowing={onApplyToFollowing}
              onCustomSpillPickerColor={onCustomSpillPickerColor}
              onCustomSpillColor={onCustomSpillColor}
            />
          ))}
        </div>
      ) : (
        <Text type="secondary">请先在流程 1 上传多张图片，或上传精灵图切分后添加到这里。</Text>
      )}
    </Card>
  )
}
