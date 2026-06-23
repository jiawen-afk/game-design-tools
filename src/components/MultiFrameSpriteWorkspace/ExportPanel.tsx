import { Button, Card, Dropdown, InputNumber, Radio, Space, Typography } from 'antd'
import { DownOutlined, DownloadOutlined, StarOutlined } from '@ant-design/icons'

import { computeAutoSpriteColumns } from './model'

const { Text } = Typography

export interface ExportPanelProps {
  columns: number
  visibleFrameCount: number
  exporting: boolean
  personalSpaceCollectEnabled: boolean
  personalSpaceCollectDisabledReason?: string
  onColumnsChange: (columns: number) => void
  onExport: () => void
  onCollectToPersonalSpace: () => void
  onCollectToPersonalSpaceWithCharacter: () => void
}

export function ExportPanel({
  columns,
  visibleFrameCount,
  exporting,
  personalSpaceCollectEnabled,
  personalSpaceCollectDisabledReason,
  onColumnsChange,
  onExport,
  onCollectToPersonalSpace,
  onCollectToPersonalSpaceWithCharacter,
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
          <Space.Compact>
            <Button
              icon={<StarOutlined />}
              loading={exporting}
              disabled={!personalSpaceCollectEnabled}
              title={personalSpaceCollectDisabledReason}
              onClick={onCollectToPersonalSpace}
            >
              收藏到项目空间
            </Button>
            <Dropdown
              menu={{
                items: [
                  { key: 'character', label: '收藏并关联角色', disabled: !personalSpaceCollectEnabled },
                ],
                onClick: () => onCollectToPersonalSpaceWithCharacter(),
              }}
              trigger={['click']}
            >
              <Button
                icon={<DownOutlined />}
                loading={exporting}
                disabled={!personalSpaceCollectEnabled}
                title={personalSpaceCollectDisabledReason}
                aria-label="展开收藏关联方式"
              />
            </Dropdown>
          </Space.Compact>
        </Space>
        <Text type="secondary">
          ZIP 包含 sprite.png 和 index.json。导出与预览均使用平滑绘制。
        </Text>
      </Space>
    </Card>
  )
}
