import { useCallback, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  getImageExportEncodingInfo,
  resolveImageExportTarget,
  type CropBox,
  type ImageExportEncodingSettings,
  type ImageExportFormat,
  type ImageSourceLike,
  type RectSize,
} from './imageProcessingModel'
import {
  encodeImageExportBlob,
  exportProcessedImage,
  saveImageExportBlob,
} from './imageProcessingPipeline'

interface UseImageExportWorkflowOptions {
  activeImageSource: ImageSourceLike | null
  crop: CropBox | null
  exportFormat: ImageExportFormat
  exportEncoding: ImageExportEncodingSettings
  exportName: string
  exportSize: RectSize
  upscaleEnabled: boolean
  upscalePreview: ImageSourceLike | null
}

export function useImageExportWorkflow({
  activeImageSource,
  crop,
  exportFormat,
  exportEncoding,
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
      const encodingInfo = getImageExportEncodingInfo(exportEncoding)
      const renderFormat = encodingInfo.requiresDesktopEncoding ? 'png' : exportFormat
      const exportBlob = await exportProcessedImage(exportTarget.sourceUrl, exportTarget.crop, renderFormat, exportSize)
      const desktopApi = getDesktopApi()
      const encoded = await encodeImageExportBlob(exportName, exportBlob, exportEncoding, desktopApi)
      await saveImageExportBlob(encoded.fileName, encoded.blob, desktopApi)
      message.success('图片已导出')
    } catch (error) {
      message.error(`导出失败：${String(error)}`)
    } finally {
      setExporting(false)
    }
  }, [activeImageSource, crop, exportEncoding, exportFormat, exportName, exportSize, upscaleEnabled, upscalePreview])

  return {
    exporting,
    exportImage,
  }
}
