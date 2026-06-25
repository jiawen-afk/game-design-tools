import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import {
  applyWheelZoom,
  createFullImageCrop,
  deriveExportFileName,
  isSupportedImageFile,
  fitContainedImageRect,
  getPreviewRectFromCropBox,
  getAnchoredWheelZoomTransform,
  getAspectRatioValue,
  getCropBoxAfterAspectRatioChange,
  getExportScaleAfterDimensionChange,
  getExportSizeAfterScaleChange,
  resolveExportBaseSize,
  resolveImageExportTarget,
  resolveMatteImageSource,
  mapPreviewPointToImagePixel,
  shouldInvalidateUpscalePreview,
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
  applyImageMatte,
  createImageDraft,
  exportProcessedImage,
  renderCroppedImageUrl,
  revokeImageObjectUrl,
  revokeLoadedImageDraftUrl,
  revokeProcessedImageDraftUrl,
  saveImageExportBlob,
  sampleSourceImagePixel,
  type LoadedImageDraft,
  type ProcessedImageDraft,
} from './imageProcessingPipeline'
import {
  defaultUpscaleOptions,
  normalizeUpscaleOptions,
  type UpscaleModel,
  type UpscaleOptions,
} from './imageUpscaleModel'
import { useImageCropDrag, type ImageCropDragState } from './useImageCropDrag'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'
import type { DesktopUpscaleInstallProgress, DesktopUpscaleRuntimeStatus } from '../../desktopApi'

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
  const [processed, setProcessed] = useState<ProcessedImageDraft | null>(null)
  const [crop, setCrop] = useState<CropBox | null>(null)
  const [cropPreview, setCropPreview] = useState<ProcessedImageDraft | null>(null)
  const [previewTransform, setPreviewTransform] = useState<{ zoom: number; pan: Point }>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  })
  const [cropMode, setCropMode] = useState(false)
  const [cropPreviewSize, setCropPreviewSize] = useState({ width: 0, height: 0 })
  const [cropDraftRect, setCropDraftRect] = useState<PreviewRect | null>(null)
  const [cropDrag, setCropDrag] = useState<ImageCropDragState | null>(null)
  const [exportFormat, setExportFormat] = useState<ImageExportFormat>('png')
  const [exportScale, setExportScaleState] = useState(1)
  const [upscaleEnabled, setUpscaleEnabled] = useState(false)
  const [upscaleOptions, setUpscaleOptions] = useState<UpscaleOptions>(defaultUpscaleOptions)
  const [upscaleRuntimeStatus, setUpscaleRuntimeStatus] = useState<DesktopUpscaleRuntimeStatus | null>(null)
  const [upscaleInstallProgress, setUpscaleInstallProgress] = useState<DesktopUpscaleInstallProgress | null>(null)
  const [upscaleInstalling, setUpscaleInstalling] = useState(false)
  const [upscaleProcessing, setUpscaleProcessing] = useState(false)
  const [upscalePreview, setUpscalePreview] = useState<{
    originalUrl: string
    url: string
    blob: Blob
    width: number
    height: number
  } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportScaleSnapshotRef = useRef<number | null>(null)
  const upscalePreviewInputsRef = useRef<{
    crop: CropBox | null
    exportFormat: ImageExportFormat
    processedUrl: string | null
    upscaleOptions: UpscaleOptions
  } | null>(null)
  const previewZoom = previewTransform.zoom
  const previewPan = previewTransform.pan
  const draftImageSource = useMemo<ImageSourceLike | null>(() => draft
    ? { url: draft.sourceUrl, width: draft.width, height: draft.height }
    : null, [draft])
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
      revokeProcessedImageDraftUrl(processed)
    }
  }, [processed])

  useEffect(() => {
    return () => {
      revokeProcessedImageDraftUrl(cropPreview)
    }
  }, [cropPreview])

  useEffect(() => {
    return () => {
      revokeImageObjectUrl(upscalePreview?.url)
    }
  }, [upscalePreview])

  useEffect(() => {
    const api = getDesktopApi()
    if (!api) return
    void api.queryUpscaleStatus()
      .then(setUpscaleRuntimeStatus)
      .catch((error) => {
        setUpscaleRuntimeStatus({ installed: false, path: '', models: [], message: String(error) })
      })
    return api.onUpscaleInstallProgress((progress) => setUpscaleInstallProgress(progress))
  }, [])

  useEffect(() => {
    if (!draft) {
      setProcessed(null)
      setCrop(null)
      setCropPreview(null)
      return
    }
    if (!matteEnabled) {
      setProcessed(null)
      setProcessing(false)
      setCrop((current) => current ?? createFullImageCrop(draft.width, draft.height))
      return
    }
    let alive = true
    setProcessing(true)
    void applyImageMatte(draft.sourceUrl, matte)
      .then((result) => {
        if (!alive) {
          revokeProcessedImageDraftUrl(result)
          return
        }
        setProcessed((previous) => {
          revokeProcessedImageDraftUrl(previous)
          return result
        })
        setCrop((current) => current ?? createFullImageCrop(result.width, result.height))
      })
      .catch((error) => message.error(`抠图失败：${String(error)}`))
      .finally(() => {
        if (alive) setProcessing(false)
      })
    return () => {
      alive = false
    }
  }, [draft, matte, matteEnabled])

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

  useEffect(() => {
    if (!upscalePreview) return
    const previewInputs = upscalePreviewInputsRef.current
    const currentInputs = {
      crop,
      exportFormat,
      processedUrl: activeImageSource?.url ?? null,
      upscaleOptions,
    }
    if (previewInputs && !shouldInvalidateUpscalePreview(previewInputs, currentInputs)) return
    setUpscalePreview((previous) => {
      revokeImageObjectUrl(previous?.url)
      return null
    })
    setExportScaleState(exportScaleSnapshotRef.current ?? 1)
    exportScaleSnapshotRef.current = null
    upscalePreviewInputsRef.current = null
  }, [activeImageSource, crop, exportFormat, upscaleOptions, upscalePreview])

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
  const exportBaseSize = useMemo(
    () => resolveExportBaseSize(crop, upscaleEnabled, upscalePreview ? { width: upscalePreview.width, height: upscalePreview.height } : null),
    [crop, upscaleEnabled, upscalePreview]
  )
  const exportSize = useMemo(
    () => getExportSizeAfterScaleChange(exportBaseSize, exportScale),
    [exportBaseSize, exportScale]
  )

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
      setProcessed(null)
      setCrop(createFullImageCrop(nextDraft.width, nextDraft.height))
      setMatteEnabled(true)
      setExportScaleState(1)
      setUpscaleEnabled(false)
      exportScaleSnapshotRef.current = null
      upscalePreviewInputsRef.current = null
      setUpscalePreview((previous) => {
        revokeImageObjectUrl(previous?.url)
        return null
      })
      setCropDraftRect(null)
      setCropDrag(null)
      setPreviewTransform({ zoom: 1, pan: { x: 0, y: 0 } })
      message.success('图片已载入')
    } catch (error) {
      message.error(`图片读取失败：${String(error)}`)
    }
  }

  const updateMatte = <K extends keyof MatteParams>(key: K, value: MatteParams[K]) => {
    setMatte((current) => ({ ...current, [key]: value }))
  }

  const setPreviewZoom = useCallback((value: SetStateAction<number>) => {
    setPreviewTransform((current) => ({
      ...current,
      zoom: typeof value === 'function' ? value(current.zoom) : value,
    }))
  }, [])

  const handleWheelZoom = useCallback((deltaY: number, anchorFromCenter?: Point) => {
    setPreviewTransform((current) => {
      if (!anchorFromCenter) {
        return { ...current, zoom: applyWheelZoom(current.zoom, deltaY) }
      }
      return getAnchoredWheelZoomTransform(current.zoom, current.pan, deltaY, anchorFromCenter)
    })
  }, [])

  const resetPreviewTransform = useCallback(() => {
    setPreviewTransform({ zoom: 1, pan: { x: 0, y: 0 } })
  }, [])

  const resetWorkspace = useCallback(() => {
    setDraft((previous) => {
      revokeLoadedImageDraftUrl(previous)
      return null
    })
    setProcessed((previous) => {
      revokeProcessedImageDraftUrl(previous)
      return null
    })
    setCropPreview((previous) => {
      revokeProcessedImageDraftUrl(previous)
      return null
    })
    setCrop(null)
    setMatteEnabled(true)
    setUpscaleEnabled(false)
    setUpscalePreview((previous) => {
      revokeImageObjectUrl(previous?.url)
      return null
    })
    exportScaleSnapshotRef.current = null
    upscalePreviewInputsRef.current = null
    setCropDraftRect(null)
    setCropDrag(null)
    setExportScaleState(1)
    setPreviewTransform({ zoom: 1, pan: { x: 0, y: 0 } })
  }, [])

  const queryUpscaleStatus = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) {
      const status = { installed: false, path: '', models: [], message: '当前不是桌面运行环境，普通导出仍可使用。' }
      setUpscaleRuntimeStatus(status)
      return status
    }
    const status = await api.queryUpscaleStatus()
    setUpscaleRuntimeStatus(status)
    return status
  }, [])

  const installUpscaleRuntime = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) {
      message.warning('当前不是桌面运行环境，无法安装 Upscayl 运行包。')
      return
    }
    setUpscaleInstalling(true)
    try {
      const status = await api.installUpscaleRuntime()
      setUpscaleRuntimeStatus(status)
      if (status.installed) message.success('高清化运行包已安装')
      else message.error(status.message ?? '运行包安装未完成')
    } catch (error) {
      message.error(`高清化运行包安装失败：${String(error)}`)
    } finally {
      setUpscaleInstalling(false)
    }
  }, [])

  const updateUpscaleOptions = useCallback((patch: Partial<UpscaleOptions>) => {
    setUpscaleOptions((current) => normalizeUpscaleOptions({ ...current, ...patch }))
  }, [])

  const updateUpscaleEnabled = useCallback((enabled: boolean) => {
    setUpscaleEnabled(enabled)
    if (!enabled) {
      setUpscalePreview((previous) => {
        revokeImageObjectUrl(previous?.url)
        return null
      })
      setExportScaleState(exportScaleSnapshotRef.current ?? 1)
      exportScaleSnapshotRef.current = null
      upscalePreviewInputsRef.current = null
    }
  }, [])

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
    setUpscaleProcessing(true)
    try {
      const blob = await exportProcessedImage(activeImageSource.url, crop, exportFormat, exportSize)
      if (exportScaleSnapshotRef.current === null) {
        exportScaleSnapshotRef.current = exportScale
      }
      const result = await api.upscaleImage({
        inputName: exportName,
        outputFormat: exportFormat,
        data: await blob.arrayBuffer(),
        options: upscaleOptions,
      })
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
        exportFormat,
        processedUrl: activeImageSource.url,
        upscaleOptions,
      }
      setExportScaleState(1)
      message.success('高清化预览已生成')
    } catch (error) {
      message.error(`高清化失败：${String(error)}`)
    } finally {
      setUpscaleProcessing(false)
    }
  }, [activeImageSource, crop, cropPreview, exportFormat, exportName, exportScale, exportSize, upscaleOptions, upscaleRuntimeStatus])

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
