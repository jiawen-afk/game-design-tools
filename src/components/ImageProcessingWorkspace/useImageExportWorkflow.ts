import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  createImageProcessingBatchSettingsSignature,
  deriveBatchExportArchiveName,
  deriveBatchExportFileNamesBySettings,
  getImageExportEncodingInfo,
  resolveImageExportBackgroundColor,
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
  createImageBatchUpscalePreviews,
  encodeImageUpscalePreview,
  prepareImageBatchExport,
  revokeBatchUpscalePreview,
} from './imageBatchExportWorkflow'
import type { ImageUpscalePreview } from './useImageUpscaleWorkflow'
import type { ImageProcessingBatchItem } from './useImageSourceWorkspace'
import type { UpscaleRuntimeStatus } from './imageUpscaleModel'

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
  upscaleEnabled: boolean
  upscaleRuntimeStatus: UpscaleRuntimeStatus | null
  upscalePreview: ImageUpscalePreview | null
  setUpscaleCompareEnabled: Dispatch<SetStateAction<boolean>>
}

interface BatchUpscalePreviewEntry {
  preview: ImageUpscalePreview
  signature: string
}

type BatchUpscalePreviewMap = Record<string, BatchUpscalePreviewEntry>

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
  upscaleEnabled,
  upscaleRuntimeStatus,
  upscalePreview,
  setUpscaleCompareEnabled,
}: UseImageExportWorkflowOptions) {
  const [exporting, setExporting] = useState(false)
  const [batchApplying, setBatchApplying] = useState(false)
  const [batchUpscalePreviews, setBatchUpscalePreviews] = useState<BatchUpscalePreviewMap>({})
  const batchUpscalePreviewsRef = useRef(batchUpscalePreviews)
  const batchImagesRef = useRef(batchImages)
  const batchApplyOperationIdRef = useRef(0)
  const pendingBatchUpscalePreviewsRef = useRef<BatchUpscalePreviewMap>({})
  batchUpscalePreviewsRef.current = batchUpscalePreviews
  batchImagesRef.current = batchImages

  const cancelPendingBatchPreviews = useCallback(() => {
    batchApplyOperationIdRef.current += 1
    for (const entry of Object.values(pendingBatchUpscalePreviewsRef.current)) {
      revokeBatchUpscalePreview(entry.preview)
    }
    pendingBatchUpscalePreviewsRef.current = {}
    setBatchApplying(false)
  }, [])

  const clearBatchUpscalePreviews = useCallback(() => {
    cancelPendingBatchPreviews()
    for (const entry of Object.values(batchUpscalePreviewsRef.current)) {
      revokeBatchUpscalePreview(entry.preview)
    }
    batchUpscalePreviewsRef.current = {}
    setBatchUpscalePreviews({})
    setUpscaleCompareEnabled(false)
  }, [cancelPendingBatchPreviews, setUpscaleCompareEnabled])

  useEffect(() => {
    return () => {
      batchApplyOperationIdRef.current += 1
      for (const entry of Object.values(batchUpscalePreviewsRef.current)) {
        revokeBatchUpscalePreview(entry.preview)
      }
      for (const entry of Object.values(pendingBatchUpscalePreviewsRef.current)) {
        revokeBatchUpscalePreview(entry.preview)
      }
      pendingBatchUpscalePreviewsRef.current = {}
    }
  }, [])

  useEffect(() => {
    setBatchUpscalePreviews((previous) => {
      let changed = false
      const next = { ...previous }
      const itemById = new Map(batchImages.map((item) => [item.id, item]))
      for (const [id, entry] of Object.entries(previous)) {
        const item = itemById.get(id)
        const signature = item
          ? createImageProcessingBatchSettingsSignature(item.settings, item.draft)
          : null
        if (signature === entry.signature) continue
        revokeBatchUpscalePreview(entry.preview)
        delete next[id]
        changed = true
      }
      if (changed) batchUpscalePreviewsRef.current = next
      return changed ? next : previous
    })
  }, [batchImages])

  const activeBatchItem = activeBatchImageId
    ? batchImages.find((item) => item.id === activeBatchImageId) ?? null
    : null
  const activeBatchEntry = activeBatchItem ? batchUpscalePreviews[activeBatchItem.id] : null
  const activeBatchUpscalePreview = activeBatchItem?.settings.upscaleEnabled
    && activeBatchEntry?.signature === createImageProcessingBatchSettingsSignature(activeBatchItem.settings, activeBatchItem.draft)
    ? activeBatchEntry.preview
    : null

  const prepareBatchExport = useCallback((item: ImageProcessingBatchItem) => {
    return prepareImageBatchExport({ item })
  }, [])

  const createUpscalePreviewsForItems = useCallback(async (items: ImageProcessingBatchItem[]) => {
    return createImageBatchUpscalePreviews({
      items,
      prepareBatchExport,
      upscaleRuntimeStatus,
    })
  }, [prepareBatchExport, upscaleRuntimeStatus])

  const encodeUpscalePreview = useCallback(async (
    preview: ImageUpscalePreview,
    fileName: string,
    item: ImageProcessingBatchItem,
    desktopApi: ReturnType<typeof getDesktopApi>,
  ) => {
    return encodeImageUpscalePreview({
      desktopApi,
      fileName,
      item,
      preview,
    })
  }, [])

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

  const applyAllPreviews = useCallback(async (items: ImageProcessingBatchItem[] = batchImages) => {
    if (items.length === 0) return
    cancelPendingBatchPreviews()
    const operationId = batchApplyOperationIdRef.current + 1
    batchApplyOperationIdRef.current = operationId
    batchImagesRef.current = items
    setBatchApplying(true)
    const nextPreviews: BatchUpscalePreviewMap = {}
    pendingBatchUpscalePreviewsRef.current = nextPreviews
    let committed = false
    try {
      const upscaleTargets = items.filter((item) => item.settings.upscaleEnabled)
      if (upscaleTargets.length === 0) {
        clearBatchUpscalePreviews()
        message.success(`已将参数应用到 ${items.length} 张图片`)
        return
      }
      const generated = await createUpscalePreviewsForItems(upscaleTargets)
      for (const { item, preview } of generated) {
        const signature = createImageProcessingBatchSettingsSignature(item.settings, item.draft)
        nextPreviews[item.id] = {
          preview,
          signature,
        }
      }
      const staleResult = generated.some(({ item }) => {
        const signature = createImageProcessingBatchSettingsSignature(item.settings, item.draft)
        const latestItem = batchImagesRef.current.find((candidate) => candidate.id === item.id)
        const latestSignature = latestItem
          ? createImageProcessingBatchSettingsSignature(latestItem.settings, latestItem.draft)
          : null
        return latestSignature !== signature
      })
      if (operationId !== batchApplyOperationIdRef.current || staleResult) return
      for (const entry of Object.values(batchUpscalePreviewsRef.current)) {
        revokeBatchUpscalePreview(entry.preview)
      }
      batchUpscalePreviewsRef.current = nextPreviews
      setBatchUpscalePreviews(nextPreviews)
      pendingBatchUpscalePreviewsRef.current = {}
      committed = true
      setUpscaleCompareEnabled(true)
      message.success(`已生成 ${upscaleTargets.length} 张高清化预览`)
    } catch (error) {
      if (operationId === batchApplyOperationIdRef.current) {
        message.error(`全部应用预览失败：${String(error)}`)
      }
    } finally {
      if (!committed) {
        for (const entry of Object.values(nextPreviews)) {
          revokeBatchUpscalePreview(entry.preview)
        }
      }
      if (pendingBatchUpscalePreviewsRef.current === nextPreviews) {
        pendingBatchUpscalePreviewsRef.current = {}
      }
      if (operationId === batchApplyOperationIdRef.current) {
        setBatchApplying(false)
      }
    }
  }, [batchImages, cancelPendingBatchPreviews, clearBatchUpscalePreviews, createUpscalePreviewsForItems, setUpscaleCompareEnabled])

  const exportAllImages = useCallback(async (items: ImageProcessingBatchItem[] = batchImages) => {
    if (items.length === 0) {
      await exportImage()
      return
    }
    const targets = items
    setExporting(true)
    const generatedPreviews: ImageUpscalePreview[] = []
    try {
      const desktopApi = getDesktopApi()
      const fileNames = deriveBatchExportFileNamesBySettings(targets.map((item) => ({
        sourceName: item.draft.sourceName,
        exportEncoding: item.settings.exportEncoding,
      })))
      const missingUpscaleItems = targets.filter((item) => {
        if (!item.settings.upscaleEnabled) return false
        const signature = createImageProcessingBatchSettingsSignature(item.settings, item.draft)
        const storedEntry = batchUpscalePreviewsRef.current[item.id]
        const storedPreview = storedEntry?.signature === signature ? storedEntry.preview : null
        const existingPreview = item.id === activeBatchImageId ? upscalePreview ?? storedPreview : storedPreview
        return !existingPreview
      })
      const generatedEntries = await createUpscalePreviewsForItems(missingUpscaleItems)
      const generatedPreviewById = new Map(generatedEntries.map(({ item, preview }) => [item.id, preview]))
      generatedPreviews.push(...generatedEntries.map(({ preview }) => preview))
      const encodedFiles = []
      for (const [index, item] of targets.entries()) {
        const signature = createImageProcessingBatchSettingsSignature(item.settings, item.draft)
        const storedEntry = batchUpscalePreviewsRef.current[item.id]
        const storedPreview = storedEntry?.signature === signature ? storedEntry.preview : null
        const batchPreview = item.id === activeBatchImageId ? upscalePreview ?? storedPreview : storedPreview
        if (item.settings.upscaleEnabled) {
          const preview = batchPreview ?? generatedPreviewById.get(item.id)
          if (!preview) throw new Error(`${item.draft.sourceName} 缺少高清化结果。`)
          encodedFiles.push(await encodeUpscalePreview(preview, fileNames[index]!, item, desktopApi))
          continue
        }
        const prepared = await prepareBatchExport(item)
        try {
          const encodingInfo = getImageExportEncodingInfo(item.settings.exportEncoding)
          const renderFormat = encodingInfo.requiresDesktopEncoding ? 'png' : encodingInfo.extension
          const backgroundColor = resolveImageExportBackgroundColor(
            item.settings.exportBackground,
            item.settings.exportEncoding,
          )
          const blob = await exportProcessedImage(prepared.sourceUrl, prepared.crop, renderFormat, prepared.outputSize, backgroundColor)
          encodedFiles.push(await encodeImageExportBlob(fileNames[index]!, blob, item.settings.exportEncoding, desktopApi))
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
    batchImages,
    createUpscalePreviewsForItems,
    encodeUpscalePreview,
    exportImage,
    prepareBatchExport,
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
