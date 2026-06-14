import { Button, Card, InputNumber, Select, Slider, Space, Typography } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'

import {
  getExportFormatInfo,
  MAX_IMAGE_EXPORT_SIZE,
  MAX_IMAGE_EXPORT_SCALE,
  MIN_IMAGE_EXPORT_SIZE,
  MIN_IMAGE_EXPORT_SCALE,
  type ImageExportFormat,
} from './imageProcessingModel'
import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text } = Typography

export interface ImageExportPanelProps {
  workspace: ImageProcessingWorkspaceViewModel
}

const exportFormats = ['png', 'webp', 'jpg', 'jpeg'] as const

export function ImageExportPanel({ workspace }: ImageExportPanelProps) {
  const exportOptions: Array<{ value: ImageExportFormat; label: string }> = exportFormats.map((format) => {
    const info = getExportFormatInfo(format)
    return {
      value: format,
      label: `${info.extension.toUpperCase()} · ${info.mimeType}`,
    }
  })

  return (
    <Card title="导出图片" className="image-control-card">
      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
        <label className="image-field">
          <span>导出格式</span>
          <Select
            value={workspace.exportFormat}
            options={exportOptions}
            onChange={workspace.setExportFormat}
          />
        </label>
        <label className="image-field">
          <span>等比缩放</span>
          <div className="image-export-scale-row">
            <Slider
              min={MIN_IMAGE_EXPORT_SCALE}
              max={MAX_IMAGE_EXPORT_SCALE}
              step={0.05}
              value={workspace.exportScale}
              onChange={workspace.setExportScale}
            />
            <InputNumber
              min={MIN_IMAGE_EXPORT_SCALE}
              max={MAX_IMAGE_EXPORT_SCALE}
              step={0.05}
              precision={2}
              value={workspace.exportScale}
              onChange={(value) => workspace.setExportScale(value ?? workspace.exportScale)}
              addonAfter="x"
            />
          </div>
        </label>
        <Text strong>导出尺寸</Text>
        <div className="image-export-size-grid image-export-size-preview">
          <label className="image-field">
            <span>宽度</span>
            <InputNumber
              min={MIN_IMAGE_EXPORT_SIZE}
              max={MAX_IMAGE_EXPORT_SIZE}
              value={workspace.exportSize.width}
              onChange={(value) => workspace.updateExportDimension('width', value)}
            />
          </label>
          <label className="image-field">
            <span>高度</span>
            <InputNumber
              min={MIN_IMAGE_EXPORT_SIZE}
              max={MAX_IMAGE_EXPORT_SIZE}
              value={workspace.exportSize.height}
              onChange={(value) => workspace.updateExportDimension('height', value)}
            />
          </label>
        </div>
        <Text type="secondary">导出文件名：{workspace.exportName}</Text>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={workspace.exporting}
          disabled={!workspace.canExport}
          onClick={() => void workspace.exportImage()}
        >
          导出当前图片
        </Button>
      </Space>
    </Card>
  )
}
