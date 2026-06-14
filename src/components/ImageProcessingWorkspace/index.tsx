import { Space, Typography } from 'antd'

import { ImageCropPanel } from './ImageCropPanel'
import { ImageExportPanel } from './ImageExportPanel'
import { ImageMattePanel } from './ImageMattePanel'
import { ImageUploadPanel } from './ImageUploadPanel'
import { useImageProcessingWorkspace } from './useImageProcessingWorkspace'
import './workspace.css'

const { Text, Title } = Typography

export default function ImageProcessingWorkspace() {
  const workspace = useImageProcessingWorkspace()

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={4} style={{ marginTop: 0 }}>图片处理工作台</Title>
        <Text type="secondary">单张图片上传、色键抠图、裁剪预览并导出 PNG、WebP 或 JPEG。</Text>
      </div>
      <div className="image-processing-grid">
        <div className="image-processing-main">
          <ImageUploadPanel workspace={workspace} />
          <ImageCropPanel workspace={workspace} />
        </div>
        <div className="image-processing-side">
          <ImageMattePanel workspace={workspace} />
          <ImageExportPanel workspace={workspace} />
        </div>
      </div>
    </Space>
  )
}
