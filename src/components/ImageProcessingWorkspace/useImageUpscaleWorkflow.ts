import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import {
  getExportSizeAfterScaleChange,
  normalizeExportScale,
  resolveExportBaseSize,
  shouldInvalidateUpscalePreview,
  type CropBox,
  type ImageExportFormat,
  type ImageSourceLike,
} from './imageProcessingModel'
import {
  exportProcessedImage,
  revokeImageObjectUrl,
  type ProcessedImageDraft,
} from './imageProcessingPipeline'
import {
  defaultUpscaleOptions,
  normalizeUpscaleOptions,
  type UpscaleOptions,
} from './imageUpscaleModel'
import { useUpscaleRuntime } from './useUpscaleRuntime'

export interface ImageUpscalePreview {
  originalUrl: string
  url: string
  blob: Blob
  width: number
  height: number
}

interface UseImageUpscaleWorkflowOptions {
  activeImageSource: ImageSourceLike | null
  crop: CropBox | null
  cropPreview: ProcessedImageDraft | null
  exportBackgroundColor: string | null
  exportFormat: ImageExportFormat
  exportName: string
  exportScale: number
  setExportScale: (value: SetStateAction<number>) => void
  onPreviewGenerated?: () => void
}

export function useImageUpscaleWorkflow({
  activeImageSource,
  crop,
  cropPreview,
  exportBackgroundColor,
  exportFormat,
  exportName,
  exportScale,
  setExportScale,
  onPreviewGenerated,
}: UseImageUpscaleWorkflowOptions) {
  const [upscaleEnabled, setUpscaleEnabled] = useState(false)
  const [upscaleOptions, setUpscaleOptions] = useState<UpscaleOptions>(defaultUpscaleOptions)
  const [upscaleProcessing, setUpscaleProcessing] = useState(false)
  const [upscalePreview, setUpscalePreview] = useState<ImageUpscalePreview | null>(null)
  const [upscaleOutputScale, setUpscaleOutputScale] = useState(1)
  const exportScaleSnapshotRef = useRef<number | null>(null)
  const upscaleOperationIdRef = useRef(0)
  const upscalePreviewInputsRef = useRef<{
    crop: CropBox | null
    exportBackgroundColor: string | null
    exportFormat: ImageExportFormat
    processedUrl: string | null
    upscaleOptions: UpscaleOptions
  } | null>(null)
  const {
    installUpscaleRuntime,
    queryUpscaleStatus,
    upscaleInstallProgress,
    upscaleInstalling,
    upscaleRuntimeStatus,
  } = useUpscaleRuntime({
    unavailableMessage: '当前不是桌面运行环境，普通导出仍可使用。',
  })
  const exportBaseSize = useMemo(
    () => resolveExportBaseSize(crop, upscaleEnabled, upscalePreview ? { width: upscalePreview.width, height: upscalePreview.height } : null),
    [crop, upscaleEnabled, upscalePreview]
  )
  const exportSize = useMemo(
    () => getExportSizeAfterScaleChange(exportBaseSize, exportScale),
    [exportBaseSize, exportScale]
  )
  const exportScaleForSettings = exportScaleSnapshotRef.current ?? exportScale
  const upscaleOutputScaleForSettings = upscalePreview ? exportScale : upscaleOutputScale

  const clearUpscalePreview = useCallback(() => {
    upscaleOperationIdRef.current += 1
    setUpscaleProcessing(false)
    setUpscalePreview((previous) => {
      revokeImageObjectUrl(previous?.url)
      return null
    })
    if (exportScaleSnapshotRef.current !== null) {
      setExportScale(exportScaleSnapshotRef.current)
    }
    exportScaleSnapshotRef.current = null
    upscalePreviewInputsRef.current = null
  }, [setExportScale])

  useEffect(() => {
    return () => {
      upscaleOperationIdRef.current += 1
      revokeImageObjectUrl(upscalePreview?.url)
    }
  }, [upscalePreview])

  useEffect(() => {
    if (upscalePreview) setUpscaleOutputScale(normalizeExportScale(exportScale))
  }, [exportScale, upscalePreview])

  useEffect(() => {
    if (!upscalePreview) return
    const previewInputs = upscalePreviewInputsRef.current
    const currentInputs = {
      crop,
      exportBackgroundColor,
      exportFormat,
      processedUrl: activeImageSource?.url ?? null,
      upscaleOptions,
    }
    if (previewInputs && !shouldInvalidateUpscalePreview(previewInputs, currentInputs)) return
    clearUpscalePreview()
  }, [activeImageSource, clearUpscalePreview, crop, exportBackgroundColor, exportFormat, upscaleOptions, upscalePreview])

  const resetUpscale = useCallback((enabled = false) => {
    setUpscaleEnabled(enabled)
    clearUpscalePreview()
  }, [clearUpscalePreview])

  const updateUpscaleOptions = useCallback((patch: Partial<UpscaleOptions>) => {
    setUpscaleOptions((current) => normalizeUpscaleOptions({ ...current, ...patch }))
  }, [])

  const setUpscaleEnabledWithPreviewReset = useCallback((enabled: boolean) => {
    setUpscaleEnabled(enabled)
    if (!enabled) clearUpscalePreview()
  }, [clearUpscalePreview])

  const restoreUpscaleSettings = useCallback((enabled: boolean, options: UpscaleOptions, outputScale = 1) => {
    clearUpscalePreview()
    setUpscaleEnabled(enabled)
    setUpscaleOptions(normalizeUpscaleOptions(options))
    setUpscaleOutputScale(normalizeExportScale(outputScale))
  }, [clearUpscalePreview])

  const runUpscalePreview = useCallback(async () => {
    if (!activeImageSource || !crop || !cropPreview) return
    const api = getDesktopApi()
    if (!api) {
      message.warning('当前不是桌面运行环境，无法执行高清化。')
      return
    }
    if (!upscaleRuntimeStatus?.installed) {
      message.warning('请先安装高清化运行包。')
      return
    }
    const operationId = upscaleOperationIdRef.current + 1
    upscaleOperationIdRef.current = operationId
    const requestedOutputScale = upscaleOutputScale
    setUpscaleProcessing(true)
    try {
      const blob = await exportProcessedImage(activeImageSource.url, crop, exportFormat, exportSize, exportBackgroundColor)
      if (operationId !== upscaleOperationIdRef.current) return
      const data = await blob.arrayBuffer()
      if (operationId !== upscaleOperationIdRef.current) return
      if (exportScaleSnapshotRef.current === null) {
        exportScaleSnapshotRef.current = exportScale
      }
      const result = await api.upscaleImage({
        inputName: exportName,
        outputFormat: exportFormat,
        data,
        options: upscaleOptions,
      })
      if (operationId !== upscaleOperationIdRef.current) return
      const upscaledBlob = blobFromDesktopBinaryData(result.data, blob.type)
      const url = URL.createObjectURL(upscaledBlob)
      setUpscalePreview((previous) => {
        revokeImageObjectUrl(previous?.url)
        return {
          originalUrl: cropPreview.url,
          url,
          blob: upscaledBlob,
          width: exportSize.width * upscaleOptions.scale,
          height: exportSize.height * upscaleOptions.scale,
        }
      })
      upscalePreviewInputsRef.current = {
        crop,
        exportBackgroundColor,
        exportFormat,
        processedUrl: activeImageSource.url,
        upscaleOptions,
      }
      setExportScale(requestedOutputScale)
      onPreviewGenerated?.()
      message.success('高清化预览已生成')
    } catch (error) {
      if (operationId === upscaleOperationIdRef.current) {
        message.error(`高清化失败：${String(error)}`)
      }
    } finally {
      if (operationId === upscaleOperationIdRef.current) {
        setUpscaleProcessing(false)
      }
    }
  }, [activeImageSource, crop, cropPreview, exportBackgroundColor, exportFormat, exportName, exportScale, exportSize, onPreviewGenerated, setExportScale, upscaleOptions, upscaleOutputScale, upscaleRuntimeStatus])

  return {
    upscaleEnabled,
    setUpscaleEnabled: setUpscaleEnabledWithPreviewReset,
    upscaleOptions,
    updateUpscaleOptions,
    exportBaseSize,
    exportSize,
    exportScaleForSettings,
    upscaleOutputScaleForSettings,
    upscaleRuntimeStatus,
    upscaleInstallProgress,
    upscaleInstalling,
    upscaleProcessing,
    upscalePreview,
    queryUpscaleStatus,
    installUpscaleRuntime,
    runUpscalePreview,
    clearUpscalePreview,
    resetUpscale,
    restoreUpscaleSettings,
  }
}
