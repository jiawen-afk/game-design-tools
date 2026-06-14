import { Button, Card, Select, Space, Typography } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'

import { getExportFormatInfo, type ImageExportFormat } from './imageProcessingModel'
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
    <Card title="4. 导出图片">
      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
        <label className="image-field">
          <span>导出格式</span>
          <Select
            value={workspace.exportFormat}
            options={exportOptions}
            onChange={workspace.setExportFormat}
          />
        </label>
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
