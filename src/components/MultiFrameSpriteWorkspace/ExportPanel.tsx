import { Button, Card, Dropdown, InputNumber, Radio, Segmented, Space, Switch, Typography } from 'antd'
import { DownOutlined, DownloadOutlined, StarOutlined } from '@ant-design/icons'

import { computeAutoSpriteColumns } from './model'
import type {
  ImageExportEncodingFormat,
  ImageExportEncodingSettings,
} from '../ImageProcessingWorkspace/imageProcessingModel'

const { Text } = Typography

export interface ExportPanelProps {
  columns: number
  exportEncoding: ImageExportEncodingSettings
  visibleFrameCount: number
  exporting: boolean
  personalSpaceCollectEnabled: boolean
  personalSpaceCollectDisabledReason?: string
  onColumnsChange: (columns: number) => void
  onExportFormatChange: (format: ImageExportEncodingFormat) => void
  onOptimizePngChange: (optimizePng: boolean) => void
  onExport: () => void
  onCollectToPersonalSpace: () => void
  onCollectToPersonalSpaceWithCharacter: () => void
}

export function ExportPanel({
  columns,
  exportEncoding,
  visibleFrameCount,
  exporting,
  personalSpaceCollectEnabled,
  personalSpaceCollectDisabledReason,
  onColumnsChange,
  onExportFormatChange,
  onOptimizePngChange,
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
          <Segmented
            value={exportEncoding.format}
            options={[
              { label: 'WebP 无损', value: 'webp-lossless' },
              { label: 'PNG', value: 'png' },
            ]}
            onChange={(value) => onExportFormatChange(value as ImageExportEncodingFormat)}
          />
          {exportEncoding.format === 'png' ? (
            <Space size={6}>
              <Switch checked={exportEncoding.optimizePng} onChange={onOptimizePngChange} />
              <Text>oxipng</Text>
            </Space>
          ) : null}
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
          ZIP 包含 sprite.webp 或 sprite.png，以及 index.json。导出与预览均使用平滑绘制。
        </Text>
      </Space>
    </Card>
  )
}
