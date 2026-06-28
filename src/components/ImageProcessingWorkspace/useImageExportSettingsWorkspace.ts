import { useCallback, useMemo, useState, type SetStateAction } from 'react'

import {
  deriveExportFileName,
  getAspectRatioValue,
  getExportScaleAfterDimensionChange,
  normalizeExportScale,
  type CropBox,
  type ExportDimension,
  type ImageExportFormat,
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
  const [exportFormat, setExportFormat] = useState<ImageExportFormat>('png')
  const [exportScale, setExportScaleState] = useState(1)
  const exportName = useMemo(
    () => deriveExportFileName(sourceName, exportFormat),
    [sourceName, exportFormat]
  )
  const cropAspectRatio = useMemo(() => crop ? getAspectRatioValue(crop) : 1, [crop])

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
    exportFormat,
    setExportFormat,
    exportName,
    exportScale,
    setExportScale,
    updateExportDimension,
  }
}
