import { clampCropBox } from './imageProcessingCropModel'
import { finiteOr } from './imageProcessingMath'
import type { CropBox, ImageCropHandle, Point, PreviewRect, RectSize, RgbaImageData } from './imageProcessingTypes'
import {
  MAX_PREVIEW_ZOOM,
  MIN_IMAGE_CROP_SIZE,
  MIN_PREVIEW_ZOOM,
  PREVIEW_ZOOM_STEP,
} from './imageProcessingTypes'

export function applyWheelZoom(currentZoom: number, deltaY: number): number {
  if (deltaY === 0) return currentZoom
  const direction = deltaY > 0 ? -1 : 1
  const next = finiteOr(currentZoom, 1) + direction * PREVIEW_ZOOM_STEP
  return Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, Number(next.toFixed(2))))
}

export function getAnchoredWheelZoomTransform(
  currentZoom: number,
  currentPan: Point,
  deltaY: number,
  anchorFromCenter: Point
): { zoom: number; pan: Point } {
  const zoom = applyWheelZoom(currentZoom, deltaY)
  if (zoom === currentZoom) return { zoom, pan: currentPan }
  const scaleChange = zoom / Math.max(MIN_PREVIEW_ZOOM, currentZoom)
  return {
    zoom,
    pan: {
      x: Number((anchorFromCenter.x - (anchorFromCenter.x - currentPan.x) * scaleChange).toFixed(4)),
      y: Number((anchorFromCenter.y - (anchorFromCenter.y - currentPan.y) * scaleChange).toFixed(4)),
    },
  }
}

export function getPreviewAnchorFromStagePoint(point: Point, imageRect: PreviewRect): Point {
  return {
    x: point.x - (imageRect.x + imageRect.width / 2),
    y: point.y - (imageRect.y + imageRect.height / 2),
  }
}

export function mapPreviewPointToImagePixel(point: Point, previewRect: PreviewRect, imageSize: RectSize): Point {
  const width = Math.max(1, Math.round(imageSize.width))
  const height = Math.max(1, Math.round(imageSize.height))
  const previewWidth = Math.max(1, previewRect.width)
  const previewHeight = Math.max(1, previewRect.height)
  const relativeX = (point.x - previewRect.x) / previewWidth
  const relativeY = (point.y - previewRect.y) / previewHeight
  return {
    x: Math.min(width - 1, Math.max(0, Math.round(relativeX * width))),
    y: Math.min(height - 1, Math.max(0, Math.round(relativeY * height))),
  }
}

export function sampleImagePixel(imageData: RgbaImageData, point: Point): [number, number, number] {
  const width = Math.max(1, Math.round(imageData.width))
  const height = Math.max(1, Math.round(imageData.height))
  const x = Math.min(width - 1, Math.max(0, Math.round(point.x)))
  const y = Math.min(height - 1, Math.max(0, Math.round(point.y)))
  const index = (y * width + x) * 4
  return [
    imageData.data[index] ?? 0,
    imageData.data[index + 1] ?? 0,
    imageData.data[index + 2] ?? 0,
  ]
}

export function fitContainedImageRect(imageSize: RectSize, containerSize: RectSize): PreviewRect {
  const imageWidth = Math.max(1, imageSize.width)
  const imageHeight = Math.max(1, imageSize.height)
  const containerWidth = Math.max(1, containerSize.width)
  const containerHeight = Math.max(1, containerSize.height)
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  }
}

export function clampPreviewRect(rect: PreviewRect, bounds: RectSize, minSize = MIN_IMAGE_CROP_SIZE): PreviewRect {
  const boundsWidth = Math.max(1, bounds.width)
  const boundsHeight = Math.max(1, bounds.height)
  const minimum = Math.max(1, Math.min(minSize, boundsWidth, boundsHeight))
  const x = Math.max(0, Math.min(boundsWidth - minimum, rect.x))
  const y = Math.max(0, Math.min(boundsHeight - minimum, rect.y))
  return {
    x,
    y,
    width: Math.max(minimum, Math.min(boundsWidth - x, rect.width)),
    height: Math.max(minimum, Math.min(boundsHeight - y, rect.height)),
  }
}

export function getPreviewRectFromCropBox(
  crop: CropBox,
  imageRect: PreviewRect,
  imageSize: RectSize
): PreviewRect {
  const scaleX = imageRect.width / Math.max(1, imageSize.width)
  const scaleY = imageRect.height / Math.max(1, imageSize.height)
  return {
    x: imageRect.x + crop.x * scaleX,
    y: imageRect.y + crop.y * scaleY,
    width: crop.width * scaleX,
    height: crop.height * scaleY,
  }
}

export function getCropBoxFromPreviewRect(
  previewCrop: PreviewRect,
  imageRect: PreviewRect,
  imageSize: RectSize
): CropBox {
  const scaleX = imageSize.width / Math.max(1, imageRect.width)
  const scaleY = imageSize.height / Math.max(1, imageRect.height)
  return clampCropBox(
    {
      x: (previewCrop.x - imageRect.x) * scaleX,
      y: (previewCrop.y - imageRect.y) * scaleY,
      width: previewCrop.width * scaleX,
      height: previewCrop.height * scaleY,
    },
    imageSize.width,
    imageSize.height
  )
}

export function getDraggedPreviewRect(
  startRect: PreviewRect,
  handle: ImageCropHandle,
  dx: number,
  dy: number,
  minSize = MIN_IMAGE_CROP_SIZE,
  keepAspectRatio = false,
  bounds?: RectSize
): PreviewRect {
  if (keepAspectRatio && handle !== 'move') {
    return getAspectLockedDraggedPreviewRect(startRect, handle, dx, dy, minSize, bounds)
  }

  let { x, y, width, height } = startRect
  const minWidth = Math.max(1, minSize)
  const minHeight = Math.max(1, minSize)

  switch (handle) {
    case 'move':
      x += dx
      y += dy
      break
    case 'top':
      y += dy
      height -= dy
      break
    case 'bottom':
      height += dy
      break
    case 'left':
      x += dx
      width -= dx
      break
    case 'right':
      width += dx
      break
    case 'tl':
      x += dx
      y += dy
      width -= dx
      height -= dy
      break
    case 'tr':
      y += dy
      width += dx
      height -= dy
      break
    case 'bl':
      x += dx
      width -= dx
      height += dy
      break
    case 'br':
      width += dx
      height += dy
      break
  }

  if (width < minWidth) {
    if (handle.includes('l')) x += width - minWidth
    width = minWidth
  }
  if (height < minHeight) {
    if (handle.includes('t')) y += height - minHeight
    height = minHeight
  }

  return { x, y, width, height }
}

function getAspectLockedDraggedPreviewRect(
  startRect: PreviewRect,
  handle: Exclude<ImageCropHandle, 'move'>,
  dx: number,
  dy: number,
  minSize: number,
  bounds?: RectSize
): PreviewRect {
  const minWidth = Math.max(1, minSize)
  const minHeight = Math.max(1, minSize)
  const aspectRatio = Math.max(0.0001, startRect.width / Math.max(1, startRect.height))
  const aspectHandle = handle === 'left' || handle === 'top'
    ? 'tl'
    : handle === 'right' || handle === 'bottom'
      ? 'br'
      : handle
  const right = startRect.x + startRect.width
  const bottom = startRect.y + startRect.height

  const sizeFromWidth = (targetWidth: number) => {
    let width = Math.max(minWidth, targetWidth)
    let height = width / aspectRatio
    if (height < minHeight) {
      height = minHeight
      width = height * aspectRatio
    }
    return { width, height }
  }
  const sizeFromHeight = (targetHeight: number) => {
    let height = Math.max(minHeight, targetHeight)
    let width = height * aspectRatio
    if (width < minWidth) {
      width = minWidth
      height = width / aspectRatio
    }
    return { width, height }
  }

  const fitBounds = (size: RectSize) => fitAspectLockedSizeToBounds(size, startRect, aspectHandle, aspectRatio, bounds)

  const targetWidth = aspectHandle.includes('l') ? startRect.width - dx : startRect.width + dx
  const targetHeight = aspectHandle.includes('t') ? startRect.height - dy : startRect.height + dy
  const widthChange = Math.abs(targetWidth - startRect.width) / Math.max(1, startRect.width)
  const heightChange = Math.abs(targetHeight - startRect.height) / Math.max(1, startRect.height)
  const { width, height } = fitBounds(heightChange > widthChange
    ? sizeFromHeight(targetHeight)
    : sizeFromWidth(targetWidth))

  if (aspectHandle === 'tl') return { x: right - width, y: bottom - height, width, height }
  if (aspectHandle === 'tr') return { x: startRect.x, y: bottom - height, width, height }
  if (aspectHandle === 'bl') return { x: right - width, y: startRect.y, width, height }
  return { x: startRect.x, y: startRect.y, width, height }
}

function fitAspectLockedSizeToBounds(
  size: RectSize,
  startRect: PreviewRect,
  handle: Exclude<ImageCropHandle, 'move'>,
  aspectRatio: number,
  bounds?: RectSize
): RectSize {
  if (!bounds) return size

  const boundsWidth = Math.max(1, bounds.width)
  const boundsHeight = Math.max(1, bounds.height)
  const right = startRect.x + startRect.width
  const bottom = startRect.y + startRect.height
  const centerX = startRect.x + startRect.width / 2
  const centerY = startRect.y + startRect.height / 2
  let maxWidth = boundsWidth
  let maxHeight = boundsHeight

  if (handle === 'left') {
    maxWidth = right
    maxHeight = Math.min(centerY, boundsHeight - centerY) * 2
  } else if (handle === 'right') {
    maxWidth = boundsWidth - startRect.x
    maxHeight = Math.min(centerY, boundsHeight - centerY) * 2
  } else if (handle === 'top') {
    maxWidth = Math.min(centerX, boundsWidth - centerX) * 2
    maxHeight = bottom
  } else if (handle === 'bottom') {
    maxWidth = Math.min(centerX, boundsWidth - centerX) * 2
    maxHeight = boundsHeight - startRect.y
  } else {
    maxWidth = handle.includes('l') ? right : boundsWidth - startRect.x
    maxHeight = handle.includes('t') ? bottom : boundsHeight - startRect.y
  }

  const widthLimit = Math.max(1, maxWidth)
  const heightLimit = Math.max(1, maxHeight)
  const boundedWidth = Math.min(size.width, widthLimit, heightLimit * aspectRatio)
  const boundedHeight = boundedWidth / aspectRatio
  if (boundedHeight <= heightLimit) return { width: boundedWidth, height: boundedHeight }

  const height = Math.min(size.height, heightLimit, widthLimit / aspectRatio)
  return { width: height * aspectRatio, height }
}
