import { useCallback, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  resolveImageExportTarget,
  type CropBox,
  type ImageExportFormat,
  type ImageSourceLike,
  type RectSize,
} from './imageProcessingModel'
import {
  exportProcessedImage,
  saveImageExportBlob,
} from './imageProcessingPipeline'

interface UseImageExportWorkflowOptions {
  activeImageSource: ImageSourceLike | null
  crop: CropBox | null
  exportFormat: ImageExportFormat
  exportName: string
  exportSize: RectSize
  upscaleEnabled: boolean
  upscalePreview: ImageSourceLike | null
}

export function useImageExportWorkflow({
  activeImageSource,
  crop,
  exportFormat,
  exportName,
  exportSize,
  upscaleEnabled,
  upscalePreview,
}: UseImageExportWorkflowOptions) {
  const [exporting, setExporting] = useState(false)

  const exportImage = useCallback(async () => {
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
  }, [activeImageSource, crop, exportFormat, exportName, exportSize, upscaleEnabled, upscalePreview])

  return {
    exporting,
    exportImage,
  }
}
