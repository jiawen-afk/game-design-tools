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
  const [matte, setMatte] = useState<MatteParams>(DEFAULT_MATTE)
  const [matteEnabled, setMatteEnabled] = useState(true)
  const [crop, setCrop] = useState<CropBox | null>(null)
  const [cropMode, setCropMode] = useState(false)
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
    exportEncoding,
    exportFormat,
    setExportFormat,
    setOptimizePng,
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
    setExportScale,
  })
  const {
    exporting,
    exportImage,
  } = useImageExportWorkflow({
    activeImageSource,
    crop,
    exportFormat,
    exportEncoding,
    exportName,
    exportSize,
    upscaleEnabled,
    upscalePreview,
  })
  const { resetWorkspace, uploadImage } = useImageSourceWorkspace({
    draft,
    setDraft,
    clearCropPreview,
    clearProcessed,
    resetPreviewTransform,
    resetUpscale,
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
    exportFormat,
    setExportFormat,
    setOptimizePng,
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
    updateExportDimension: (dimension: ExportDimension, value: number | null) => updateExportDimensionForBaseSize(exportBaseSize, dimension, value),
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
