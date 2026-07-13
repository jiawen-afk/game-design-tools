import { getDesktopApi } from '../../desktopApi'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import {
  getExportSizeAfterScaleChange,
  mapCropBoxToImageSize,
  getImageExportEncodingInfo,
  resolveImageExportBackgroundColor,
  type CropBox,
} from './imageProcessingModel'
import {
  applyImageMatte,
  encodeImageExportBlob,
  exportProcessedImage,
  revokeImageObjectUrl,
  revokeProcessedImageDraftUrl,
  type ProcessedImageDraft,
} from './imageProcessingPipeline'
import type { UpscaleRuntimeStatus } from './imageUpscaleModel'
import type { ImageUpscalePreview } from './useImageUpscaleWorkflow'
import type { ImageProcessingBatchItem } from './useImageSourceWorkspace'

export interface PreparedImageBatchExport {
  sourceUrl: string
  crop: CropBox
  outputSize: { width: number; height: number }
  cleanup: () => void
}

interface PrepareImageBatchExportInput {
  item: ImageProcessingBatchItem
}

interface CreateImageBatchUpscalePreviewInput {
  item: ImageProcessingBatchItem
  prepareBatchExport: (item: ImageProcessingBatchItem) => Promise<PreparedImageBatchExport>
  upscaleRuntimeStatus: UpscaleRuntimeStatus | null
}

interface EncodeImageUpscalePreviewInput {
  desktopApi: ReturnType<typeof getDesktopApi>
  fileName: string
  item: ImageProcessingBatchItem
  preview: ImageUpscalePreview
}

export function revokeBatchUpscalePreview(preview: ImageUpscalePreview | null | undefined) {
  revokeImageObjectUrl(preview?.url)
  revokeImageObjectUrl(preview?.originalUrl)
}

export async function prepareImageBatchExport({
  item,
}: PrepareImageBatchExportInput): Promise<PreparedImageBatchExport> {
  const { settings } = item
  let processed: ProcessedImageDraft | null = null
  const draftSource = { url: item.draft.sourceUrl, width: item.draft.width, height: item.draft.height }
  const source = settings.matteEnabled
    ? (processed = await applyImageMatte(item.draft.sourceUrl, settings.matte, {
        mode: settings.matteMode,
        inputName: item.draft.sourceName,
      }))
    : draftSource
  const mappedCrop = mapCropBoxToImageSize(settings.crop, draftSource, source)
  return {
    sourceUrl: source.url,
    crop: mappedCrop,
    outputSize: getExportSizeAfterScaleChange(mappedCrop, settings.exportScale),
    cleanup: () => revokeProcessedImageDraftUrl(processed),
  }
}

export async function createImageBatchUpscalePreview({
  item,
  prepareBatchExport,
  upscaleRuntimeStatus,
}: CreateImageBatchUpscalePreviewInput): Promise<ImageUpscalePreview> {
  const api = getDesktopApi()
  if (!api) throw new Error('当前不是桌面运行环境，无法执行高清化。')
  if (!upscaleRuntimeStatus?.installed) throw new Error('请先安装高清化运行包。')

  const prepared = await prepareBatchExport(item)
  const exportFormat = getImageExportEncodingInfo(item.settings.exportEncoding).extension
  const exportBackgroundColor = resolveImageExportBackgroundColor(
    item.settings.exportBackground,
    item.settings.exportEncoding,
  )
  const upscaleOptions = item.settings.upscaleOptions
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
  fileName,
  item,
  preview,
}: EncodeImageUpscalePreviewInput) {
  const exportEncoding = item.settings.exportEncoding
  const encodingInfo = getImageExportEncodingInfo(exportEncoding)
  const renderFormat = encodingInfo.requiresDesktopEncoding ? 'png' : encodingInfo.extension
  const exportBackgroundColor = resolveImageExportBackgroundColor(
    item.settings.exportBackground,
    exportEncoding,
  )
  const fullCrop = { x: 0, y: 0, width: preview.width, height: preview.height }
  const outputSize = getExportSizeAfterScaleChange(fullCrop, item.settings.upscaleOutputScale)
  const blob = await exportProcessedImage(preview.url, fullCrop, renderFormat, outputSize, exportBackgroundColor)
  return encodeImageExportBlob(fileName, blob, exportEncoding, desktopApi)
}
