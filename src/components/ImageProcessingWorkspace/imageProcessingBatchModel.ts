import { clampCropBox } from './imageProcessingCropModel'
import { getImageExportEncodingInfo, type ImageExportEncodingSettings } from './imageExportEncodingModel'
import { sanitizeExportBaseName } from './imageProcessingExportModel'
import { finiteOr } from './imageProcessingMath'
import type { CropBox, ImageExportFormat, RectSize } from './imageProcessingTypes'
import { MIN_IMAGE_CROP_SIZE } from './imageProcessingTypes'
import type { UpscaleOptions } from './imageUpscaleModel'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'

export interface BatchPreviewSignatureInput {
  crop: CropBox | null
  sourceSize: RectSize | null
  exportFormat: ImageExportFormat
  exportScale: number
  matte: MatteParams
  matteEnabled: boolean
  upscaleOptions: UpscaleOptions
}

export function mapCropBoxToImageSize(
  crop: CropBox,
  fromSize: RectSize,
  toSize: RectSize,
  minSize = MIN_IMAGE_CROP_SIZE,
): CropBox {
  const fromWidth = Math.max(1, finiteOr(fromSize.width, 1))
  const fromHeight = Math.max(1, finiteOr(fromSize.height, 1))
  const toWidth = Math.max(1, finiteOr(toSize.width, 1))
  const toHeight = Math.max(1, finiteOr(toSize.height, 1))
  return clampCropBox({
    x: crop.x / fromWidth * toWidth,
    y: crop.y / fromHeight * toHeight,
    width: crop.width / fromWidth * toWidth,
    height: crop.height / fromHeight * toHeight,
  }, toWidth, toHeight, minSize)
}

export function deriveBatchExportFileNames(
  sourceNames: string[],
  settings: ImageExportEncodingSettings,
): string[] {
  const extension = getImageExportEncodingInfo(settings).extension
  const seen = new Map<string, number>()
  return sourceNames.map((sourceName) => {
    const baseName = sanitizeExportBaseName(sourceName)
    const count = (seen.get(baseName) ?? 0) + 1
    seen.set(baseName, count)
    const suffix = count === 1 ? '' : `-${count}`
    return `${baseName}${suffix}-processed.${extension}`
  })
}

export function deriveBatchExportArchiveName(sourceName: string): string {
  const baseName = sourceName.trim() ? sanitizeExportBaseName(sourceName) : 'images'
  return `${baseName}-processed-images.zip`
}

function rounded(value: number, fallback = 0) {
  return Number(finiteOr(value, fallback).toFixed(6))
}

function ratio(value: number, size: number) {
  return rounded(value / Math.max(1, finiteOr(size, 1)))
}

export function createBatchPreviewSignature({
  crop,
  sourceSize,
  exportFormat,
  exportScale,
  matte,
  matteEnabled,
  upscaleOptions,
}: BatchPreviewSignatureInput): string | null {
  if (!crop || !sourceSize) return null
  return JSON.stringify({
    crop: {
      x: ratio(crop.x, sourceSize.width),
      y: ratio(crop.y, sourceSize.height),
      width: ratio(crop.width, sourceSize.width),
      height: ratio(crop.height, sourceSize.height),
    },
    exportFormat,
    exportScale: rounded(exportScale, 1),
    matte: matteEnabled ? {
      keyColor: matte.keyColor.map((value) => rounded(value)),
      tolerance: rounded(matte.tolerance),
      smoothness: rounded(matte.smoothness),
      spill: rounded(matte.spill),
      spillColorMode: matte.spillColorMode,
      customSpillHex: matte.customSpillHex,
      erosion: rounded(matte.erosion),
    } : null,
    matteEnabled,
    upscaleOptions: {
      model: upscaleOptions.model,
      scale: upscaleOptions.scale,
      tileSize: upscaleOptions.tileSize,
      ttaMode: upscaleOptions.ttaMode,
      gpuId: upscaleOptions.gpuId,
      threadProfile: upscaleOptions.threadProfile,
    },
  })
}
