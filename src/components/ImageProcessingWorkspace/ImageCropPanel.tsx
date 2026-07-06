import { Button, Card, Empty, Slider, Space, Typography } from 'antd'

import { CommittedNumberInput } from './CommittedNumberInput'
import {
  centerCropBox,
  MAX_IMAGE_EXPORT_SIZE,
  MIN_PREVIEW_ZOOM,
  normalizeCropBox,
  type CropBox,
} from './imageProcessingModel'
import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text } = Typography

export interface ImageCropPanelProps {
  workspace: ImageProcessingWorkspaceViewModel
}

function updateCrop(workspace: ImageProcessingWorkspaceViewModel, patch: Partial<CropBox>) {
  if (!workspace.activeImageSource || !workspace.crop) return
  const next = normalizeCropBox({ ...workspace.crop, ...patch }, workspace.activeImageSource.width, workspace.activeImageSource.height, workspace.minCropSize)
  workspace.setCrop(next)
}

export function ImageCropPanel({ workspace }: ImageCropPanelProps) {
  const activeImageSource = workspace.activeImageSource
  const crop = workspace.crop
  const centerCrop = () => {
    if (!activeImageSource || !crop) return
    workspace.setCrop(centerCropBox(crop, activeImageSource.width, activeImageSource.height, workspace.minCropSize))
  }
  const cropPanelTitle = (
    <Space size={8} wrap>
      <span>裁剪调整</span>
      {activeImageSource && crop ? (
        <Button size="small" onClick={centerCrop}>
          裁剪框居中
        </Button>
      ) : null}
    </Space>
  )

  return (
    <Card title={cropPanelTitle} className="image-control-card">
      {activeImageSource && crop ? (
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <label className="image-field">
            <span>预览缩放：{workspace.previewZoom.toFixed(2)}x</span>
            <Slider
              min={MIN_PREVIEW_ZOOM}
              max={3}
              step={0.1}
              value={workspace.previewZoom}
              onChange={(value) => workspace.setPreviewZoom(value)}
            />
          </label>

          <div className="image-crop-controls">
            <label className="image-field">
              <span>X</span>
              <CommittedNumberInput
                min={-MAX_IMAGE_EXPORT_SIZE}
                max={MAX_IMAGE_EXPORT_SIZE}
                value={crop.x}
                onCommit={(value) => updateCrop(workspace, { x: value })}
              />
            </label>
            <label className="image-field">
              <span>Y</span>
              <CommittedNumberInput
                min={-MAX_IMAGE_EXPORT_SIZE}
                max={MAX_IMAGE_EXPORT_SIZE}
                value={crop.y}
                onCommit={(value) => updateCrop(workspace, { y: value })}
              />
            </label>
            <label className="image-field">
              <span>宽度</span>
              <CommittedNumberInput
                min={workspace.minCropSize}
                max={MAX_IMAGE_EXPORT_SIZE}
                value={crop.width}
                onCommit={(value) => updateCrop(workspace, { width: value })}
              />
            </label>
            <label className="image-field">
              <span>高度</span>
              <CommittedNumberInput
                min={workspace.minCropSize}
                max={MAX_IMAGE_EXPORT_SIZE}
                value={crop.height}
                onCommit={(value) => updateCrop(workspace, { height: value })}
              />
            </label>
            <label className="image-field image-crop-ratio-field">
              <span>宽高比</span>
              <CommittedNumberInput
                min={0.0001}
                max={MAX_IMAGE_EXPORT_SIZE}
                step={0.0001}
                precision={4}
                value={workspace.cropAspectRatio}
                onCommit={workspace.updateCropAspectRatio}
              />
            </label>
          </div>

          <Text type="secondary">当前裁剪：{crop.x}, {crop.y}, {crop.width} × {crop.height}，比例 {workspace.cropAspectRatio.toFixed(4)}</Text>
        </Space>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="上传图片后在右侧调整裁剪与结果。" />
      )}
    </Card>
  )
}
