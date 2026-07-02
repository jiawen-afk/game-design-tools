import { useState, type MouseEvent } from 'react'
import { Empty, Slider, Space, Switch, Typography } from 'antd'
import { EyeOutlined, SelectOutlined } from '@ant-design/icons'

import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'
import { MIN_PREVIEW_ZOOM } from './imageProcessingModel'
import { ImageCropSelectionLayer } from './ImageCropSelectionLayer'
import { useImagePreviewStageInteractions } from './useImagePreviewStageInteractions'

const { Text } = Typography

export interface ImageCropResultStageProps {
  workspace: ImageProcessingWorkspaceViewModel
}

type CropHandle = NonNullable<ImageProcessingWorkspaceViewModel['cropDrag']>['handle']

export function ImageCropResultStage({ workspace }: ImageCropResultStageProps) {
  const [comparePosition, setComparePosition] = useState(50)
  const { uploadImages } = workspace
  const {
    boxRef,
    layerRef,
    dragDepth,
    mapClientToLocal,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  } = useImagePreviewStageInteractions({
    draft: workspace.draft,
    previewImageRect: workspace.previewImageRect,
    previewZoom: workspace.previewZoom,
    setCropPreviewContainerSize: workspace.setCropPreviewContainerSize,
    handleWheelZoom: workspace.handleWheelZoom,
    uploadImages,
  })

  const imageRect = workspace.previewImageRect
  const currentCropRect = workspace.activePreviewCropRect
  const localCropRect = currentCropRect && imageRect
    ? {
        x: currentCropRect.x - imageRect.x,
        y: currentCropRect.y - imageRect.y,
        width: currentCropRect.width,
        height: currentCropRect.height,
      }
    : null

  const startCropDrag = (event: MouseEvent<HTMLElement>, handle: CropHandle) => {
    if (!currentCropRect) return
    event.preventDefault()
    event.stopPropagation()
    workspace.setCropDrag({
      handle,
      startPointer: { x: event.clientX, y: event.clientY },
      startPreviewRect: currentCropRect,
    })
  }

  return (
    <div className="image-preview-stage">
      <div className="image-preview-toolbar">
        <Space wrap size={10}>
          <Switch
            checked={workspace.cropMode}
            checkedChildren={<SelectOutlined />}
            unCheckedChildren={<EyeOutlined />}
            onChange={workspace.setCropMode}
          />
          <Text type="secondary">{workspace.cropMode ? '裁剪模式' : workspace.matteEnabled ? '取色模式' : '原图预览'}</Text>
          {workspace.activeUpscalePreview ? (
            <Space size={6}>
              <Text type="secondary">高清化对比</Text>
              <Switch
                size="small"
                checked={workspace.upscaleCompareEnabled}
                onChange={workspace.setUpscaleCompareEnabled}
              />
            </Space>
          ) : null}
        </Space>
        <Space size={10} className="image-preview-zoom">
          <Text>缩放 {workspace.previewZoom.toFixed(2)}x</Text>
          <Slider
            min={MIN_PREVIEW_ZOOM}
            max={3}
            step={0.1}
            value={workspace.previewZoom}
            onChange={(value) => workspace.setPreviewZoom(value)}
          />
        </Space>
      </div>
      <div
        className="image-preview-stage-box"
        ref={boxRef}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {dragDepth > 0 ? (
          <div className="image-preview-drop-overlay">
            <Text strong>拖入图片添加到待处理列表</Text>
            <Text type="secondary">松开后载入 WebP、JPG、JPEG 或 PNG，可一次添加多张</Text>
          </div>
        ) : null}
        {workspace.upscaleCompareEnabled && workspace.activeUpscalePreview ? (
          <div className="image-upscale-compare">
            <div
              className="image-upscale-compare-after"
              style={{ clipPath: `inset(0 0 0 ${comparePosition}%)` }}
            >
              <img src={workspace.activeUpscalePreview.url} alt="高清化结果" />
              <span className="image-upscale-compare-label image-upscale-compare-label-after">处理后</span>
            </div>
            <div
              className="image-upscale-compare-before"
              style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
            >
              <img src={workspace.activeUpscalePreview.originalUrl} alt="普通导出预览" />
              <span className="image-upscale-compare-label image-upscale-compare-label-before">处理前</span>
            </div>
            <div className="image-upscale-compare-line" style={{ left: `${comparePosition}%` }} />
            <input
              aria-label="左右拉动对比高清化结果"
              type="range"
              min={0}
              max={100}
              value={comparePosition}
              onChange={(event) => setComparePosition(Number(event.target.value))}
            />
          </div>
        ) : null}
        {(!workspace.upscaleCompareEnabled || !workspace.activeUpscalePreview) && workspace.draft && imageRect ? (
          <div
            className="image-preview-stage-layer"
            ref={layerRef}
            style={{
              left: imageRect.x,
              top: imageRect.y,
              width: imageRect.width,
              height: imageRect.height,
              transform: `translate(${workspace.previewPan.x}px, ${workspace.previewPan.y}px) scale(${workspace.previewZoom})`,
            }}
          >
            <img
              className="image-preview-stage-image"
              src={workspace.activeImageSource?.url ?? workspace.draft.sourceUrl}
              alt="裁剪与抠图结果"
            />
            {workspace.cropMode && localCropRect ? (
              <ImageCropSelectionLayer
                imageSize={imageRect}
                cropRect={localCropRect}
                onStartDrag={startCropDrag}
              />
            ) : null}
            {!workspace.cropMode && workspace.matteEnabled ? (
              <button
                type="button"
                className="image-preview-pick-layer"
                aria-label="点击原图取色"
                onClick={(event) => {
                  const localPoint = mapClientToLocal(event.clientX, event.clientY)
                  if (!localPoint || !imageRect) return
                  void workspace.pickKeyColorFromSource(
                    localPoint,
                    { x: 0, y: 0, width: imageRect.width, height: imageRect.height }
                  )
                }}
              />
            ) : null}
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="上传图片后在这里查看裁剪结果。" />
        )}
      </div>
    </div>
  )
}
