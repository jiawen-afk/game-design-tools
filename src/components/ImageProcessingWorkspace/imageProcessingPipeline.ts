import { chromaKey, loadImage } from '../MultiFrameSpriteWorkspace/imagePipeline'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'
import {
  getExportFormatInfo,
  getImageExportEncodingInfo,
  resolveCropDrawPlan,
  sampleImagePixel,
  type CropBox,
  type ImageExportEncodingSettings,
  type ImageExportFormat,
  type Point,
  type RectSize,
} from './imageProcessingModel'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import type { GameDesignToolsDesktopApi } from '../../desktopApi'

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

export interface ImageExportSavedFile {
  name: string
  path: string
}

export interface ImageExportSaveApi {
  saveFile: (fileName: string, data: ArrayBuffer) => Promise<ImageExportSavedFile | null>
}

export interface EncodedImageExport {
  fileName: string
  blob: Blob
}

export function revokeImageObjectUrl(url: string | null | undefined) {
  if (url) URL.revokeObjectURL(url)
}

export function revokeLoadedImageDraftUrl(draft: LoadedImageDraft | null | undefined) {
  revokeImageObjectUrl(draft?.sourceUrl)
}

export function revokeProcessedImageDraftUrl(draft: ProcessedImageDraft | null | undefined) {
  revokeImageObjectUrl(draft?.url)
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
    revokeImageObjectUrl(sourceUrl)
    throw error
  }
}

export async function applyImageMatte(sourceUrl: string, matte: MatteParams): Promise<ProcessedImageDraft> {
  return chromaKey(sourceUrl, matte)
}

export async function renderCroppedImageUrl(sourceUrl: string, crop: CropBox): Promise<ProcessedImageDraft> {
  const img = await loadImage(sourceUrl)
  const drawPlan = resolveCropDrawPlan(crop, { width: img.naturalWidth, height: img.naturalHeight })
  const canvas = document.createElement('canvas')
  canvas.width = drawPlan.targetSize.width
  canvas.height = drawPlan.targetSize.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建裁剪预览画布')
  if (drawPlan.sourceRect && drawPlan.destinationRect) {
    ctx.drawImage(
      img,
      drawPlan.sourceRect.x,
      drawPlan.sourceRect.y,
      drawPlan.sourceRect.width,
      drawPlan.sourceRect.height,
      drawPlan.destinationRect.x,
      drawPlan.destinationRect.y,
      drawPlan.destinationRect.width,
      drawPlan.destinationRect.height
    )
  }
  const blob = await canvasToFormatBlob(canvas, 'png')
  return { url: URL.createObjectURL(blob), width: drawPlan.targetSize.width, height: drawPlan.targetSize.height }
}

export async function sampleSourceImagePixel(sourceUrl: string, point: Point): Promise<[number, number, number]> {
  const img = await loadImage(sourceUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建取色画布')
  ctx.drawImage(img, 0, 0)
  return sampleImagePixel(ctx.getImageData(0, 0, canvas.width, canvas.height), point)
}

export async function exportProcessedImage(
  sourceUrl: string,
  crop: CropBox,
  format: ImageExportFormat,
  outputSize?: RectSize,
  backgroundColor: string | null = null
): Promise<Blob> {
  const img = await loadImage(sourceUrl)
  const drawPlan = resolveCropDrawPlan(crop, { width: img.naturalWidth, height: img.naturalHeight }, outputSize)
  const targetWidth = drawPlan.targetSize.width
  const targetHeight = drawPlan.targetSize.height
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建导出画布')
  const formatInfo = getExportFormatInfo(format)
  const fillColor = backgroundColor ?? (formatInfo.preservesAlpha ? null : '#000000')
  if (fillColor) {
    ctx.fillStyle = fillColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  if (drawPlan.sourceRect && drawPlan.destinationRect) {
    ctx.drawImage(
      img,
      drawPlan.sourceRect.x,
      drawPlan.sourceRect.y,
      drawPlan.sourceRect.width,
      drawPlan.sourceRect.height,
      drawPlan.destinationRect.x,
      drawPlan.destinationRect.y,
      drawPlan.destinationRect.width,
      drawPlan.destinationRect.height
    )
  }
  return canvasToFormatBlob(canvas, format)
}

export async function saveImageExportBlob(fileName: string, blob: Blob, api?: ImageExportSaveApi | null) {
  if (api) {
    const saved = await api.saveFile(fileName, await blob.arrayBuffer())
    if (!saved) throw new Error('未选择保存位置')
    return
  }
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
  } finally {
    revokeImageObjectUrl(url)
  }
}

export async function encodeImageExportBlob(
  fileName: string,
  pngBlob: Blob,
  settings: ImageExportEncodingSettings,
  api?: Partial<GameDesignToolsDesktopApi> | null,
): Promise<EncodedImageExport> {
  const encodingInfo = getImageExportEncodingInfo(settings)
  if (!encodingInfo.requiresDesktopEncoding || !encodingInfo.desktopEncoder) {
    return { fileName, blob: pngBlob.type === encodingInfo.mimeType ? pngBlob : new Blob([await pngBlob.arrayBuffer()], { type: encodingInfo.mimeType }) }
  }
  if (!api?.encodeImage) {
    throw new Error('当前桌面版本缺少内置图片编码能力，无法导出该格式。')
  }
  const result = await api.encodeImage({
    inputName: fileName,
    encoder: encodingInfo.desktopEncoder,
    data: await pngBlob.arrayBuffer(),
  })
  return {
    fileName: result.name || fileName,
    blob: blobFromDesktopBinaryData(result.data, result.mimeType),
  }
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
