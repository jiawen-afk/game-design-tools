import { Typography } from 'antd'

const { Paragraph, Title } = Typography

export default function VideoProcessingWorkspace() {
  return (
    <section aria-labelledby="video-processing-title">
      <Title id="video-processing-title" level={2}>视频处理工作台</Title>
      <Paragraph>批量调整视频分辨率、执行 GPU 超分，并导出 Godot 4.6 可用的 OGV 视频。</Paragraph>
    </section>
  )
}
