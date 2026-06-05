import { Button, Card, InputNumber, Radio, Space, Typography } from 'antd'
import { DownloadOutlined, StarOutlined } from '@ant-design/icons'

import { computeAutoSpriteColumns } from './model'

const { Text } = Typography

export interface ExportPanelProps {
  columns: number
  visibleFrameCount: number
  exporting: boolean
  onColumnsChange: (columns: number) => void
  onExport: () => void
  onCollectToPersonalSpace: () => void
}

export function ExportPanel({
  columns,
  visibleFrameCount,
  exporting,
  onColumnsChange,
  onExport,
  onCollectToPersonalSpace,
}: ExportPanelProps) {
  return (
    <Card title="5. 合并导出">
      <Space direction="vertical" size={12}>
        <Space wrap>
          <Radio.Group
            value="manual"
            options={[{ label: '精灵图列数', value: 'manual' }]}
          />
          <InputNumber min={1} max={128} value={columns} onChange={(value) => onColumnsChange(value ?? 1)} />
          <Button onClick={() => onColumnsChange(computeAutoSpriteColumns(visibleFrameCount))}>自动接近正方形</Button>
          <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={onExport}>
            导出 ZIP
          </Button>
          <Button icon={<StarOutlined />} loading={exporting} onClick={onCollectToPersonalSpace}>
            收藏到个人空间
          </Button>
        </Space>
        <Text type="secondary">
          ZIP 包含 sprite.png 和 index.json。导出与预览均使用平滑绘制。
        </Text>
      </Space>
    </Card>
  )
}
