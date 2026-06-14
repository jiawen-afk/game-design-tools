import { Button, Card, Space, Typography, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

import { IMAGE_PROCESSING_ACCEPT } from './imageProcessingModel'
import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Dragger } = Upload
const { Text } = Typography

export interface ImageUploadPanelProps {
  workspace: ImageProcessingWorkspaceViewModel
  variant?: 'card' | 'compact'
}

export function ImageUploadPanel({ workspace, variant = 'card' }: ImageUploadPanelProps) {
  const uploadProps = {
    accept: IMAGE_PROCESSING_ACCEPT.join(','),
    multiple: false,
    showUploadList: false,
    beforeUpload: (file: File) => {
      void workspace.uploadImage(file)
      return false
    },
  }

  if (variant === 'compact') {
    return (
      <div className="image-upload-compact">
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>{workspace.draft ? '替换图片' : '上传图片'}</Button>
        </Upload>
        {workspace.draft ? (
          <Text type="secondary" className="image-upload-compact-name">
            {workspace.draft.sourceName}
          </Text>
        ) : null}
      </div>
    )
  }

  return (
    <Card title="上传图片" className="image-control-card">
      <Space orientation="vertical" size={10} style={{ width: '100%' }}>
        <Dragger
          className="image-compact-upload"
          {...uploadProps}
        >
          <p className="ant-upload-drag-icon"><UploadOutlined /></p>
          <p className="ant-upload-text">选择或拖入图片</p>
          <p className="ant-upload-hint">WebP、JPG、JPEG、PNG</p>
        </Dragger>

        {workspace.draft ? (
          <div className="image-file-summary">
            <Text strong>{workspace.draft.sourceName}</Text>
            <Text type="secondary">{workspace.draft.width} × {workspace.draft.height} · {workspace.processing ? '抠图处理中' : '已载入'}</Text>
          </div>
        ) : (
          <Text type="secondary">上传后可在右侧预览中取色、缩放和裁剪。</Text>
        )}
      </Space>
    </Card>
  )
}
