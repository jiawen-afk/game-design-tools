import { useCallback, useMemo, useState, type SetStateAction } from 'react'

import {
  deriveEncodedExportFileName,
  defaultImageExportEncoding,
  getAspectRatioValue,
  getExportScaleAfterDimensionChange,
  getImageExportEncodingInfo,
  normalizeImageExportEncoding,
  normalizeExportScale,
  type CropBox,
  type ExportDimension,
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
  const [exportScale, setExportScaleState] = useState(1)
  const exportFormat = getImageExportEncodingInfo(exportEncoding).extension
  const exportName = useMemo(
    () => deriveEncodedExportFileName(sourceName, exportEncoding),
    [sourceName, exportEncoding]
  )
  const cropAspectRatio = useMemo(() => crop ? getAspectRatioValue(crop) : 1, [crop])

  const setExportFormat = useCallback((format: ImageExportEncodingFormat) => {
    setExportEncodingState((current) => normalizeImageExportEncoding({ ...current, format }))
  }, [])

  const setOptimizePng = useCallback((optimizePng: boolean) => {
    setExportEncodingState((current) => normalizeImageExportEncoding({ ...current, optimizePng }))
  }, [])

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
    exportFormat,
    setExportFormat,
    setOptimizePng,
    exportName,
    exportScale,
    setExportScale,
    updateExportDimension,
  }
}
