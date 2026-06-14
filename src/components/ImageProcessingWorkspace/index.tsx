import { Space, Typography } from 'antd'

const { Text, Title } = Typography

export default function ImageProcessingWorkspace() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={4} style={{ marginTop: 0 }}>图片处理工作台</Title>
        <Text type="secondary">单张图片上传、色键抠图、裁剪预览并导出 PNG、WebP 或 JPEG。</Text>
      </div>
    </Space>
  )
}
