import { useCallback, useEffect, useMemo, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  applyWheelZoom,
  clampPreviewRect,
  createFullImageCrop,
  deriveExportFileName,
  isSupportedImageFile,
  fitContainedImageRect,
  getDraggedPreviewRect,
  getCropBoxFromPreviewRect,
  getPreviewRectFromCropBox,
  mapPreviewPointToImagePixel,
  MIN_IMAGE_CROP_SIZE,
  type ImageCropHandle,
  type PreviewRect,
  type CropBox,
  type ImageExportFormat,
  type Point,
} from './imageProcessingModel'
import {
  applyImageMatte,
  createImageDraft,
  exportProcessedImage,
  renderCroppedImageUrl,
  sampleSourceImagePixel,
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
  const [cropMode, setCropMode] = useState(false)
  const [cropPreviewSize, setCropPreviewSize] = useState({ width: 0, height: 0 })
  const [cropDraftRect, setCropDraftRect] = useState<PreviewRect | null>(null)
  const [cropDrag, setCropDrag] = useState<{
    handle: ImageCropHandle
    startPointer: Point
    startPreviewRect: PreviewRect
  } | null>(null)
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

  const previewImageRect = useMemo(() => {
    const previewSource = processed ?? draft
    if (!previewSource || cropPreviewSize.width <= 0 || cropPreviewSize.height <= 0) return null
    return fitContainedImageRect({ width: previewSource.width, height: previewSource.height }, cropPreviewSize)
  }, [cropPreviewSize.height, cropPreviewSize.width, draft, processed])

  const previewCropRect = useMemo(() => {
    if (!crop || !processed || !previewImageRect) return null
    return getPreviewRectFromCropBox(crop, previewImageRect, { width: processed.width, height: processed.height })
  }, [crop, previewImageRect, processed])

  const activePreviewCropRect = cropDraftRect ?? previewCropRect

  const minPreviewCropSize = useMemo(() => {
    if (!previewImageRect || !processed) return MIN_IMAGE_CROP_SIZE
    const scale = previewImageRect.width / Math.max(1, processed.width)
    return Math.max(4, MIN_IMAGE_CROP_SIZE * scale)
  }, [previewImageRect, processed])

  useEffect(() => {
    if (!cropDrag || !previewImageRect || !processed) return
    const toLocalRect = (rect: PreviewRect): PreviewRect => ({
      x: rect.x - previewImageRect.x,
      y: rect.y - previewImageRect.y,
      width: rect.width,
      height: rect.height,
    })
    const toImageRect = (rect: PreviewRect): PreviewRect => ({
      x: rect.x + previewImageRect.x,
      y: rect.y + previewImageRect.y,
      width: rect.width,
      height: rect.height,
    })
    const getNextDraftRect = (event: MouseEvent) => toImageRect(
      clampPreviewRect(
        getDraggedPreviewRect(
          toLocalRect(cropDrag.startPreviewRect),
          cropDrag.handle,
          (event.clientX - cropDrag.startPointer.x) / previewZoom,
          (event.clientY - cropDrag.startPointer.y) / previewZoom,
          minPreviewCropSize
        ),
        { width: previewImageRect.width, height: previewImageRect.height },
        minPreviewCropSize
      )
    )
    const onMove = (event: MouseEvent) => {
      event.preventDefault()
      setCropDraftRect(getNextDraftRect(event))
    }
    const onUp = (event: MouseEvent) => {
      const nextDraftRect = getNextDraftRect(event)
      setCrop(getCropBoxFromPreviewRect(nextDraftRect, previewImageRect, {
        width: processed.width,
        height: processed.height,
      }))
      setCropDraftRect(null)
      setCropDrag(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [cropDrag, minPreviewCropSize, previewImageRect, previewZoom, processed])

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
      setCropDraftRect(null)
      setCropDrag(null)
      setPreviewZoom(1)
      message.success('图片已载入')
    } catch (error) {
      message.error(`图片读取失败：${String(error)}`)
    }
  }

  const updateMatte = <K extends keyof MatteParams>(key: K, value: MatteParams[K]) => {
    setMatte((current) => ({ ...current, [key]: value }))
  }

  const handleWheelZoom = useCallback((deltaY: number) => {
    setPreviewZoom((current) => applyWheelZoom(current, deltaY))
  }, [])

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
    cropMode,
    setCropMode,
    previewZoom,
    setPreviewZoom,
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
    exportName,
    processing,
    exporting,
    canExport,
    minCropSize: MIN_IMAGE_CROP_SIZE,
    uploadImage,
    updateMatte,
    handleWheelZoom,
    pickKeyColorFromSource,
    exportImage,
  }
}
