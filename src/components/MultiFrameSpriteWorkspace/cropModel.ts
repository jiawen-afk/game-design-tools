import { clampInt } from './numberUtils'

export interface UniformCrop {
  top: number
  bottom: number
  left: number
  right: number
}

export function clampUniformCrop(crop: UniformCrop, width: number, height: number, minSize = 1): UniformCrop {
  const safeWidth = Math.max(1, clampInt(width, 1, Number.MAX_SAFE_INTEGER))
  const safeHeight = Math.max(1, clampInt(height, 1, Number.MAX_SAFE_INTEGER))
  const safeMinSize = clampInt(minSize, 1, Math.min(safeWidth, safeHeight))
  const maxHorizontalCrop = Math.max(0, safeWidth - safeMinSize)
  const maxVerticalCrop = Math.max(0, safeHeight - safeMinSize)
  const left = clampInt(crop.left, 0, maxHorizontalCrop)
  const right = clampInt(crop.right, 0, maxHorizontalCrop - left)
  const top = clampInt(crop.top, 0, maxVerticalCrop)
  const bottom = clampInt(crop.bottom, 0, maxVerticalCrop - top)

  return { top, bottom, left, right }
}

export function computeUniformCropSize(
  width: number,
  height: number,
  crop: UniformCrop,
  minSize = 1
): { width: number; height: number } {
  const safeWidth = Math.max(1, clampInt(width, 1, Number.MAX_SAFE_INTEGER))
  const safeHeight = Math.max(1, clampInt(height, 1, Number.MAX_SAFE_INTEGER))
  const safeCrop = clampUniformCrop(crop, safeWidth, safeHeight, minSize)

  return {
    width: safeWidth - safeCrop.left - safeCrop.right,
    height: safeHeight - safeCrop.top - safeCrop.bottom,
  }
}
