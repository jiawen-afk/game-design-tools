import { Button, Card, InputNumber, Select, Space, Switch, Typography } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'

import {
  getExportFormatInfo,
  MAX_IMAGE_EXPORT_SIZE,
  MIN_IMAGE_EXPORT_SIZE,
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
        <div className="image-export-size-toolbar">
          <Text strong>导出尺寸</Text>
          <Space size={8}>
            <Switch
              checked={workspace.exportAspectLocked}
              onChange={workspace.setExportAspectLocked}
            />
            <Text>锁定比例</Text>
          </Space>
        </div>
        <div className="image-export-size-grid">
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
          <label className="image-field image-export-ratio-field">
            <span>宽高比</span>
            <InputNumber
              min={0.0001}
              max={MAX_IMAGE_EXPORT_SIZE}
              step={0.0001}
              precision={4}
              value={workspace.exportAspectRatio}
              onChange={workspace.updateExportAspectRatio}
            />
          </label>
          <Button
            icon={<ReloadOutlined />}
            onClick={workspace.resetExportSizeToCrop}
            disabled={!workspace.crop}
          >
            匹配裁剪
          </Button>
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
