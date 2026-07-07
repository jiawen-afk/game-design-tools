import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  createBatchPreviewSignature,
  deriveBatchExportArchiveName,
  deriveBatchExportFileNames,
  getImageExportEncodingInfo,
  resolveImageExportTarget,
  type CropBox,
  type ImageExportEncodingSettings,
  type ImageExportFormat,
  type ImageSourceLike,
  type RectSize,
} from './imageProcessingModel'
import {
  encodeImageExportBlob,
  exportProcessedImage,
  saveImageExportBlob,
} from './imageProcessingPipeline'
import {
  createImageBatchUpscalePreview,
  encodeImageUpscalePreview,
  prepareImageBatchExport,
  revokeBatchUpscalePreview,
} from './imageBatchExportWorkflow'
import type { ImageUpscalePreview } from './useImageUpscaleWorkflow'
import type { ImageProcessingBatchItem } from './useImageSourceWorkspace'
import type { UpscaleOptions, UpscaleRuntimeStatus } from './imageUpscaleModel'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'

interface UseImageExportWorkflowOptions {
  activeImageSource: ImageSourceLike | null
  activeBatchImageId: string | null
  batchImages: ImageProcessingBatchItem[]
  crop: CropBox | null
  exportFormat: ImageExportFormat
  exportBackgroundColor: string | null
  exportEncoding: ImageExportEncodingSettings
  exportName: string
  exportSize: RectSize
  exportScale: number
  matte: MatteParams
  matteEnabled: boolean
  upscaleEnabled: boolean
  upscaleOptions: UpscaleOptions
  upscaleRuntimeStatus: UpscaleRuntimeStatus | null
  upscalePreview: ImageUpscalePreview | null
  setUpscaleCompareEnabled: Dispatch<SetStateAction<boolean>>
}

export function useImageExportWorkflow({
  activeImageSource,
  activeBatchImageId,
  batchImages,
  crop,
  exportFormat,
  exportBackgroundColor,
  exportEncoding,
  exportName,
  exportSize,
  exportScale,
  matte,
  matteEnabled,
  upscaleEnabled,
  upscaleOptions,
  upscaleRuntimeStatus,
  upscalePreview,
  setUpscaleCompareEnabled,
}: UseImageExportWorkflowOptions) {
  const [exporting, setExporting] = useState(false)
  const [batchApplying, setBatchApplying] = useState(false)
  const [batchUpscalePreviews, setBatchUpscalePreviews] = useState<Record<string, ImageUpscalePreview>>({})
  const [batchPreviewSignature, setBatchPreviewSignature] = useState<string | null>(null)
  const batchUpscalePreviewsRef = useRef(batchUpscalePreviews)
  batchUpscalePreviewsRef.current = batchUpscalePreviews

  const clearBatchUpscalePreviews = useCallback(() => {
    setBatchUpscalePreviews((previous) => {
      if (Object.keys(previous).length === 0) return previous
      for (const preview of Object.values(previous)) {
        revokeBatchUpscalePreview(preview)
      }
      return {}
    })
    setBatchPreviewSignature(null)
    setUpscaleCompareEnabled(false)
  }, [setUpscaleCompareEnabled])

  useEffect(() => {
    return () => {
      for (const preview of Object.values(batchUpscalePreviewsRef.current)) {
        revokeBatchUpscalePreview(preview)
      }
    }
  }, [])

  const currentBatchPreviewSignature = useMemo(() => createBatchPreviewSignature({
    crop,
    sourceSize: activeImageSource,
    exportFormat,
    exportBackgroundColor,
    exportScale,
    matte,
    matteEnabled,
    upscaleOptions,
  }), [
    activeImageSource?.height,
    activeImageSource?.width,
    crop,
    exportBackgroundColor,
    exportFormat,
    exportScale,
    matte,
    matteEnabled,
    upscaleOptions,
  ])

  useEffect(() => {
    if (!batchPreviewSignature) return
    if (batchPreviewSignature === currentBatchPreviewSignature) return
    clearBatchUpscalePreviews()
  }, [batchPreviewSignature, clearBatchUpscalePreviews, currentBatchPreviewSignature])

  const activeBatchUpscalePreview = upscaleEnabled && activeBatchImageId ? batchUpscalePreviews[activeBatchImageId] ?? null : null

  const prepareBatchExport = useCallback((item: ImageProcessingBatchItem) => {
    return prepareImageBatchExport({
      activeImageSource,
      crop,
      exportScale,
      item,
      matte,
      matteEnabled,
    })
  }, [activeImageSource, crop, exportScale, matte, matteEnabled])

  const createUpscalePreviewForItem = useCallback(async (item: ImageProcessingBatchItem): Promise<ImageUpscalePreview> => {
    return createImageBatchUpscalePreview({
      exportBackgroundColor,
      exportFormat,
      item,
      prepareBatchExport,
      upscaleOptions,
      upscaleRuntimeStatus,
    })
  }, [exportBackgroundColor, exportFormat, prepareBatchExport, upscaleOptions, upscaleRuntimeStatus])

  const encodeUpscalePreview = useCallback(async (
    preview: ImageUpscalePreview,
    fileName: string,
    renderFormat: ImageExportFormat,
    desktopApi: ReturnType<typeof getDesktopApi>,
  ) => {
    return encodeImageUpscalePreview({
      desktopApi,
      exportBackgroundColor,
      exportEncoding,
      fileName,
      preview,
      renderFormat,
    })
  }, [exportBackgroundColor, exportEncoding])

  const exportImage = useCallback(async () => {
    const exportTarget = resolveImageExportTarget(activeImageSource, crop, upscaleEnabled, upscalePreview)
    if (!exportTarget) return
    setExporting(true)
    try {
      const encodingInfo = getImageExportEncodingInfo(exportEncoding)
      const renderFormat = encodingInfo.requiresDesktopEncoding ? 'png' : exportFormat
      const exportBlob = await exportProcessedImage(exportTarget.sourceUrl, exportTarget.crop, renderFormat, exportSize, exportBackgroundColor)
      const desktopApi = getDesktopApi()
      const encoded = await encodeImageExportBlob(exportName, exportBlob, exportEncoding, desktopApi)
      await saveImageExportBlob(encoded.fileName, encoded.blob, desktopApi)
      message.success('图片已导出')
    } catch (error) {
      message.error(`导出失败：${String(error)}`)
    } finally {
      setExporting(false)
    }
  }, [activeImageSource, crop, exportBackgroundColor, exportEncoding, exportFormat, exportName, exportSize, upscaleEnabled, upscalePreview])

  const applyAllPreviews = useCallback(async () => {
    if (!activeImageSource || !crop || batchImages.length === 0) return
    setBatchApplying(true)
    const nextPreviews: Record<string, ImageUpscalePreview> = {}
    try {
      if (!upscaleEnabled) {
        message.success(`已将参数应用到 ${batchImages.length} 张图片`)
        return
      }
      for (const item of batchImages) {
        nextPreviews[item.id] = await createUpscalePreviewForItem(item)
      }
      setBatchUpscalePreviews((previous) => {
        for (const preview of Object.values(previous)) {
          revokeBatchUpscalePreview(preview)
        }
        return nextPreviews
      })
      setBatchPreviewSignature(currentBatchPreviewSignature)
      setUpscaleCompareEnabled(true)
      message.success(`已生成 ${batchImages.length} 张高清化预览`)
    } catch (error) {
      for (const preview of Object.values(nextPreviews)) {
        revokeBatchUpscalePreview(preview)
      }
      message.error(`全部应用预览失败：${String(error)}`)
    } finally {
      setBatchApplying(false)
    }
  }, [activeImageSource, batchImages, createUpscalePreviewForItem, crop, currentBatchPreviewSignature, setUpscaleCompareEnabled, upscaleEnabled])

  const exportAllImages = useCallback(async () => {
    if (!activeImageSource || !crop) return
    if (batchImages.length === 0) {
      await exportImage()
      return
    }
    const targets = batchImages
    setExporting(true)
    const generatedPreviews: ImageUpscalePreview[] = []
    try {
      const desktopApi = getDesktopApi()
      const encodingInfo = getImageExportEncodingInfo(exportEncoding)
      const renderFormat = encodingInfo.requiresDesktopEncoding ? 'png' : exportFormat
      const fileNames = deriveBatchExportFileNames(targets.map((item) => item.draft.sourceName), exportEncoding)
      const encodedFiles = []
      for (const [index, item] of targets.entries()) {
        const batchPreview = item.id === activeBatchImageId
          ? upscalePreview ?? batchUpscalePreviewsRef.current[item.id]
          : batchUpscalePreviewsRef.current[item.id]
        if (upscaleEnabled) {
          const preview = batchPreview ?? await createUpscalePreviewForItem(item)
          if (!batchPreview) generatedPreviews.push(preview)
          encodedFiles.push(await encodeUpscalePreview(preview, fileNames[index]!, renderFormat, desktopApi))
          continue
        }
        const prepared = await prepareBatchExport(item)
        try {
          const blob = await exportProcessedImage(prepared.sourceUrl, prepared.crop, renderFormat, prepared.outputSize, exportBackgroundColor)
          encodedFiles.push(await encodeImageExportBlob(fileNames[index]!, blob, exportEncoding, desktopApi))
        } finally {
          prepared.cleanup()
        }
      }

      if (encodedFiles.length === 1) {
        const [encoded] = encodedFiles
        await saveImageExportBlob(encoded!.fileName, encoded!.blob, desktopApi)
        message.success('图片已导出')
        return
      }

      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      for (const encoded of encodedFiles) {
        zip.file(encoded.fileName, encoded.blob)
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      await saveImageExportBlob(deriveBatchExportArchiveName(targets[0]?.draft.sourceName ?? ''), zipBlob, desktopApi)
      message.success(`已导出 ${encodedFiles.length} 张图片`)
    } catch (error) {
      message.error(`导出失败：${String(error)}`)
    } finally {
      for (const preview of generatedPreviews) {
        revokeBatchUpscalePreview(preview)
      }
      setExporting(false)
    }
  }, [
    activeBatchImageId,
    activeImageSource,
    batchImages,
    crop,
    createUpscalePreviewForItem,
    encodeUpscalePreview,
    exportBackgroundColor,
    exportEncoding,
    exportFormat,
    exportImage,
    exportName,
    prepareBatchExport,
    upscaleEnabled,
    upscalePreview,
  ])

  return {
    exporting,
    batchApplying,
    batchUpscalePreview: activeBatchUpscalePreview,
    applyAllPreviews,
    exportImage,
    exportAllImages,
  }
}
