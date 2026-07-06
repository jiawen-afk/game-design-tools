import { useMemo, useState } from 'react'

import {
  getCropBoxAfterAspectRatioChange,
  resolveMatteImageSource,
  MIN_IMAGE_CROP_SIZE,
  type CropBox,
  type ExportDimension,
  type ImageSourceLike,
} from './imageProcessingModel'
import type { LoadedImageDraft } from './imageProcessingPipeline'
import { useImageCropPreview } from './useImageCropPreview'
import { useImageExportSettingsWorkspace } from './useImageExportSettingsWorkspace'
import { useImageExportWorkflow } from './useImageExportWorkflow'
import { useImageKeyColorPicker } from './useImageKeyColorPicker'
import { useImageMatteProcessing } from './useImageMatteProcessing'
import { useImagePreviewTransform } from './useImagePreviewTransform'
import { useImageSourceWorkspace } from './useImageSourceWorkspace'
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
  const [batchImages, setBatchImages] = useState<ReturnType<typeof useImageSourceWorkspace>['batchImages']>([])
  const [activeBatchImageId, setActiveBatchImageId] = useState<string | null>(null)
  const [matte, setMatte] = useState<MatteParams>(DEFAULT_MATTE)
  const [matteEnabled, setMatteEnabled] = useState(true)
  const [crop, setCrop] = useState<CropBox | null>(null)
  const [cropMode, setCropMode] = useState(false)
  const [upscaleCompareEnabled, setUpscaleCompareEnabled] = useState(false)
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

  const {
    activePreviewCropRect,
    clearCropPreview,
    cropDraftRect,
    cropDrag,
    cropPreview,
    cropPreviewSize,
    minPreviewCropSize,
    previewCropRect,
    previewImageRect,
    setCropDraftRect,
    setCropDrag,
    setCropPreviewContainerSize,
  } = useImageCropPreview({
    activeImageSource,
    crop,
    previewZoom,
    setCrop,
  })

  const canExport = Boolean(activeImageSource && crop)
  const {
    cropAspectRatio,
    exportBackground,
    exportBackgroundColor,
    exportEncoding,
    exportFormat,
    canUseTransparentExportBackground,
    setExportFormat,
    setOptimizePng,
    setExportBackgroundMode,
    setExportBackgroundColor,
    exportName,
    exportScale,
    setExportScale,
    updateExportDimension: updateExportDimensionForBaseSize,
  } = useImageExportSettingsWorkspace({
    crop,
    sourceName: draft?.sourceName ?? '',
  })
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
    clearUpscalePreview,
    resetUpscale,
    exportBaseSize,
    exportSize,
  } = useImageUpscaleWorkflow({
    activeImageSource,
    crop,
    cropPreview,
    exportBackgroundColor,
    exportFormat,
    exportName,
    exportScale,
    setExportScale,
    onPreviewGenerated: () => setUpscaleCompareEnabled(true),
  })
  const {
    exporting,
    batchApplying,
    batchUpscalePreview,
    applyAllPreviews,
    exportAllImages,
  } = useImageExportWorkflow({
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
  })
  const setUpscaleEnabled = (enabled: boolean) => {
    updateUpscaleEnabled(enabled)
    if (!enabled) setUpscaleCompareEnabled(false)
  }
  const displayedUpscalePreview = upscaleEnabled ? upscalePreview ?? batchUpscalePreview : null
  const {
    resetWorkspace,
    selectBatchImage,
    uploadImage,
    uploadImages,
  } = useImageSourceWorkspace({
    draft,
    setDraft,
    batchImages,
    setBatchImages,
    activeBatchImageId,
    setActiveBatchImageId,
    clearCropPreview,
    clearProcessed,
    resetPreviewTransform,
    resetUpscale,
    clearUpscalePreview,
    setUpscaleCompareEnabled,
    crop,
    setCrop,
    setCropDraftRect,
    setCropDrag,
    setExportScale,
    setMatteEnabled,
  })

  const updateMatte = <K extends keyof MatteParams>(key: K, value: MatteParams[K]) => {
    setMatte((current) => ({ ...current, [key]: value }))
  }
  const { pickKeyColorFromSource } = useImageKeyColorPicker({ draft, setMatte })

  const updateCropAspectRatio = (value: number | null) => {
    if (!value || !crop || !activeImageSource) return
    setCrop(getCropBoxAfterAspectRatioChange(crop, activeImageSource.width, activeImageSource.height, value, MIN_IMAGE_CROP_SIZE))
  }

  return {
    draft,
    batchImages,
    activeBatchImageId,
    selectBatchImage,
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
    exportEncoding,
    exportBackground,
    exportBackgroundColor,
    exportFormat,
    canUseTransparentExportBackground,
    setExportFormat,
    setOptimizePng,
    setExportBackgroundMode,
    setExportBackgroundColor,
    exportSize,
    exportScale,
    setExportScale,
    upscaleEnabled,
    setUpscaleEnabled,
    upscaleOptions,
    updateUpscaleOptions,
    upscaleRuntimeStatus,
    upscaleInstallProgress,
    upscaleInstalling,
    upscaleProcessing,
    activeUpscalePreview: displayedUpscalePreview,
    upscalePreview: displayedUpscalePreview,
    upscaleCompareEnabled,
    setUpscaleCompareEnabled,
    queryUpscaleStatus,
    installUpscaleRuntime,
    runUpscalePreview,
    updateExportDimension: (dimension: ExportDimension, value: number | null) => updateExportDimensionForBaseSize(exportBaseSize, dimension, value),
    cropAspectRatio,
    exportName,
    processing,
    batchApplying,
    exporting,
    canExport,
    minCropSize: MIN_IMAGE_CROP_SIZE,
    uploadImage,
    uploadImages,
    updateMatte,
    handleWheelZoom,
    resetPreviewTransform,
    resetWorkspace,
    updateCropAspectRatio,
    pickKeyColorFromSource,
    applyAllPreviews,
    exportImage: exportAllImages,
    exportAllImages,
  }
}
