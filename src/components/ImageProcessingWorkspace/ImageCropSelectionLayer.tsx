import type { CSSProperties, MouseEvent } from 'react'

import type { ImageCropHandle, PreviewRect, RectSize } from './imageProcessingModel'

export interface ImageCropSelectionLayerProps {
  imageSize: RectSize
  cropRect: PreviewRect
  onStartDrag: (event: MouseEvent<HTMLElement>, handle: ImageCropHandle) => void
}

function handleStyle(left: number, top: number, cursor: CSSProperties['cursor']): CSSProperties {
  return { left, top, cursor }
}

export function ImageCropSelectionLayer({
  imageSize,
  cropRect,
  onStartDrag,
}: ImageCropSelectionLayerProps) {
  return (
    <div className="image-crop-layer">
      <div
        className="image-crop-mask"
        style={{ left: 0, top: 0, width: imageSize.width, height: cropRect.y }}
      />
      <div
        className="image-crop-mask"
        style={{
          left: 0,
          top: cropRect.y + cropRect.height,
          width: imageSize.width,
          height: imageSize.height - cropRect.y - cropRect.height,
        }}
      />
      <div
        className="image-crop-mask"
        style={{
          left: 0,
          top: cropRect.y,
          width: cropRect.x,
          height: cropRect.height,
        }}
      />
      <div
        className="image-crop-mask"
        style={{
          left: cropRect.x + cropRect.width,
          top: cropRect.y,
          width: imageSize.width - cropRect.x - cropRect.width,
          height: cropRect.height,
        }}
      />
      <button
        type="button"
        className="image-crop-selection"
        aria-label="调整裁剪区域"
        style={{
          left: cropRect.x,
          top: cropRect.y,
          width: cropRect.width,
          height: cropRect.height,
        }}
        onMouseDown={(event) => onStartDrag(event, 'move')}
      />
      <button
        type="button"
        aria-label="左上角调整"
        className="image-crop-handle image-crop-handle-corner"
        style={handleStyle(cropRect.x, cropRect.y, 'nwse-resize')}
        onMouseDown={(event) => onStartDrag(event, 'tl')}
      />
      <button
        type="button"
        aria-label="右上角调整"
        className="image-crop-handle image-crop-handle-corner"
        style={handleStyle(cropRect.x + cropRect.width, cropRect.y, 'nesw-resize')}
        onMouseDown={(event) => onStartDrag(event, 'tr')}
      />
      <button
        type="button"
        aria-label="左下角调整"
        className="image-crop-handle image-crop-handle-corner"
        style={handleStyle(cropRect.x, cropRect.y + cropRect.height, 'nesw-resize')}
        onMouseDown={(event) => onStartDrag(event, 'bl')}
      />
      <button
        type="button"
        aria-label="右下角调整"
        className="image-crop-handle image-crop-handle-corner"
        style={handleStyle(cropRect.x + cropRect.width, cropRect.y + cropRect.height, 'nwse-resize')}
        onMouseDown={(event) => onStartDrag(event, 'br')}
      />
      <button
        type="button"
        aria-label="上边调整"
        className="image-crop-handle image-crop-handle-edge image-crop-handle-edge-top"
        style={handleStyle(cropRect.x, cropRect.y, 'ns-resize')}
        onMouseDown={(event) => onStartDrag(event, 'top')}
      />
      <button
        type="button"
        aria-label="下边调整"
        className="image-crop-handle image-crop-handle-edge image-crop-handle-edge-bottom"
        style={handleStyle(cropRect.x, cropRect.y + cropRect.height, 'ns-resize')}
        onMouseDown={(event) => onStartDrag(event, 'bottom')}
      />
      <button
        type="button"
        aria-label="左边调整"
        className="image-crop-handle image-crop-handle-edge image-crop-handle-edge-left"
        style={handleStyle(cropRect.x, cropRect.y, 'ew-resize')}
        onMouseDown={(event) => onStartDrag(event, 'left')}
      />
      <button
        type="button"
        aria-label="右边调整"
        className="image-crop-handle image-crop-handle-edge image-crop-handle-edge-right"
        style={handleStyle(cropRect.x + cropRect.width, cropRect.y, 'ew-resize')}
        onMouseDown={(event) => onStartDrag(event, 'right')}
      />
    </div>
  )
}
