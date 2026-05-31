import { Typography } from 'antd'
import type { MouseEvent } from 'react'
import type { ContainedImageRect, CropBoxRect, VideoCropHandle } from './types'

const { Text } = Typography

type VideoCropOverlayProps = {
  imageRect: ContainedImageRect
  cropBox: CropBoxRect
  outputSize: { width: number; height: number }
  onStartDrag: (event: MouseEvent<HTMLElement>, handle: VideoCropHandle) => void
}

const cornerHandles = [
  ['tl', 'nwse-resize', '调整左上裁剪'],
  ['tr', 'nesw-resize', '调整右上裁剪'],
  ['bl', 'nesw-resize', '调整左下裁剪'],
  ['br', 'nwse-resize', '调整右下裁剪'],
] as const

export function VideoCropOverlay({ imageRect, cropBox, outputSize, onStartDrag }: VideoCropOverlayProps) {
  const cornerPosition = (handle: VideoCropHandle) => {
    const x = handle.includes('r') ? cropBox.left + cropBox.width : cropBox.left
    const y = handle.includes('b') ? cropBox.top + cropBox.height : cropBox.top
    return { left: x, top: y }
  }

  return (
    <>
      <div
        className="video-crop-layer"
        style={{
          left: imageRect.left,
          top: imageRect.top,
          width: imageRect.width,
          height: imageRect.height,
        }}
      >
        <div className="video-crop-mask" style={{ left: 0, top: 0, width: '100%', height: cropBox.top }} />
        <div
          className="video-crop-mask"
          style={{
            left: 0,
            top: cropBox.top + cropBox.height,
            width: '100%',
            bottom: 0,
          }}
        />
        <div
          className="video-crop-mask"
          style={{
            left: 0,
            top: cropBox.top,
            width: cropBox.left,
            height: cropBox.height,
          }}
        />
        <div
          className="video-crop-mask"
          style={{
            left: cropBox.left + cropBox.width,
            top: cropBox.top,
            right: 0,
            height: cropBox.height,
          }}
        />
        <div
          className="video-crop-selection"
          onMouseDown={(event) => onStartDrag(event, 'move')}
          style={{
            left: cropBox.left,
            top: cropBox.top,
            width: cropBox.width,
            height: cropBox.height,
          }}
        />
        <button
          type="button"
          aria-label="调整上裁剪"
          className="video-crop-edge video-crop-edge-top"
          onMouseDown={(event) => onStartDrag(event, 'top')}
          style={{
            left: cropBox.left,
            top: cropBox.top,
            width: cropBox.width,
          }}
        />
        <button
          type="button"
          aria-label="调整下裁剪"
          className="video-crop-edge video-crop-edge-bottom"
          onMouseDown={(event) => onStartDrag(event, 'bottom')}
          style={{
            left: cropBox.left,
            top: cropBox.top + cropBox.height,
            width: cropBox.width,
          }}
        />
        <button
          type="button"
          aria-label="调整左裁剪"
          className="video-crop-edge video-crop-edge-left"
          onMouseDown={(event) => onStartDrag(event, 'left')}
          style={{
            left: cropBox.left,
            top: cropBox.top,
            height: cropBox.height,
          }}
        />
        <button
          type="button"
          aria-label="调整右裁剪"
          className="video-crop-edge video-crop-edge-right"
          onMouseDown={(event) => onStartDrag(event, 'right')}
          style={{
            left: cropBox.left + cropBox.width,
            top: cropBox.top,
            height: cropBox.height,
          }}
        />
        {cornerHandles.map(([handle, cursor, label]) => (
          <button
            key={handle}
            type="button"
            aria-label={label}
            className="video-crop-corner"
            onMouseDown={(event) => onStartDrag(event, handle)}
            style={{ ...cornerPosition(handle), cursor }}
          />
        ))}
      </div>
      <Text className="video-crop-size" type="secondary">
        裁剪后 {outputSize.width} × {outputSize.height}
      </Text>
    </>
  )
}
