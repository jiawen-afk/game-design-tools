import { chromaKey, loadImage } from '../MultiFrameSpriteWorkspace/imagePipeline'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'
import {
  clampCropBox,
  getExportFormatInfo,
  type CropBox,
  type ImageExportFormat,
} from './imageProcessingModel'

export interface LoadedImageDraft {
  file: File
  sourceName: string
  sourceUrl: string
  width: number
  height: number
}

export interface ProcessedImageDraft {
  url: string
  width: number
  height: number
}

export async function createImageDraft(file: File): Promise<LoadedImageDraft> {
  const sourceUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(sourceUrl)
    return {
      file,
      sourceName: file.name,
      sourceUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
  } catch (error) {
    URL.revokeObjectURL(sourceUrl)
    throw error
  }
}

export async function applyImageMatte(sourceUrl: string, matte: MatteParams): Promise<ProcessedImageDraft> {
  return chromaKey(sourceUrl, matte)
}

export async function renderCroppedImageUrl(sourceUrl: string, crop: CropBox): Promise<ProcessedImageDraft> {
  const img = await loadImage(sourceUrl)
  const safeCrop = clampCropBox(crop, img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = safeCrop.width
  canvas.height = safeCrop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建裁剪预览画布')
  ctx.drawImage(img, safeCrop.x, safeCrop.y, safeCrop.width, safeCrop.height, 0, 0, safeCrop.width, safeCrop.height)
  const blob = await canvasToFormatBlob(canvas, 'png')
  return { url: URL.createObjectURL(blob), width: safeCrop.width, height: safeCrop.height }
}

export async function exportProcessedImage(
  sourceUrl: string,
  crop: CropBox,
  format: ImageExportFormat,
  matteBackground = '#ffffff'
): Promise<Blob> {
  const img = await loadImage(sourceUrl)
  const safeCrop = clampCropBox(crop, img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = safeCrop.width
  canvas.height = safeCrop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建导出画布')
  const formatInfo = getExportFormatInfo(format)
  if (!formatInfo.preservesAlpha) {
    ctx.fillStyle = matteBackground
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, safeCrop.x, safeCrop.y, safeCrop.width, safeCrop.height, 0, 0, safeCrop.width, safeCrop.height)
  return canvasToFormatBlob(canvas, format)
}

function canvasToFormatBlob(canvas: HTMLCanvasElement, format: ImageExportFormat): Promise<Blob> {
  const formatInfo = getExportFormatInfo(format)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) resolve(blob)
      else reject(new Error('图片导出失败'))
    }, formatInfo.mimeType, formatInfo.mimeType === 'image/jpeg' ? 0.92 : undefined)
  })
}
