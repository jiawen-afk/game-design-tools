import { getExportFormatInfo } from './imageProcessingFileModel'
import { getImageExportEncodingInfo, type ImageExportEncodingSettings } from './imageExportEncodingModel'
import { finiteOr } from './imageProcessingMath'
import type { CropBox, ExportDimension, ImageExportFormat, ImageSourceLike, RectSize } from './imageProcessingTypes'
import {
  MAX_IMAGE_EXPORT_SCALE,
  MAX_IMAGE_EXPORT_SIZE,
  MIN_IMAGE_EXPORT_SCALE,
  MIN_IMAGE_EXPORT_SIZE,
} from './imageProcessingTypes'

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
