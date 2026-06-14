import { Card, Descriptions, Empty, Space, Typography, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

import { IMAGE_PROCESSING_ACCEPT } from './imageProcessingModel'
import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Dragger } = Upload
const { Text } = Typography

export interface ImageUploadPanelProps {
  workspace: ImageProcessingWorkspaceViewModel
}

export function ImageUploadPanel({ workspace }: ImageUploadPanelProps) {
  return (
    <Card title="1. 上传图片">
      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
        <Dragger
          accept={IMAGE_PROCESSING_ACCEPT.join(',')}
          multiple={false}
          showUploadList={false}
          beforeUpload={(file) => {
            void workspace.uploadImage(file)
            return false
          }}
        >
          <p className="ant-upload-drag-icon"><UploadOutlined /></p>
          <p className="ant-upload-text">上传单张图片</p>
          <p className="ant-upload-hint">支持 WebP、JPG、JPEG、PNG。新图片会替换当前处理内容。</p>
        </Dragger>

        {workspace.draft ? (
          <Descriptions size="small" column={{ xs: 1, sm: 3 }} bordered>
            <Descriptions.Item label="文件">{workspace.draft.sourceName}</Descriptions.Item>
            <Descriptions.Item label="尺寸">{workspace.draft.width} × {workspace.draft.height}</Descriptions.Item>
            <Descriptions.Item label="状态">{workspace.processing ? '抠图处理中' : '已载入'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有图片。上传后可以开始抠图和裁剪。" />
        )}

        <Text type="secondary">首版使用色键抠图，适合纯色背景、绿幕和边界明确的素材。</Text>
      </Space>
    </Card>
  )
}
