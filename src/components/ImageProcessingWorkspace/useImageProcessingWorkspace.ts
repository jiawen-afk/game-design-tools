import { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  createFullImageCrop,
  deriveExportFileName,
  isSupportedImageFile,
  MIN_IMAGE_CROP_SIZE,
  type CropBox,
  type ImageExportFormat,
} from './imageProcessingModel'
import {
  applyImageMatte,
  createImageDraft,
  exportProcessedImage,
  renderCroppedImageUrl,
  type LoadedImageDraft,
  type ProcessedImageDraft,
} from './imageProcessingPipeline'
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
  const [processed, setProcessed] = useState<ProcessedImageDraft | null>(null)
  const [crop, setCrop] = useState<CropBox | null>(null)
  const [cropPreview, setCropPreview] = useState<ProcessedImageDraft | null>(null)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [exportFormat, setExportFormat] = useState<ImageExportFormat>('png')
  const [processing, setProcessing] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    return () => {
      if (draft) URL.revokeObjectURL(draft.sourceUrl)
    }
  }, [draft])

  useEffect(() => {
    return () => {
      if (processed) URL.revokeObjectURL(processed.url)
    }
  }, [processed])

  useEffect(() => {
    return () => {
      if (cropPreview) URL.revokeObjectURL(cropPreview.url)
    }
  }, [cropPreview])

  useEffect(() => {
    if (!draft) {
      setProcessed(null)
      setCrop(null)
      setCropPreview(null)
      return
    }
    let alive = true
    setProcessing(true)
    void applyImageMatte(draft.sourceUrl, matte)
      .then((result) => {
        if (!alive) {
          URL.revokeObjectURL(result.url)
          return
        }
        setProcessed((previous) => {
          if (previous) URL.revokeObjectURL(previous.url)
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
  }, [draft, matte])

  useEffect(() => {
    if (!processed || !crop) {
      setCropPreview(null)
      return
    }
    let alive = true
    void renderCroppedImageUrl(processed.url, crop)
      .then((result) => {
        if (!alive) {
          URL.revokeObjectURL(result.url)
          return
        }
        setCropPreview((previous) => {
          if (previous) URL.revokeObjectURL(previous.url)
          return result
        })
      })
      .catch((error) => message.error(`裁剪预览失败：${String(error)}`))
    return () => {
      alive = false
    }
  }, [crop, processed])

  const canExport = Boolean(processed && crop)
  const exportName = useMemo(
    () => deriveExportFileName(draft?.sourceName ?? '', exportFormat),
    [draft?.sourceName, exportFormat]
  )

  const uploadImage = async (file: File) => {
    if (!isSupportedImageFile(file)) {
      message.error('仅支持 WebP、JPG、JPEG、PNG 图片')
      return
    }
    try {
      const nextDraft = await createImageDraft(file)
      setDraft((previous) => {
        if (previous) URL.revokeObjectURL(previous.sourceUrl)
        return nextDraft
      })
      setProcessed(null)
      setCrop(createFullImageCrop(nextDraft.width, nextDraft.height))
      setPreviewZoom(1)
      message.success('图片已载入')
    } catch (error) {
      message.error(`图片读取失败：${String(error)}`)
    }
  }

  const updateMatte = <K extends keyof MatteParams>(key: K, value: MatteParams[K]) => {
    setMatte((current) => ({ ...current, [key]: value }))
  }

  const exportImage = async () => {
    if (!processed || !crop) return
    setExporting(true)
    try {
      const blob = await exportProcessedImage(processed.url, crop, exportFormat)
      const api = getDesktopApi()
      if (api) {
        const saved = await api.saveFile(exportName, await blob.arrayBuffer())
        if (!saved) throw new Error('未选择保存位置')
      } else {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = exportName
        anchor.click()
        URL.revokeObjectURL(url)
      }
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
    processed,
    crop,
    setCrop,
    cropPreview,
    previewZoom,
    setPreviewZoom,
    exportFormat,
    setExportFormat,
    exportName,
    processing,
    exporting,
    canExport,
    minCropSize: MIN_IMAGE_CROP_SIZE,
    uploadImage,
    updateMatte,
    exportImage,
  }
}
