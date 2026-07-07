import { getDesktopApi } from '../../desktopApi'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import {
  getExportSizeAfterScaleChange,
  mapCropBoxToImageSize,
  type CropBox,
  type ImageExportEncodingSettings,
  type ImageExportFormat,
  type ImageSourceLike,
} from './imageProcessingModel'
import {
  applyImageMatte,
  encodeImageExportBlob,
  exportProcessedImage,
  revokeImageObjectUrl,
  revokeProcessedImageDraftUrl,
  type ProcessedImageDraft,
} from './imageProcessingPipeline'
import type { UpscaleOptions, UpscaleRuntimeStatus } from './imageUpscaleModel'
import type { ImageUpscalePreview } from './useImageUpscaleWorkflow'
import type { ImageProcessingBatchItem } from './useImageSourceWorkspace'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'

export interface PreparedImageBatchExport {
  sourceUrl: string
  crop: CropBox
  outputSize: { width: number; height: number }
  cleanup: () => void
}

interface PrepareImageBatchExportInput {
  activeImageSource: ImageSourceLike | null
  crop: CropBox | null
  exportScale: number
  item: ImageProcessingBatchItem
  matte: MatteParams
  matteEnabled: boolean
}

interface CreateImageBatchUpscalePreviewInput {
  exportBackgroundColor: string | null
  exportFormat: ImageExportFormat
  item: ImageProcessingBatchItem
  prepareBatchExport: (item: ImageProcessingBatchItem) => Promise<PreparedImageBatchExport>
  upscaleOptions: UpscaleOptions
  upscaleRuntimeStatus: UpscaleRuntimeStatus | null
}

interface EncodeImageUpscalePreviewInput {
  desktopApi: ReturnType<typeof getDesktopApi>
  exportBackgroundColor: string | null
  exportEncoding: ImageExportEncodingSettings
  fileName: string
  preview: ImageUpscalePreview
  renderFormat: ImageExportFormat
}

export function revokeBatchUpscalePreview(preview: ImageUpscalePreview | null | undefined) {
  revokeImageObjectUrl(preview?.url)
  revokeImageObjectUrl(preview?.originalUrl)
}

export async function prepareImageBatchExport({
  activeImageSource,
  crop,
  exportScale,
  item,
  matte,
  matteEnabled,
}: PrepareImageBatchExportInput): Promise<PreparedImageBatchExport> {
  if (!activeImageSource || !crop) throw new Error('请先上传图片并设置裁剪范围。')
  let processed: ProcessedImageDraft | null = null
  const draftSource = { url: item.draft.sourceUrl, width: item.draft.width, height: item.draft.height }
  const source = matteEnabled
    ? (processed = await applyImageMatte(item.draft.sourceUrl, matte))
    : draftSource
  const mappedCrop = mapCropBoxToImageSize(crop, activeImageSource, source)
  return {
    sourceUrl: source.url,
    crop: mappedCrop,
    outputSize: getExportSizeAfterScaleChange(mappedCrop, exportScale),
    cleanup: () => revokeProcessedImageDraftUrl(processed),
  }
}

export async function createImageBatchUpscalePreview({
  exportBackgroundColor,
  exportFormat,
  item,
  prepareBatchExport,
  upscaleOptions,
  upscaleRuntimeStatus,
}: CreateImageBatchUpscalePreviewInput): Promise<ImageUpscalePreview> {
  const api = getDesktopApi()
  if (!api) throw new Error('当前不是桌面运行环境，无法执行高清化。')
  if (!upscaleRuntimeStatus?.installed) throw new Error('请先安装高清化运行包。')

  const prepared = await prepareBatchExport(item)
  try {
    const originalBlob = await exportProcessedImage(prepared.sourceUrl, prepared.crop, exportFormat, prepared.outputSize, exportBackgroundColor)
    let originalUrl: string | null = null
    let upscaledUrl: string | null = null
    try {
      originalUrl = URL.createObjectURL(originalBlob)
      const result = await api.upscaleImage({
        inputName: item.draft.sourceName,
        outputFormat: exportFormat,
        data: await originalBlob.arrayBuffer(),
        options: upscaleOptions,
      })
      const upscaledBlob = blobFromDesktopBinaryData(result.data, originalBlob.type)
      upscaledUrl = URL.createObjectURL(upscaledBlob)
      return {
        originalUrl,
        url: upscaledUrl,
        blob: upscaledBlob,
        width: prepared.outputSize.width * upscaleOptions.scale,
        height: prepared.outputSize.height * upscaleOptions.scale,
      }
    } catch (error) {
      revokeImageObjectUrl(originalUrl)
      revokeImageObjectUrl(upscaledUrl)
      throw error
    }
  } finally {
    prepared.cleanup()
  }
}

export async function encodeImageUpscalePreview({
  desktopApi,
  exportBackgroundColor,
  exportEncoding,
  fileName,
  preview,
  renderFormat,
}: EncodeImageUpscalePreviewInput) {
  const fullCrop = { x: 0, y: 0, width: preview.width, height: preview.height }
  const blob = await exportProcessedImage(preview.url, fullCrop, renderFormat, { width: preview.width, height: preview.height }, exportBackgroundColor)
  return encodeImageExportBlob(fileName, blob, exportEncoding, desktopApi)
}
