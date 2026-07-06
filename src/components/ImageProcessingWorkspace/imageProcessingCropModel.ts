import { finiteOr } from './imageProcessingMath'
import type { CropBox, RectSize } from './imageProcessingTypes'
import { MAX_IMAGE_EXPORT_SIZE, MIN_IMAGE_CROP_SIZE } from './imageProcessingTypes'

function normalizeCropLimit(value: number, fallback: number, minimum: number): number {
  const rounded = Math.round(finiteOr(value, fallback))
  return Math.min(MAX_IMAGE_EXPORT_SIZE, Math.max(minimum, rounded))
}

function normalizeCropCoordinate(value: number): number {
  const rounded = Math.round(finiteOr(value, 0))
  return Math.min(MAX_IMAGE_EXPORT_SIZE, Math.max(-MAX_IMAGE_EXPORT_SIZE, rounded))
}

export function clampCropBox(crop: CropBox, imageWidth: number, imageHeight: number, minSize = MIN_IMAGE_CROP_SIZE): CropBox {
  const widthFallback = Math.max(1, Math.round(finiteOr(imageWidth, 1)))
  const heightFallback = Math.max(1, Math.round(finiteOr(imageHeight, 1)))
  const minimum = Math.max(1, Math.min(MAX_IMAGE_EXPORT_SIZE, Math.round(finiteOr(minSize, MIN_IMAGE_CROP_SIZE))))
  const x = normalizeCropCoordinate(crop.x)
  const y = normalizeCropCoordinate(crop.y)
  const width = normalizeCropLimit(crop.width, widthFallback, minimum)
  const height = normalizeCropLimit(crop.height, heightFallback, minimum)
  return { x, y, width, height }
}

export function normalizeCropBox(crop: CropBox, imageWidth: number, imageHeight: number, minSize = MIN_IMAGE_CROP_SIZE): CropBox {
  const x = crop.width < 0 ? crop.x + crop.width : crop.x
  const y = crop.height < 0 ? crop.y + crop.height : crop.y
  return clampCropBox({ x, y, width: Math.abs(crop.width), height: Math.abs(crop.height) }, imageWidth, imageHeight, minSize)
}

export function centerCropBox(crop: CropBox, imageWidth: number, imageHeight: number, minSize = MIN_IMAGE_CROP_SIZE): CropBox {
  const widthLimit = Math.max(1, Math.round(finiteOr(imageWidth, 1)))
  const heightLimit = Math.max(1, Math.round(finiteOr(imageHeight, 1)))
  const minimum = Math.max(1, Math.min(MAX_IMAGE_EXPORT_SIZE, Math.round(finiteOr(minSize, MIN_IMAGE_CROP_SIZE))))
  const width = normalizeCropLimit(Math.abs(finiteOr(crop.width, widthLimit)), widthLimit, minimum)
  const height = normalizeCropLimit(Math.abs(finiteOr(crop.height, heightLimit)), heightLimit, minimum)
  return clampCropBox(
    {
      x: Math.round((widthLimit - width) / 2),
      y: Math.round((heightLimit - height) / 2),
      width,
      height,
    },
    imageWidth,
    imageHeight,
    minSize
  )
}

export function createFullImageCrop(width: number, height: number): CropBox {
  return clampCropBox({ x: 0, y: 0, width, height }, width, height)
}

export function getAspectRatioValue(size: RectSize): number {
  const width = Math.max(1, Math.round(finiteOr(size.width, 1)))
  const height = Math.max(1, Math.round(finiteOr(size.height, 1)))
  return Number((width / height).toFixed(4))
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
  const minimum = Math.max(1, Math.min(MAX_IMAGE_EXPORT_SIZE, Math.round(finiteOr(minSize, MIN_IMAGE_CROP_SIZE))))
  let width = current.width
  let height = width / ratio

  if (height > MAX_IMAGE_EXPORT_SIZE) {
    height = MAX_IMAGE_EXPORT_SIZE
    width = height * ratio
  }
  if (width > MAX_IMAGE_EXPORT_SIZE) {
    width = MAX_IMAGE_EXPORT_SIZE
    height = width / ratio
  }
  if (height < minimum) {
    height = minimum
    width = height * ratio
  }
  if (width < minimum) {
    width = minimum
    height = width / ratio
  }

  return clampCropBox({ ...current, width, height }, imageWidth, imageHeight, minSize)
}
