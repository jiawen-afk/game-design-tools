import { Button, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { ImageUploadPanel } from './ImageUploadPanel'
import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text, Title } = Typography

export interface ImageProcessingToolbarProps {
  workspace: ImageProcessingWorkspaceViewModel
}

export function ImageProcessingToolbar({ workspace }: ImageProcessingToolbarProps) {
  const imageLabel = workspace.draft
    ? `${workspace.draft.width} x ${workspace.draft.height}`
    : '等待上传'

  return (
    <div className="image-processing-toolbar">
      <div className="image-processing-heading">
        <Title level={4}>图片处理工作台</Title>
        <Text type="secondary">上传图片后在右侧取色、缩放、裁剪，并从左侧参数页导出。</Text>
      </div>
      <div className="image-processing-toolbar-actions">
        <Tag color={workspace.processing ? 'processing' : workspace.draft ? 'success' : 'default'}>
          {workspace.processing ? '处理中' : imageLabel}
        </Tag>
        <ImageUploadPanel workspace={workspace} variant="compact" />
        <Button
          icon={<ReloadOutlined />}
          disabled={!workspace.draft}
          onClick={workspace.resetWorkspace}
        >
          重置
        </Button>
      </div>
    </div>
  )
}
