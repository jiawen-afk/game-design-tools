import { getExportFormatInfo } from './imageProcessingFileModel'
import {
  getImageExportEncodingInfo,
  normalizeImageExportEncoding,
  type ImageExportEncodingSettings,
} from './imageExportEncodingModel'
import { finiteOr } from './imageProcessingMath'
import { clampCropBox } from './imageProcessingCropModel'
import type {
  CropBox,
  ExportDimension,
  ImageExportBackgroundSettings,
  ImageExportFormat,
  ImageSourceLike,
  RectSize,
} from './imageProcessingTypes'
import {
  MAX_IMAGE_EXPORT_SCALE,
  MAX_IMAGE_EXPORT_SIZE,
  MIN_IMAGE_EXPORT_SCALE,
  MIN_IMAGE_EXPORT_SIZE,
} from './imageProcessingTypes'

export interface CropDrawPlan {
  crop: CropBox
  targetSize: RectSize
  sourceRect: CropBox | null
  destinationRect: CropBox | null
}

function roundDrawValue(value: number): number {
  return Number(finiteOr(value, 0).toFixed(6))
}

export function sanitizeExportBaseName(name: string): string {
  const withoutExtension = name.trim().replace(/\.[^.]+$/, '')
  return (withoutExtension || 'image').replace(/[<>:"/\\|?*]+/g, '_')
}

export function deriveExportFileName(sourceName: string, format: ImageExportFormat): string {
  return `${sanitizeExportBaseName(sourceName)}-processed.${getExportFormatInfo(format).extension}`
}

export function deriveEncodedExportFileName(sourceName: string, settings: ImageExportEncodingSettings): string {
  return `${sanitizeExportBaseName(sourceName)}-processed.${getImageExportEncodingInfo(settings).extension}`
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

export function normalizeExportBackgroundColor(value: string | null | undefined, fallback = '#000000'): string {
  const normalizedFallback = /^#[0-9a-f]{6}$/i.test(fallback) ? fallback.toLowerCase() : '#000000'
  const color = String(value ?? '').trim()
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const short = color.slice(1).toLowerCase()
    const r = short.charAt(0)
    const g = short.charAt(1)
    const b = short.charAt(2)
    return `#${r}${r}${g}${g}${b}${b}`
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return color.toLowerCase()
  }
  return normalizedFallback
}

export function canUseTransparentImageExportBackground(settings: ImageExportEncodingSettings): boolean {
  return getImageExportEncodingInfo(normalizeImageExportEncoding(settings)).preservesAlpha
}

export function getDefaultImageExportBackground(settings: ImageExportEncodingSettings): ImageExportBackgroundSettings {
  return canUseTransparentImageExportBackground(settings)
    ? { mode: 'transparent', color: '#000000' }
    : { mode: 'color', color: '#000000' }
}

export function normalizeImageExportBackground(
  settings: Partial<ImageExportBackgroundSettings> | null | undefined,
  encoding: ImageExportEncodingSettings
): ImageExportBackgroundSettings {
  const color = normalizeExportBackgroundColor(settings?.color)
  if (!canUseTransparentImageExportBackground(encoding)) {
    return {
      mode: 'color',
      color: settings?.mode === 'color' ? color : '#000000',
    }
  }
  return {
    mode: settings?.mode === 'color' ? 'color' : 'transparent',
    color,
  }
}

export function resolveImageExportBackgroundColor(
  background: ImageExportBackgroundSettings,
  encoding: ImageExportEncodingSettings
): string | null {
  const normalized = normalizeImageExportBackground(background, encoding)
  return normalized.mode === 'transparent' ? null : normalized.color
}

export function resolveCropDrawPlan(
  crop: CropBox,
  sourceSize: RectSize,
  outputSize?: RectSize
): CropDrawPlan {
  const sourceWidth = Math.max(1, Math.round(finiteOr(sourceSize.width, 1)))
  const sourceHeight = Math.max(1, Math.round(finiteOr(sourceSize.height, 1)))
  const safeCrop = clampCropBox(crop, sourceWidth, sourceHeight)
  const targetSize = normalizeExportSize(outputSize ?? safeCrop, safeCrop)
  const sourceLeft = Math.max(0, safeCrop.x)
  const sourceTop = Math.max(0, safeCrop.y)
  const sourceRight = Math.min(sourceWidth, safeCrop.x + safeCrop.width)
  const sourceBottom = Math.min(sourceHeight, safeCrop.y + safeCrop.height)
  const sourceWidthInsideCrop = sourceRight - sourceLeft
  const sourceHeightInsideCrop = sourceBottom - sourceTop

  if (sourceWidthInsideCrop <= 0 || sourceHeightInsideCrop <= 0) {
    return {
      crop: safeCrop,
      targetSize,
      sourceRect: null,
      destinationRect: null,
    }
  }

  const scaleX = targetSize.width / safeCrop.width
  const scaleY = targetSize.height / safeCrop.height
  const sourceRect = {
    x: sourceLeft,
    y: sourceTop,
    width: sourceWidthInsideCrop,
    height: sourceHeightInsideCrop,
  }
  const destinationRect = {
    x: roundDrawValue((sourceLeft - safeCrop.x) * scaleX),
    y: roundDrawValue((sourceTop - safeCrop.y) * scaleY),
    width: roundDrawValue(sourceWidthInsideCrop * scaleX),
    height: roundDrawValue(sourceHeightInsideCrop * scaleY),
  }

  return {
    crop: safeCrop,
    targetSize,
    sourceRect,
    destinationRect,
  }
}
