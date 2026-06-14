import { useEffect, useRef, type MouseEvent } from 'react'
import { Empty, Slider, Space, Switch, Typography } from 'antd'
import { EyeOutlined, SelectOutlined } from '@ant-design/icons'

import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text } = Typography

export interface ImagePreviewStageProps {
  workspace: ImageProcessingWorkspaceViewModel
}

type CropHandle = NonNullable<ImageProcessingWorkspaceViewModel['cropDrag']>['handle']

export function ImagePreviewStage({ workspace }: ImagePreviewStageProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const layerRef = useRef<HTMLDivElement | null>(null)
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
      handleWheelZoom(event.deltaY)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [draft, handleWheelZoom])

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

  const handleStyle = (left: number, top: number, cursor: string) => ({
    left,
    top,
    cursor,
  })

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
          <Text>裁剪范围</Text>
          <Text type="secondary">{workspace.cropMode ? '裁剪模式' : '取色模式'}</Text>
        </Space>
        <Space size={10} className="image-preview-zoom">
          <Text>缩放 {workspace.previewZoom.toFixed(2)}x</Text>
          <Slider
            min={0.5}
            max={3}
            step={0.1}
            value={workspace.previewZoom}
            onChange={(value) => workspace.setPreviewZoom(value)}
          />
        </Space>
      </div>
      <div className="image-preview-stage-box" ref={boxRef}>
        {workspace.draft && imageRect ? (
          <div
            className="image-preview-stage-layer"
            ref={layerRef}
            style={{
              left: imageRect.x,
              top: imageRect.y,
              width: imageRect.width,
              height: imageRect.height,
              transform: `scale(${workspace.previewZoom})`,
            }}
          >
            <img className="image-preview-stage-image" src={workspace.draft.sourceUrl} alt="图片预览" />
            {workspace.cropMode && localCropRect ? (
              <div className="image-crop-layer">
                <div
                  className="image-crop-mask"
                  style={{ left: 0, top: 0, width: imageRect.width, height: localCropRect.y }}
                />
                <div
                  className="image-crop-mask"
                  style={{
                    left: 0,
                    top: localCropRect.y + localCropRect.height,
                    width: imageRect.width,
                    height: imageRect.height - localCropRect.y - localCropRect.height,
                  }}
                />
                <div
                  className="image-crop-mask"
                  style={{
                    left: 0,
                    top: localCropRect.y,
                    width: localCropRect.x,
                    height: localCropRect.height,
                  }}
                />
                <div
                  className="image-crop-mask"
                  style={{
                    left: localCropRect.x + localCropRect.width,
                    top: localCropRect.y,
                    width: imageRect.width - localCropRect.x - localCropRect.width,
                    height: localCropRect.height,
                  }}
                />
                <button
                  type="button"
                  className="image-crop-selection"
                  aria-label="调整裁剪区域"
                  style={{
                    left: localCropRect.x,
                    top: localCropRect.y,
                    width: localCropRect.width,
                    height: localCropRect.height,
                  }}
                  onMouseDown={(event) => startCropDrag(event, 'move')}
                />
                <button
                  type="button"
                  aria-label="左上角调整"
                  className="image-crop-handle image-crop-handle-corner"
                  style={{ left: localCropRect.x, top: localCropRect.y, cursor: 'nwse-resize' }}
                  onMouseDown={(event) => startCropDrag(event, 'tl')}
                />
                <button
                  type="button"
                  aria-label="右上角调整"
                  className="image-crop-handle image-crop-handle-corner"
                  style={{ left: localCropRect.x + localCropRect.width, top: localCropRect.y, cursor: 'nesw-resize' }}
                  onMouseDown={(event) => startCropDrag(event, 'tr')}
                />
                <button
                  type="button"
                  aria-label="左下角调整"
                  className="image-crop-handle image-crop-handle-corner"
                  style={{ left: localCropRect.x, top: localCropRect.y + localCropRect.height, cursor: 'nesw-resize' }}
                  onMouseDown={(event) => startCropDrag(event, 'bl')}
                />
                <button
                  type="button"
                  aria-label="右下角调整"
                  className="image-crop-handle image-crop-handle-corner"
                  style={{ left: localCropRect.x + localCropRect.width, top: localCropRect.y + localCropRect.height, cursor: 'nwse-resize' }}
                  onMouseDown={(event) => startCropDrag(event, 'br')}
                />
                <button
                  type="button"
                  aria-label="上边调整"
                  className="image-crop-handle image-crop-handle-edge image-crop-handle-edge-top"
                  style={handleStyle(localCropRect.x, localCropRect.y, 'ns-resize')}
                  onMouseDown={(event) => startCropDrag(event, 'top')}
                />
                <button
                  type="button"
                  aria-label="下边调整"
                  className="image-crop-handle image-crop-handle-edge image-crop-handle-edge-bottom"
                  style={handleStyle(localCropRect.x, localCropRect.y + localCropRect.height, 'ns-resize')}
                  onMouseDown={(event) => startCropDrag(event, 'bottom')}
                />
                <button
                  type="button"
                  aria-label="左边调整"
                  className="image-crop-handle image-crop-handle-edge image-crop-handle-edge-left"
                  style={handleStyle(localCropRect.x, localCropRect.y, 'ew-resize')}
                  onMouseDown={(event) => startCropDrag(event, 'left')}
                />
                <button
                  type="button"
                  aria-label="右边调整"
                  className="image-crop-handle image-crop-handle-edge image-crop-handle-edge-right"
                  style={handleStyle(localCropRect.x + localCropRect.width, localCropRect.y, 'ew-resize')}
                  onMouseDown={(event) => startCropDrag(event, 'right')}
                />
              </div>
            ) : null}
            {!workspace.cropMode ? (
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
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="上传图片后在这里预览、取色和裁剪。" />
        )}
      </div>
    </div>
  )
}
