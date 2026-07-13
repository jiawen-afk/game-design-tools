import { clampCropBox } from './imageProcessingCropModel'
import {
  defaultImageExportEncoding,
  getImageExportEncodingInfo,
  normalizeImageExportEncoding,
  type ImageExportEncodingSettings,
} from './imageExportEncodingModel'
import {
  getDefaultImageExportBackground,
  normalizeExportScale,
  normalizeImageExportBackground,
  sanitizeExportBaseName,
} from './imageProcessingExportModel'
import { finiteOr } from './imageProcessingMath'
import type {
  CropBox,
  ImageExportBackgroundSettings,
  ImageExportFormat,
  RectSize,
} from './imageProcessingTypes'
import { MIN_IMAGE_CROP_SIZE } from './imageProcessingTypes'
import {
  defaultUpscaleOptions,
  normalizeUpscaleOptions,
  type UpscaleOptions,
} from './imageUpscaleModel'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'
import type { MatteMode } from '../MultiFrameSpriteWorkspace/aiMattingService'

export const defaultImageProcessingMatte: MatteParams = {
  keyColor: [0, 255, 0],
  tolerance: 5,
  smoothness: 5,
  spill: 0,
  spillColorMode: 'key',
  customSpillHex: '#00ff00',
  erosion: 5,
}

export interface ImageProcessingBatchSettings {
  matte: MatteParams
  matteEnabled: boolean
  matteMode: MatteMode
  crop: CropBox
  exportEncoding: ImageExportEncodingSettings
  exportBackground: ImageExportBackgroundSettings
  exportScale: number
  upscaleEnabled: boolean
  upscaleOptions: UpscaleOptions
  upscaleOutputScale: number
}

export function cloneImageProcessingBatchSettings(
  settings: ImageProcessingBatchSettings,
): ImageProcessingBatchSettings {
  const exportEncoding = normalizeImageExportEncoding(settings.exportEncoding)
  return {
    matte: {
      ...settings.matte,
      keyColor: [...settings.matte.keyColor] as [number, number, number],
    },
    matteEnabled: settings.matteEnabled,
    matteMode: settings.matteMode,
    crop: { ...settings.crop },
    exportEncoding,
    exportBackground: normalizeImageExportBackground(settings.exportBackground, exportEncoding),
    exportScale: normalizeExportScale(settings.exportScale),
    upscaleEnabled: settings.upscaleEnabled,
    upscaleOptions: normalizeUpscaleOptions(settings.upscaleOptions),
    upscaleOutputScale: normalizeExportScale(settings.upscaleOutputScale ?? 1),
  }
}

export function areImageProcessingBatchSettingsEqual(
  first: ImageProcessingBatchSettings,
  second: ImageProcessingBatchSettings,
): boolean {
  return JSON.stringify(cloneImageProcessingBatchSettings(first))
    === JSON.stringify(cloneImageProcessingBatchSettings(second))
}

export function createDefaultImageProcessingBatchSettings(
  size: RectSize,
): ImageProcessingBatchSettings {
  const exportEncoding = normalizeImageExportEncoding(defaultImageExportEncoding)
  return {
    matte: {
      ...defaultImageProcessingMatte,
      keyColor: [...defaultImageProcessingMatte.keyColor] as [number, number, number],
    },
    matteEnabled: true,
    matteMode: 'chroma',
    crop: {
      x: 0,
      y: 0,
      width: Math.max(1, finiteOr(size.width, 1)),
      height: Math.max(1, finiteOr(size.height, 1)),
    },
    exportEncoding,
    exportBackground: getDefaultImageExportBackground(exportEncoding),
    exportScale: 1,
    upscaleEnabled: false,
    upscaleOptions: normalizeUpscaleOptions(defaultUpscaleOptions),
    upscaleOutputScale: 1,
  }
}

export function mapImageProcessingBatchSettingsToSize(
  settings: ImageProcessingBatchSettings,
  fromSize: RectSize,
  toSize: RectSize,
): ImageProcessingBatchSettings {
  const mapped = cloneImageProcessingBatchSettings(settings)
  mapped.crop = mapCropBoxToImageSize(settings.crop, fromSize, toSize)
  return mapped
}

export interface BatchPreviewSignatureInput {
  crop: CropBox | null
  sourceSize: RectSize | null
  exportFormat: ImageExportFormat
  exportBackgroundColor?: string | null
  exportScale: number
  matte: MatteParams
  matteEnabled: boolean
  matteMode: MatteMode
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
  return deriveBatchExportFileNamesBySettings(sourceNames.map((sourceName) => ({
    sourceName,
    exportEncoding: settings,
  })))
}

export function deriveBatchExportFileNamesBySettings(
  items: Array<{ sourceName: string; exportEncoding: ImageExportEncodingSettings }>,
): string[] {
  const usedNames = new Set<string>()
  return items.map(({ sourceName, exportEncoding }) => {
    const baseName = sanitizeExportBaseName(sourceName)
    const extension = getImageExportEncodingInfo(exportEncoding).extension
    let suffixNumber = 1
    let fileName = `${baseName}-processed.${extension}`
    while (usedNames.has(fileName.toLowerCase())) {
      suffixNumber += 1
      fileName = `${baseName}-${suffixNumber}-processed.${extension}`
    }
    usedNames.add(fileName.toLowerCase())
    return fileName
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

export function createImageProcessingBatchSettingsSignature(
  settings: ImageProcessingBatchSettings,
  sourceSize: RectSize,
): string {
  const normalized = cloneImageProcessingBatchSettings(settings)
  return JSON.stringify({
    matte: normalized.matteEnabled ? normalized.matte : null,
    matteEnabled: normalized.matteEnabled,
    matteMode: normalized.matteEnabled ? normalized.matteMode : null,
    crop: {
      x: ratio(normalized.crop.x, sourceSize.width),
      y: ratio(normalized.crop.y, sourceSize.height),
      width: ratio(normalized.crop.width, sourceSize.width),
      height: ratio(normalized.crop.height, sourceSize.height),
    },
    exportEncoding: normalized.exportEncoding,
    exportBackground: normalized.exportBackground,
    exportScale: normalized.exportScale,
    upscaleEnabled: normalized.upscaleEnabled,
    upscaleOptions: normalized.upscaleOptions,
    upscaleOutputScale: normalized.upscaleOutputScale,
  })
}

export function createBatchPreviewSignature({
  crop,
  sourceSize,
  exportBackgroundColor,
  exportScale,
  matte,
  matteEnabled,
  matteMode,
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
    exportBackgroundColor: exportBackgroundColor ?? null,
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
    matteMode: matteEnabled ? matteMode : null,
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
