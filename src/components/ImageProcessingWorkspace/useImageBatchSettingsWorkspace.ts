import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'

import {
  areImageProcessingBatchSettingsEqual,
  cloneImageProcessingBatchSettings,
  createFullImageCrop,
  mapImageProcessingBatchSettingsToSize,
  type CropBox,
  type ImageExportBackgroundSettings,
  type ImageExportEncodingSettings,
  type ImageProcessingBatchSettings,
} from './imageProcessingModel'
import type { LoadedImageDraft } from './imageProcessingPipeline'
import type { ImageProcessingBatchItem } from './useImageSourceWorkspace'
import type { UpscaleOptions } from './imageUpscaleModel'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'
import type { MatteMode } from '../MultiFrameSpriteWorkspace/aiMattingService'

interface UseImageBatchSettingsWorkspaceOptions {
  activeBatchImageId: string | null
  batchImages: ImageProcessingBatchItem[]
  crop: CropBox | null
  draft: LoadedImageDraft | null
  exportBackground: ImageExportBackgroundSettings
  exportEncoding: ImageExportEncodingSettings
  exportScale: number
  matte: MatteParams
  matteEnabled: boolean
  matteMode: MatteMode
  restoreExportSettings: (settings: {
    exportEncoding: ImageExportEncodingSettings
    exportBackground: ImageExportBackgroundSettings
    exportScale: number
  }) => void
  restoreUpscaleSettings: (enabled: boolean, options: UpscaleOptions, outputScale: number) => void
  setBatchImages: Dispatch<SetStateAction<ImageProcessingBatchItem[]>>
  setCrop: Dispatch<SetStateAction<CropBox | null>>
  setMatte: Dispatch<SetStateAction<MatteParams>>
  setMatteEnabled: Dispatch<SetStateAction<boolean>>
  setMatteMode: Dispatch<SetStateAction<MatteMode>>
  setUpscaleCompareEnabled: Dispatch<SetStateAction<boolean>>
  upscaleEnabled: boolean
  upscaleOptions: UpscaleOptions
  upscaleOutputScale: number
}

export function useImageBatchSettingsWorkspace({
  activeBatchImageId,
  batchImages,
  crop,
  draft,
  exportBackground,
  exportEncoding,
  exportScale,
  matte,
  matteEnabled,
  matteMode,
  restoreExportSettings,
  restoreUpscaleSettings,
  setBatchImages,
  setCrop,
  setMatte,
  setMatteEnabled,
  setMatteMode,
  setUpscaleCompareEnabled,
  upscaleEnabled,
  upscaleOptions,
  upscaleOutputScale,
}: UseImageBatchSettingsWorkspaceOptions) {
  const batchImagesRef = useRef(batchImages)
  batchImagesRef.current = batchImages

  const captureActiveSettings = useCallback((): ImageProcessingBatchSettings | null => {
    if (!draft) return null
    return cloneImageProcessingBatchSettings({
      matte,
      matteEnabled,
      matteMode,
      crop: crop ?? createFullImageCrop(draft.width, draft.height),
      exportEncoding,
      exportBackground,
      exportScale,
      upscaleEnabled,
      upscaleOptions,
      upscaleOutputScale,
    })
  }, [
    crop,
    draft,
    exportBackground,
    exportEncoding,
    exportScale,
    matte,
    matteEnabled,
    matteMode,
    upscaleEnabled,
    upscaleOptions,
    upscaleOutputScale,
  ])

  const synchronizeActiveSettings = useCallback((): ImageProcessingBatchItem[] => {
    if (!activeBatchImageId) return batchImagesRef.current
    const settings = captureActiveSettings()
    if (!settings) return batchImagesRef.current
    const current = batchImagesRef.current
    const active = current.find((item) => item.id === activeBatchImageId)
    if (!active || areImageProcessingBatchSettingsEqual(active.settings, settings)) return current
    const next = current.map((item) => item.id === activeBatchImageId
      ? { ...item, settings: cloneImageProcessingBatchSettings(settings) }
      : item)
    batchImagesRef.current = next
    setBatchImages(next)
    return next
  }, [activeBatchImageId, captureActiveSettings, setBatchImages])

  const persistActiveSettings = useCallback(() => {
    synchronizeActiveSettings()
  }, [synchronizeActiveSettings])

  useEffect(() => {
    persistActiveSettings()
  }, [persistActiveSettings])

  const restoreBatchSettings = useCallback((settings: ImageProcessingBatchSettings) => {
    const restored = cloneImageProcessingBatchSettings(settings)
    restoreUpscaleSettings(restored.upscaleEnabled, restored.upscaleOptions, restored.upscaleOutputScale)
    setMatte(restored.matte)
    setMatteEnabled(restored.matteEnabled)
    setMatteMode(restored.matteMode)
    setCrop(restored.crop)
    restoreExportSettings(restored)
    setUpscaleCompareEnabled(false)
  }, [
    restoreExportSettings,
    restoreUpscaleSettings,
    setCrop,
    setMatte,
    setMatteEnabled,
    setMatteMode,
    setUpscaleCompareEnabled,
  ])

  const applyActiveSettingsToAll = useCallback((): ImageProcessingBatchItem[] => {
    if (!draft) return batchImagesRef.current
    const settings = captureActiveSettings()
    if (!settings) return batchImagesRef.current
    const sourceSize = { width: draft.width, height: draft.height }
    const next = batchImagesRef.current.map((item) => ({
      ...item,
      settings: mapImageProcessingBatchSettingsToSize(settings, sourceSize, item.draft),
    }))
    batchImagesRef.current = next
    setBatchImages(next)
    return next
  }, [captureActiveSettings, draft, setBatchImages])

  return {
    applyActiveSettingsToAll,
    persistActiveSettings,
    restoreBatchSettings,
    synchronizeActiveSettings,
  }
}
