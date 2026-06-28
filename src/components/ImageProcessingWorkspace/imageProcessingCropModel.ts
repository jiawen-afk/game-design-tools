import { finiteOr } from './imageProcessingMath'
import { normalizeExportSize } from './imageProcessingExportModel'
import type { CropBox, RectSize } from './imageProcessingTypes'
import { MIN_IMAGE_CROP_SIZE } from './imageProcessingTypes'

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
