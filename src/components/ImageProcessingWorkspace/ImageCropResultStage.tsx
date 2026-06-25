import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import { Empty, Slider, Space, Switch, Typography } from 'antd'
import { EyeOutlined, SelectOutlined } from '@ant-design/icons'

import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'
import { getPreviewAnchorFromStagePoint, MIN_PREVIEW_ZOOM } from './imageProcessingModel'
import { ImageCropSelectionLayer } from './ImageCropSelectionLayer'

const { Text } = Typography

export interface ImageCropResultStageProps {
  workspace: ImageProcessingWorkspaceViewModel
}

type CropHandle = NonNullable<ImageProcessingWorkspaceViewModel['cropDrag']>['handle']

export function ImageCropResultStage({ workspace }: ImageCropResultStageProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const layerRef = useRef<HTMLDivElement | null>(null)
  const [comparePosition, setComparePosition] = useState(50)
  const [dragDepth, setDragDepth] = useState(0)
  const {
    draft,
    handleWheelZoom,
    setCropPreviewContainerSize,
  } = workspace

  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      setCropPreviewContainerSize({ width: rect.width, height: rect.height })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [setCropPreviewContainerSize])

  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (!draft) return
      const stageRect = element.getBoundingClientRect()
      const imageRect = workspace.previewImageRect
      if (!imageRect) {
        handleWheelZoom(event.deltaY)
        return
      }
      handleWheelZoom(event.deltaY, getPreviewAnchorFromStagePoint(
        { x: event.clientX - stageRect.left, y: event.clientY - stageRect.top },
        imageRect
      ))
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [draft, handleWheelZoom, workspace.previewImageRect])

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

  const mapClientToLocal = (clientX: number, clientY: number) => {
    const layer = layerRef.current
    if (!layer || !imageRect) return null
    const rect = layer.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / workspace.previewZoom,
      y: (clientY - rect.top) / workspace.previewZoom,
    }
  }

  const hasDraggedFiles = (event: DragEvent<HTMLDivElement>) => Array.from(event.dataTransfer.types).includes('Files')
  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    setDragDepth((current) => current + 1)
  }
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    setDragDepth((current) => Math.max(0, current - 1))
  }
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    setDragDepth(0)
    const [file] = Array.from(event.dataTransfer.files)
    if (file) void workspace.uploadImage(file)
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
          <Text strong>裁剪与结果</Text>
          <Text type="secondary">{workspace.cropMode ? '裁剪模式' : workspace.matteEnabled ? '取色模式' : '原图预览'}</Text>
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
            <Text strong>拖入图片替换</Text>
            <Text type="secondary">松开后载入 WebP、JPG、JPEG 或 PNG</Text>
          </div>
        ) : null}
        {workspace.upscalePreview ? (
          <div className="image-upscale-compare">
            <div
              className="image-upscale-compare-after"
              style={{ clipPath: `inset(0 0 0 ${comparePosition}%)` }}
            >
              <img src={workspace.upscalePreview.url} alt="高清化结果" />
              <span className="image-upscale-compare-label image-upscale-compare-label-after">处理后</span>
            </div>
            <div
              className="image-upscale-compare-before"
              style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
            >
              <img src={workspace.upscalePreview.originalUrl} alt="普通导出预览" />
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
        {!workspace.upscalePreview && workspace.draft && imageRect ? (
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
