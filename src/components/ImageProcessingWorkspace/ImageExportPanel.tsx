import { Button, Card, Progress, Select, Slider, Space, Switch, Typography } from 'antd'
import { DownloadOutlined, ThunderboltOutlined } from '@ant-design/icons'

import { CommittedNumberInput } from './CommittedNumberInput'
import {
  getExportFormatInfo,
  MAX_IMAGE_EXPORT_SIZE,
  MAX_IMAGE_EXPORT_SCALE,
  MIN_IMAGE_EXPORT_SIZE,
  MIN_IMAGE_EXPORT_SCALE,
  type ImageExportFormat,
} from './imageProcessingModel'
import { upscaylModels, type UpscaleModel } from './imageUpscaleModel'
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
  const upscaleInstalled = workspace.upscaleRuntimeStatus?.installed === true
  const upscaleProgress = workspace.upscaleInstallProgress

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
            <CommittedNumberInput
              min={MIN_IMAGE_EXPORT_SCALE}
              max={MAX_IMAGE_EXPORT_SCALE}
              step={0.001}
              precision={3}
              value={workspace.exportScale}
              onCommit={workspace.setExportScale}
            />
            <span className="image-export-scale-unit">x</span>
          </div>
        </label>
        <Text strong>导出尺寸</Text>
        <div className="image-export-size-grid image-export-size-preview">
          <label className="image-field">
            <span>宽度</span>
            <CommittedNumberInput
              min={MIN_IMAGE_EXPORT_SIZE}
              max={MAX_IMAGE_EXPORT_SIZE}
              value={workspace.exportSize.width}
              onCommit={(value) => workspace.updateExportDimension('width', value)}
            />
          </label>
          <label className="image-field">
            <span>高度</span>
            <CommittedNumberInput
              min={MIN_IMAGE_EXPORT_SIZE}
              max={MAX_IMAGE_EXPORT_SIZE}
              value={workspace.exportSize.height}
              onCommit={(value) => workspace.updateExportDimension('height', value)}
            />
          </label>
        </div>
        <Text type="secondary">导出文件名：{workspace.exportName}</Text>
        <div className="image-upscale-panel">
          <div className="image-upscale-heading">
            <Space size={8}>
              <Switch
                checked={workspace.upscaleEnabled}
                onChange={workspace.setUpscaleEnabled}
              />
              <Text strong>高清化</Text>
            </Space>
            <Text type="secondary">{upscaleInstalled ? '运行包已安装' : '未安装时普通导出仍可使用'}</Text>
          </div>
          {workspace.upscaleEnabled ? (
            <Space orientation="vertical" size={10} style={{ width: '100%' }}>
              <Text type="secondary">
                {workspace.upscaleRuntimeStatus?.message ?? '检测 Upscayl 运行包状态。'}
              </Text>
              {!upscaleInstalled ? (
                <>
                  <Button
                    icon={<ThunderboltOutlined />}
                    loading={workspace.upscaleInstalling}
                    onClick={() => void workspace.installUpscaleRuntime()}
                  >
                    安装高清化运行包
                  </Button>
                  {upscaleProgress ? (
                    <Progress
                      percent={upscaleProgress.percent}
                      size="small"
                      status={upscaleProgress.phase === 'error' ? 'exception' : upscaleProgress.phase === 'done' ? 'success' : 'active'}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <label className="image-field">
                    <span>模型</span>
                    <Select
                      value={workspace.upscaleOptions.model}
                      options={upscaylModels.map((model) => ({ value: model, label: model }))}
                      onChange={(model: UpscaleModel) => workspace.updateUpscaleOptions({ model })}
                    />
                  </label>
                  <label className="image-field">
                    <span>高清化倍数：{workspace.upscaleOptions.scale}x</span>
                    <Slider
                      min={2}
                      max={4}
                      step={1}
                      value={workspace.upscaleOptions.scale}
                      onChange={(scale) => workspace.updateUpscaleOptions({ scale })}
                    />
                  </label>
                  <Button
                    icon={<ThunderboltOutlined />}
                    loading={workspace.upscaleProcessing}
                    disabled={!workspace.canExport}
                    onClick={() => void workspace.runUpscalePreview()}
                  >
                    生成高清化预览
                  </Button>
                </>
              )}
            </Space>
          ) : null}
        </div>
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
