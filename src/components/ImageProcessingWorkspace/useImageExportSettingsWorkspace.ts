import { useCallback, useMemo, useState, type SetStateAction } from 'react'

import {
  canUseTransparentImageExportBackground,
  deriveEncodedExportFileName,
  defaultImageExportEncoding,
  getDefaultImageExportBackground,
  getAspectRatioValue,
  getExportScaleAfterDimensionChange,
  getImageExportEncodingInfo,
  normalizeImageExportEncoding,
  normalizeImageExportBackground,
  normalizeExportScale,
  resolveImageExportBackgroundColor,
  type CropBox,
  type ExportDimension,
  type ImageExportBackgroundMode,
  type ImageExportBackgroundSettings,
  type ImageExportEncodingSettings,
  type ImageExportEncodingFormat,
  type RectSize,
} from './imageProcessingModel'

interface UseImageExportSettingsWorkspaceOptions {
  crop: CropBox | null
  sourceName: string
}

export function useImageExportSettingsWorkspace({
  crop,
  sourceName,
}: UseImageExportSettingsWorkspaceOptions) {
  const [exportEncoding, setExportEncodingState] = useState<ImageExportEncodingSettings>(defaultImageExportEncoding)
  const [exportBackground, setExportBackgroundState] = useState<ImageExportBackgroundSettings>(
    () => getDefaultImageExportBackground(defaultImageExportEncoding)
  )
  const [exportScale, setExportScaleState] = useState(1)
  const exportFormat = getImageExportEncodingInfo(exportEncoding).extension
  const canUseTransparentExportBackground = canUseTransparentImageExportBackground(exportEncoding)
  const exportBackgroundColor = useMemo(
    () => resolveImageExportBackgroundColor(exportBackground, exportEncoding),
    [exportBackground, exportEncoding]
  )
  const exportName = useMemo(
    () => deriveEncodedExportFileName(sourceName, exportEncoding),
    [sourceName, exportEncoding]
  )
  const cropAspectRatio = useMemo(() => crop ? getAspectRatioValue(crop) : 1, [crop])

  const setExportFormat = useCallback((format: ImageExportEncodingFormat) => {
    setExportEncodingState((current) => {
      const previousAllowsTransparency = canUseTransparentImageExportBackground(current)
      const next = normalizeImageExportEncoding({ ...current, format })
      setExportBackgroundState((background) => {
        const shouldRestoreAlphaDefault = canUseTransparentImageExportBackground(next)
          && !previousAllowsTransparency
          && background.mode === 'color'
          && background.color === '#000000'
        return normalizeImageExportBackground(
          shouldRestoreAlphaDefault ? getDefaultImageExportBackground(next) : background,
          next
        )
      })
      return next
    })
  }, [])

  const setOptimizePng = useCallback((optimizePng: boolean) => {
    setExportEncodingState((current) => normalizeImageExportEncoding({ ...current, optimizePng }))
  }, [])

  const setExportBackgroundMode = useCallback((mode: ImageExportBackgroundMode) => {
    setExportBackgroundState((current) => normalizeImageExportBackground({ ...current, mode }, exportEncoding))
  }, [exportEncoding])

  const setExportBackgroundColor = useCallback((color: string) => {
    setExportBackgroundState((current) => normalizeImageExportBackground({ ...current, mode: 'color', color }, exportEncoding))
  }, [exportEncoding])

  const setExportScale = useCallback((value: SetStateAction<number>) => {
    setExportScaleState((current) => normalizeExportScale(
      typeof value === 'function' ? value(current) : value
    ))
  }, [])

  const updateExportDimension = useCallback((
    exportBaseSize: RectSize,
    dimension: ExportDimension,
    value: number | null
  ) => {
    if (value === null) return
    setExportScaleState(getExportScaleAfterDimensionChange(exportBaseSize, dimension, value))
  }, [])

  return {
    cropAspectRatio,
    exportEncoding,
    exportBackground,
    exportBackgroundColor,
    canUseTransparentExportBackground,
    exportFormat,
    setExportFormat,
    setOptimizePng,
    setExportBackgroundMode,
    setExportBackgroundColor,
    exportName,
    exportScale,
    setExportScale,
    updateExportDimension,
  }
}
