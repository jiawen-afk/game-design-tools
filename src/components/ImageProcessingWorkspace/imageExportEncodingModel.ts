import type { ImageExportFormat } from './imageProcessingTypes'

export type ImageExportEncodingFormat = ImageExportFormat | 'webp-lossless'
export type DesktopImageEncoder = 'cwebp-lossless' | 'oxipng'

export interface ImageExportEncodingSettings {
  format: ImageExportEncodingFormat
  optimizePng: boolean
}

export interface ImageExportEncodingInfo {
  extension: ImageExportFormat
  mimeType: 'image/png' | 'image/webp' | 'image/jpeg'
  preservesAlpha: boolean
  requiresDesktopEncoding: boolean
  desktopEncoder: DesktopImageEncoder | null
}

export const defaultImageExportEncoding: ImageExportEncodingSettings = {
  format: 'webp-lossless',
  optimizePng: false,
}

export function normalizeImageExportEncoding(settings?: Partial<ImageExportEncodingSettings> | null): ImageExportEncodingSettings {
  const format = settings?.format
  return {
    format: format === 'png' || format === 'jpg' || format === 'jpeg' || format === 'webp' || format === 'webp-lossless'
      ? format
      : defaultImageExportEncoding.format,
    optimizePng: settings?.optimizePng === true,
  }
}

export function getImageExportEncodingInfo(settings: ImageExportEncodingSettings): ImageExportEncodingInfo {
  if (settings.format === 'webp-lossless') {
    return {
      extension: 'webp',
      mimeType: 'image/webp',
      preservesAlpha: true,
      requiresDesktopEncoding: true,
      desktopEncoder: 'cwebp-lossless',
    }
  }
  if (settings.format === 'webp') {
    return {
      extension: 'webp',
      mimeType: 'image/webp',
      preservesAlpha: true,
      requiresDesktopEncoding: false,
      desktopEncoder: null,
    }
  }
  if (settings.format === 'png') {
    return {
      extension: 'png',
      mimeType: 'image/png',
      preservesAlpha: true,
      requiresDesktopEncoding: settings.optimizePng,
      desktopEncoder: settings.optimizePng ? 'oxipng' : null,
    }
  }
  if (settings.format === 'jpeg') {
    return {
      extension: 'jpeg',
      mimeType: 'image/jpeg',
      preservesAlpha: false,
      requiresDesktopEncoding: false,
      desktopEncoder: null,
    }
  }
  return {
    extension: 'jpg',
    mimeType: 'image/jpeg',
    preservesAlpha: false,
    requiresDesktopEncoding: false,
    desktopEncoder: null,
  }
}
