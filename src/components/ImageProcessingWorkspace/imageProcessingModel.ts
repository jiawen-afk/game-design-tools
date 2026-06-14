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

export interface PreviewRect extends RectSize {
  x: number
  y: number
}

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
export const MIN_PREVIEW_ZOOM = 0.5
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

export function applyWheelZoom(currentZoom: number, deltaY: number): number {
  if (deltaY === 0) return currentZoom
  const direction = deltaY > 0 ? -1 : 1
  const next = finiteOr(currentZoom, 1) + direction * PREVIEW_ZOOM_STEP
  return Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, Number(next.toFixed(2))))
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
