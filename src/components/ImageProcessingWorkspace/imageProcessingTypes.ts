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
