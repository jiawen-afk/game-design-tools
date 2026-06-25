import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  createFullImageCrop,
  deriveExportFileName,
  isSupportedImageFile,
  fitContainedImageRect,
  getPreviewRectFromCropBox,
  getAspectRatioValue,
  getCropBoxAfterAspectRatioChange,
  getExportScaleAfterDimensionChange,
  resolveImageExportTarget,
  resolveMatteImageSource,
  mapPreviewPointToImagePixel,
  MIN_IMAGE_CROP_SIZE,
  normalizeExportScale,
  type PreviewRect,
  type CropBox,
  type ExportDimension,
  type ImageExportFormat,
  type ImageSourceLike,
  type Point,
} from './imageProcessingModel'
import {
  createImageDraft,
  exportProcessedImage,
  renderCroppedImageUrl,
  revokeLoadedImageDraftUrl,
  revokeProcessedImageDraftUrl,
  saveImageExportBlob,
  sampleSourceImagePixel,
  type LoadedImageDraft,
  type ProcessedImageDraft,
} from './imageProcessingPipeline'
import { useImageCropDrag, type ImageCropDragState } from './useImageCropDrag'
import { useImageMatteProcessing } from './useImageMatteProcessing'
import { useImagePreviewTransform } from './useImagePreviewTransform'
import { useImageUpscaleWorkflow } from './useImageUpscaleWorkflow'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'

const DEFAULT_MATTE: MatteParams = {
  keyColor: [0, 255, 0],
  tolerance: 5,
  smoothness: 5,
  spill: 0,
  spillColorMode: 'key',
  customSpillHex: '#00ff00',
  erosion: 5,
}

export type ImageProcessingWorkspaceViewModel = ReturnType<typeof useImageProcessingWorkspace>

export function useImageProcessingWorkspace() {
  const [draft, setDraft] = useState<LoadedImageDraft | null>(null)
  const [matte, setMatte] = useState<MatteParams>(DEFAULT_MATTE)
  const [matteEnabled, setMatteEnabled] = useState(true)
  const [crop, setCrop] = useState<CropBox | null>(null)
  const [cropPreview, setCropPreview] = useState<ProcessedImageDraft | null>(null)
  const [cropMode, setCropMode] = useState(false)
  const [cropPreviewSize, setCropPreviewSize] = useState({ width: 0, height: 0 })
  const [cropDraftRect, setCropDraftRect] = useState<PreviewRect | null>(null)
  const [cropDrag, setCropDrag] = useState<ImageCropDragState | null>(null)
  const [exportFormat, setExportFormat] = useState<ImageExportFormat>('png')
  const [exportScale, setExportScaleState] = useState(1)
  const [exporting, setExporting] = useState(false)
  const {
    previewZoom,
    previewPan,
    setPreviewZoom,
    handleWheelZoom,
    resetPreviewTransform,
  } = useImagePreviewTransform()
  const draftImageSource = useMemo<ImageSourceLike | null>(() => draft
    ? { url: draft.sourceUrl, width: draft.width, height: draft.height }
    : null, [draft])
  const {
    processed,
    processing,
    clearProcessed,
  } = useImageMatteProcessing({
    draft,
    matte,
    matteEnabled,
    setCrop,
  })
  const activeImageSource = useMemo(
    () => resolveMatteImageSource(draftImageSource, processed, matteEnabled),
    [draftImageSource, matteEnabled, processed]
  )

  useEffect(() => {
    return () => {
      revokeLoadedImageDraftUrl(draft)
    }
  }, [draft])

  useEffect(() => {
    return () => {
      revokeProcessedImageDraftUrl(cropPreview)
    }
  }, [cropPreview])

  useEffect(() => {
    if (!activeImageSource || !crop) {
      setCropPreview(null)
      return
    }
    let alive = true
    void renderCroppedImageUrl(activeImageSource.url, crop)
      .then((result) => {
        if (!alive) {
          revokeProcessedImageDraftUrl(result)
          return
        }
        setCropPreview((previous) => {
          revokeProcessedImageDraftUrl(previous)
          return result
        })
      })
      .catch((error) => message.error(`裁剪预览失败：${String(error)}`))
    return () => {
      alive = false
    }
  }, [activeImageSource, crop])

  const previewImageRect = useMemo(() => {
    if (!activeImageSource || cropPreviewSize.width <= 0 || cropPreviewSize.height <= 0) return null
    return fitContainedImageRect({ width: activeImageSource.width, height: activeImageSource.height }, cropPreviewSize)
  }, [activeImageSource, cropPreviewSize.height, cropPreviewSize.width])

  const previewCropRect = useMemo(() => {
    if (!crop || !activeImageSource || !previewImageRect) return null
    return getPreviewRectFromCropBox(crop, previewImageRect, { width: activeImageSource.width, height: activeImageSource.height })
  }, [activeImageSource, crop, previewImageRect])

  const activePreviewCropRect = cropDraftRect ?? previewCropRect

  const minPreviewCropSize = useMemo(() => {
    if (!previewImageRect || !activeImageSource) return MIN_IMAGE_CROP_SIZE
    const scale = previewImageRect.width / Math.max(1, activeImageSource.width)
    return Math.max(4, MIN_IMAGE_CROP_SIZE * scale)
  }, [activeImageSource, previewImageRect])

  useImageCropDrag({
    cropDrag,
    previewImageRect,
    activeImageSource,
    previewZoom,
    minPreviewCropSize,
    setCrop,
    setCropDraftRect,
    setCropDrag,
  })

  const canExport = Boolean(activeImageSource && crop)
  const exportName = useMemo(
    () => deriveExportFileName(draft?.sourceName ?? '', exportFormat),
    [draft?.sourceName, exportFormat]
  )
  const cropAspectRatio = useMemo(() => crop ? getAspectRatioValue(crop) : 1, [crop])
  const {
    upscaleEnabled,
    setUpscaleEnabled: updateUpscaleEnabled,
    upscaleOptions,
    updateUpscaleOptions,
    upscaleRuntimeStatus,
    upscaleInstallProgress,
    upscaleInstalling,
    upscaleProcessing,
    upscalePreview,
    queryUpscaleStatus,
    installUpscaleRuntime,
    runUpscalePreview,
    resetUpscale,
    exportBaseSize,
    exportSize,
  } = useImageUpscaleWorkflow({
    activeImageSource,
    crop,
    cropPreview,
    exportFormat,
    exportName,
    exportScale,
    setExportScale: setExportScaleState,
  })

  const uploadImage = async (file: File) => {
    if (!isSupportedImageFile(file)) {
      message.error('仅支持 WebP、JPG、JPEG、PNG 图片')
      return
    }
    try {
      const nextDraft = await createImageDraft(file)
      setDraft((previous) => {
        revokeLoadedImageDraftUrl(previous)
        return nextDraft
      })
      clearProcessed()
      setCrop(createFullImageCrop(nextDraft.width, nextDraft.height))
      setMatteEnabled(true)
      resetUpscale(false)
      setExportScaleState(1)
      setCropDraftRect(null)
      setCropDrag(null)
      resetPreviewTransform()
      message.success('图片已载入')
    } catch (error) {
      message.error(`图片读取失败：${String(error)}`)
    }
  }

  const updateMatte = <K extends keyof MatteParams>(key: K, value: MatteParams[K]) => {
    setMatte((current) => ({ ...current, [key]: value }))
  }

  const resetWorkspace = useCallback(() => {
    setDraft((previous) => {
      revokeLoadedImageDraftUrl(previous)
      return null
    })
    clearProcessed()
    setCropPreview((previous) => {
      revokeProcessedImageDraftUrl(previous)
      return null
    })
    setCrop(null)
    setMatteEnabled(true)
    resetUpscale(false)
    setCropDraftRect(null)
    setCropDrag(null)
    setExportScaleState(1)
    resetPreviewTransform()
  }, [clearProcessed, resetPreviewTransform, resetUpscale])

  const updateCropAspectRatio = (value: number | null) => {
    if (!value || !crop || !activeImageSource) return
    setCrop(getCropBoxAfterAspectRatioChange(crop, activeImageSource.width, activeImageSource.height, value, MIN_IMAGE_CROP_SIZE))
  }

  const setExportScale = useCallback((value: SetStateAction<number>) => {
    setExportScaleState((current) => normalizeExportScale(
      typeof value === 'function' ? value(current) : value
    ))
  }, [])

  const updateExportDimension = useCallback((dimension: ExportDimension, value: number | null) => {
    if (value === null) return
    setExportScaleState(getExportScaleAfterDimensionChange(exportBaseSize, dimension, value))
  }, [exportBaseSize])

  const setCropPreviewContainerSize = useCallback((size: { width: number; height: number }) => {
    setCropPreviewSize((current) => {
      if (current.width === size.width && current.height === size.height) return current
      return size
    })
  }, [])

  const pickKeyColorFromSource = async (point: Point, previewRect: PreviewRect) => {
    if (!draft) return
    try {
      const imagePoint = mapPreviewPointToImagePixel(point, previewRect, { width: draft.width, height: draft.height })
      const keyColor = await sampleSourceImagePixel(draft.sourceUrl, imagePoint)
      updateMatte('keyColor', keyColor)
      message.success(`已取色：rgb(${keyColor.join(', ')})`)
    } catch (error) {
      message.error(`取色失败：${String(error)}`)
    }
  }

  const exportImage = async () => {
    const exportTarget = resolveImageExportTarget(activeImageSource, crop, upscaleEnabled, upscalePreview)
    if (!exportTarget) return
    setExporting(true)
    try {
      const exportBlob = await exportProcessedImage(exportTarget.sourceUrl, exportTarget.crop, exportFormat, exportSize)
      await saveImageExportBlob(exportName, exportBlob, getDesktopApi())
      message.success('图片已导出')
    } catch (error) {
      message.error(`导出失败：${String(error)}`)
    } finally {
      setExporting(false)
    }
  }

  return {
    draft,
    matte,
    matteEnabled,
    setMatteEnabled,
    processed,
    activeImageSource,
    crop,
    setCrop,
    cropPreview,
    cropMode,
    setCropMode,
    previewZoom,
    setPreviewZoom,
    previewPan,
    cropPreviewSize,
    setCropPreviewContainerSize,
    previewImageRect,
    previewCropRect,
    activePreviewCropRect,
    cropDraftRect,
    setCropDraftRect,
    cropDrag,
    setCropDrag,
    exportFormat,
    setExportFormat,
    exportSize,
    exportScale,
    setExportScale,
    upscaleEnabled,
    setUpscaleEnabled: updateUpscaleEnabled,
    upscaleOptions,
    updateUpscaleOptions,
    upscaleRuntimeStatus,
    upscaleInstallProgress,
    upscaleInstalling,
    upscaleProcessing,
    upscalePreview,
    queryUpscaleStatus,
    installUpscaleRuntime,
    runUpscalePreview,
    updateExportDimension,
    cropAspectRatio,
    exportName,
    processing,
    exporting,
    canExport,
    minCropSize: MIN_IMAGE_CROP_SIZE,
    uploadImage,
    updateMatte,
    handleWheelZoom,
    resetPreviewTransform,
    resetWorkspace,
    updateCropAspectRatio,
    pickKeyColorFromSource,
    exportImage,
  }
}
