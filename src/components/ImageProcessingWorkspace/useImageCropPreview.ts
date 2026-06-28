import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { message } from 'antd'

import {
  fitContainedImageRect,
  getPreviewRectFromCropBox,
  MIN_IMAGE_CROP_SIZE,
  type CropBox,
  type ImageSourceLike,
  type PreviewRect,
} from './imageProcessingModel'
import {
  renderCroppedImageUrl,
  revokeProcessedImageDraftUrl,
  type ProcessedImageDraft,
} from './imageProcessingPipeline'
import { useImageCropDrag, type ImageCropDragState } from './useImageCropDrag'

interface UseImageCropPreviewOptions {
  activeImageSource: ImageSourceLike | null
  crop: CropBox | null
  previewZoom: number
  setCrop: Dispatch<SetStateAction<CropBox | null>>
}

export function useImageCropPreview(options: UseImageCropPreviewOptions) {
  const { activeImageSource, crop, previewZoom, setCrop } = options
  const [cropPreview, setCropPreview] = useState<ProcessedImageDraft | null>(null)
  const [cropPreviewSize, setCropPreviewSize] = useState({ width: 0, height: 0 })
  const [cropDraftRect, setCropDraftRect] = useState<PreviewRect | null>(null)
  const [cropDrag, setCropDrag] = useState<ImageCropDragState | null>(null)

  useEffect(() => {
    return () => {
      revokeProcessedImageDraftUrl(cropPreview)
    }
  }, [cropPreview])

  useEffect(() => {
    if (!activeImageSource || !crop) {
      setCropPreview(null)
      return
    }
    let alive = true
    void renderCroppedImageUrl(activeImageSource.url, crop)
      .then((result) => {
        if (!alive) {
          revokeProcessedImageDraftUrl(result)
          return
        }
        setCropPreview((previous) => {
          revokeProcessedImageDraftUrl(previous)
          return result
        })
      })
      .catch((error) => message.error(`裁剪预览失败：${String(error)}`))
    return () => {
      alive = false
    }
  }, [activeImageSource, crop])

  const previewImageRect = useMemo(() => {
    if (!activeImageSource || cropPreviewSize.width <= 0 || cropPreviewSize.height <= 0) return null
    return fitContainedImageRect({ width: activeImageSource.width, height: activeImageSource.height }, cropPreviewSize)
  }, [activeImageSource, cropPreviewSize.height, cropPreviewSize.width])

  const previewCropRect = useMemo(() => {
    if (!crop || !activeImageSource || !previewImageRect) return null
    return getPreviewRectFromCropBox(crop, previewImageRect, { width: activeImageSource.width, height: activeImageSource.height })
  }, [activeImageSource, crop, previewImageRect])

  const activePreviewCropRect = cropDraftRect ?? previewCropRect

  const minPreviewCropSize = useMemo(() => {
    if (!previewImageRect || !activeImageSource) return MIN_IMAGE_CROP_SIZE
    const scale = previewImageRect.width / Math.max(1, activeImageSource.width)
    return Math.max(4, MIN_IMAGE_CROP_SIZE * scale)
  }, [activeImageSource, previewImageRect])

  useImageCropDrag({
    cropDrag,
    previewImageRect,
    activeImageSource,
    previewZoom,
    minPreviewCropSize,
    setCrop,
    setCropDraftRect,
    setCropDrag,
  })

  const setCropPreviewContainerSize = useCallback((size: { width: number; height: number }) => {
    setCropPreviewSize((current) => {
      if (current.width === size.width && current.height === size.height) return current
      return size
    })
  }, [])

  const clearCropPreview = useCallback(() => {
    setCropPreview((previous) => {
      revokeProcessedImageDraftUrl(previous)
      return null
    })
  }, [])

  return {
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
  }
}
