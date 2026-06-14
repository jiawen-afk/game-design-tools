import { Card, Empty, InputNumber, Slider, Space, Typography } from 'antd'

import { normalizeCropBox, type CropBox } from './imageProcessingModel'
import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text } = Typography

export interface ImageCropPanelProps {
  workspace: ImageProcessingWorkspaceViewModel
}

function updateCrop(workspace: ImageProcessingWorkspaceViewModel, patch: Partial<CropBox>) {
  if (!workspace.processed || !workspace.crop) return
  const next = normalizeCropBox({ ...workspace.crop, ...patch }, workspace.processed.width, workspace.processed.height, workspace.minCropSize)
  workspace.setCrop(next)
}

export function ImageCropPanel({ workspace }: ImageCropPanelProps) {
  const preview = workspace.cropPreview
  const processed = workspace.processed
  const crop = workspace.crop

  return (
    <Card title="3. 裁剪与预览">
      {processed && crop ? (
        <Space orientation="vertical" size={14} style={{ width: '100%' }}>
          <div
            className="image-preview-well"
            aria-label="裁剪预览"
            onWheel={(event) => {
              event.preventDefault()
              workspace.handleWheelZoom(event.deltaY)
            }}
          >
            {preview ? (
              <img
                src={preview.url}
                alt="裁剪预览"
                style={{ transform: `scale(${workspace.previewZoom})` }}
              />
            ) : null}
          </div>

          <label className="image-field">
            <span>预览缩放：{workspace.previewZoom.toFixed(2)}x</span>
            <Slider
              min={0.5}
              max={3}
              step={0.1}
              value={workspace.previewZoom}
              onChange={(value) => workspace.setPreviewZoom(value)}
            />
          </label>

          <div className="image-crop-controls">
            <label className="image-field">
              <span>X</span>
              <InputNumber
                min={0}
                max={processed.width}
                value={crop.x}
                onChange={(value) => updateCrop(workspace, { x: value ?? crop.x })}
              />
            </label>
            <label className="image-field">
              <span>Y</span>
              <InputNumber
                min={0}
                max={processed.height}
                value={crop.y}
                onChange={(value) => updateCrop(workspace, { y: value ?? crop.y })}
              />
            </label>
            <label className="image-field">
              <span>宽度</span>
              <InputNumber
                min={workspace.minCropSize}
                max={processed.width}
                value={crop.width}
                onChange={(value) => updateCrop(workspace, { width: value ?? crop.width })}
              />
            </label>
            <label className="image-field">
              <span>高度</span>
              <InputNumber
                min={workspace.minCropSize}
                max={processed.height}
                value={crop.height}
                onChange={(value) => updateCrop(workspace, { height: value ?? crop.height })}
              />
            </label>
          </div>

          <Text type="secondary">
            当前裁剪：{crop.x}, {crop.y}, {crop.width} × {crop.height}
          </Text>
        </Space>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="上传并完成抠图后，这里会显示裁剪预览。" />
      )}
    </Card>
  )
}
