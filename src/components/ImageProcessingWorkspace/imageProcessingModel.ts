export type ImageExportFormat = 'png' | 'webp' | 'jpg' | 'jpeg'

export interface ImageFileLike {
  name: string
  type?: string
}

export interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface RectSize {
  width: number
  height: number
}

export interface ImageSourceLike extends RectSize {
  url: string
}

export type ExportDimension = 'width' | 'height'

export interface PreviewRect extends RectSize {
  x: number
  y: number
}

export type ImageCropHandle = 'top' | 'bottom' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br' | 'move'

export interface RgbaImageData extends RectSize {
  data: Uint8ClampedArray
}

export interface ExportFormatInfo {
  extension: ImageExportFormat
  mimeType: 'image/png' | 'image/webp' | 'image/jpeg'
  preservesAlpha: boolean
}

export const IMAGE_PROCESSING_ACCEPT = ['.webp', '.jpg', '.jpeg', '.png']
export const MIN_IMAGE_CROP_SIZE = 16
export const MIN_IMAGE_EXPORT_SIZE = 1
export const MAX_IMAGE_EXPORT_SIZE = 8192
export const MIN_IMAGE_EXPORT_SCALE = 0.1
export const MAX_IMAGE_EXPORT_SCALE = 16
export const MIN_PREVIEW_ZOOM = 0.1
export const MAX_PREVIEW_ZOOM = 3
export const PREVIEW_ZOOM_STEP = 0.1

const supportedExtensions = new Set(['webp', 'jpg', 'jpeg', 'png'])
const supportedMimeTypes = new Set(['image/webp', 'image/jpeg', 'image/png'])

export function getImageFileExtension(name: string): string {
  const match = /\.([^.]+)$/.exec(name.trim())
  return match ? match[1]!.toLowerCase() : ''
}

export function isSupportedImageFile(file: ImageFileLike): boolean {
  const extension = getImageFileExtension(file.name)
  const mime = (file.type ?? '').toLowerCase()
  return supportedExtensions.has(extension) && (mime === '' || supportedMimeTypes.has(mime))
}

export function getExportFormatInfo(format: ImageExportFormat): ExportFormatInfo {
  if (format === 'webp') return { extension: 'webp', mimeType: 'image/webp', preservesAlpha: true }
  if (format === 'jpg') return { extension: 'jpg', mimeType: 'image/jpeg', preservesAlpha: false }
  if (format === 'jpeg') return { extension: 'jpeg', mimeType: 'image/jpeg', preservesAlpha: false }
  return { extension: 'png', mimeType: 'image/png', preservesAlpha: true }
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

export function clampCropBox(crop: CropBox, imageWidth: number, imageHeight: number, minSize = MIN_IMAGE_CROP_SIZE): CropBox {
  const widthLimit = Math.max(1, Math.round(imageWidth))
  const heightLimit = Math.max(1, Math.round(imageHeight))
  const minimum = Math.max(1, Math.min(minSize, widthLimit, heightLimit))
  const x = Math.max(0, Math.min(widthLimit - minimum, Math.round(finiteOr(crop.x, 0))))
  const y = Math.max(0, Math.min(heightLimit - minimum, Math.round(finiteOr(crop.y, 0))))
  const width = Math.max(minimum, Math.min(widthLimit - x, Math.round(finiteOr(crop.width, widthLimit))))
  const height = Math.max(minimum, Math.min(heightLimit - y, Math.round(finiteOr(crop.height, heightLimit))))
  return { x, y, width, height }
}

export function normalizeCropBox(crop: CropBox, imageWidth: number, imageHeight: number, minSize = MIN_IMAGE_CROP_SIZE): CropBox {
  const x = crop.width < 0 ? crop.x + crop.width : crop.x
  const y = crop.height < 0 ? crop.y + crop.height : crop.y
  return clampCropBox({ x, y, width: Math.abs(crop.width), height: Math.abs(crop.height) }, imageWidth, imageHeight, minSize)
}

export function createFullImageCrop(width: number, height: number): CropBox {
  return clampCropBox({ x: 0, y: 0, width, height }, width, height)
}

export function sanitizeExportBaseName(name: string): string {
  const withoutExtension = name.trim().replace(/\.[^.]+$/, '')
  return (withoutExtension || 'image').replace(/[<>:"/\\|?*]+/g, '_')
}

export function deriveExportFileName(sourceName: string, format: ImageExportFormat): string {
  return `${sanitizeExportBaseName(sourceName)}-processed.${getExportFormatInfo(format).extension}`
}

export function normalizeExportSize(size: RectSize, fallback: RectSize = { width: 1, height: 1 }): RectSize {
  const fallbackWidth = Math.max(MIN_IMAGE_EXPORT_SIZE, Math.round(finiteOr(fallback.width, 1)))
  const fallbackHeight = Math.max(MIN_IMAGE_EXPORT_SIZE, Math.round(finiteOr(fallback.height, 1)))
  const rawWidth = Math.round(finiteOr(size.width, fallbackWidth))
  const rawHeight = Math.round(finiteOr(size.height, fallbackHeight))
  const width = rawWidth > 0 ? rawWidth : fallbackWidth
  const height = rawHeight > 0 ? rawHeight : fallbackHeight
  return {
    width: Math.min(MAX_IMAGE_EXPORT_SIZE, Math.max(MIN_IMAGE_EXPORT_SIZE, width)),
    height: Math.min(MAX_IMAGE_EXPORT_SIZE, Math.max(MIN_IMAGE_EXPORT_SIZE, height)),
  }
}

export function getAspectRatioValue(size: RectSize): number {
  const normalized = normalizeExportSize(size)
  return Number((normalized.width / normalized.height).toFixed(4))
}

export function getCropBoxAfterAspectRatioChange(
  crop: CropBox,
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number,
  minSize = MIN_IMAGE_CROP_SIZE
): CropBox {
  const current = clampCropBox(crop, imageWidth, imageHeight, minSize)
  const ratio = Math.max(0.0001, finiteOr(aspectRatio, getAspectRatioValue(current)))
  const availableWidth = Math.max(1, imageWidth - current.x)
  const availableHeight = Math.max(1, imageHeight - current.y)
  let width = current.width
  let height = width / ratio

  if (height > availableHeight) {
    height = availableHeight
    width = height * ratio
  }
  if (width > availableWidth) {
    width = availableWidth
    height = width / ratio
  }

  return clampCropBox({ ...current, width, height }, imageWidth, imageHeight, minSize)
}

export function normalizeExportScale(scale: number): number {
  const next = finiteOr(scale, 1)
  return Math.min(MAX_IMAGE_EXPORT_SCALE, Math.max(MIN_IMAGE_EXPORT_SCALE, Number(next.toFixed(3))))
}

export function getExportScaleAfterDimensionChange(baseSize: RectSize, dimension: ExportDimension, value: number): number {
  const base = normalizeExportSize(baseSize)
  const normalizedValue = Math.min(
    MAX_IMAGE_EXPORT_SIZE,
    Math.max(MIN_IMAGE_EXPORT_SIZE, Math.round(finiteOr(value, base[dimension])))
  )
  return normalizeExportScale(normalizedValue / Math.max(1, base[dimension]))
}

export function getExportSizeAfterScaleChange(baseSize: RectSize, scale: number): RectSize {
  const base = normalizeExportSize(baseSize)
  const normalizedScale = normalizeExportScale(scale)
  return normalizeExportSize({
    width: base.width * normalizedScale,
    height: base.height * normalizedScale,
  }, base)
}

export function resolveExportBaseSize(crop: RectSize | null, upscaleEnabled: boolean, upscaleSize: RectSize | null): RectSize {
  if (upscaleEnabled && upscaleSize) {
    return normalizeExportSize(upscaleSize, crop ?? upscaleSize)
  }
  return crop ?? { width: 1, height: 1 }
}

export function resolveImageExportTarget(
  activeImageSource: ImageSourceLike | null,
  crop: CropBox | null,
  upscaleEnabled: boolean,
  upscalePreview: ImageSourceLike | null
): { sourceUrl: string; crop: CropBox } | null {
  if (!activeImageSource || !crop) return null
  if (upscaleEnabled && upscalePreview) {
    return {
      sourceUrl: upscalePreview.url,
      crop: { x: 0, y: 0, width: upscalePreview.width, height: upscalePreview.height },
    }
  }
  return { sourceUrl: activeImageSource.url, crop }
}

export function resolveMatteImageSource(
  draft: ImageSourceLike | null,
  processed: ImageSourceLike | null,
  matteEnabled: boolean
): ImageSourceLike | null {
  return matteEnabled ? processed : draft
}

export interface UpscalePreviewInputs {
  crop: CropBox | null
  exportFormat: ImageExportFormat
  processedUrl: string | null
  upscaleOptions: {
    model: string
    scale: number
    tileSize: number
    ttaMode: boolean
  }
}

export function shouldInvalidateUpscalePreview(previous: UpscalePreviewInputs, next: UpscalePreviewInputs): boolean {
  const sameCrop = previous.crop?.x === next.crop?.x
    && previous.crop?.y === next.crop?.y
    && previous.crop?.width === next.crop?.width
    && previous.crop?.height === next.crop?.height
  const sameFormat = previous.exportFormat === next.exportFormat
  const sameProcessed = previous.processedUrl === next.processedUrl
  const sameOptions = previous.upscaleOptions.model === next.upscaleOptions.model
    && previous.upscaleOptions.scale === next.upscaleOptions.scale
    && previous.upscaleOptions.tileSize === next.upscaleOptions.tileSize
    && previous.upscaleOptions.ttaMode === next.upscaleOptions.ttaMode
  return !(sameCrop && sameFormat && sameProcessed && sameOptions)
}

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
  minSize = MIN_IMAGE_CROP_SIZE
): PreviewRect {
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
