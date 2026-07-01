import { useEffect, type Dispatch, type SetStateAction } from 'react'

import {
  clampPreviewRect,
  getCropBoxFromPreviewRect,
  getDraggedPreviewRect,
  type CropBox,
  type ImageCropHandle,
  type ImageSourceLike,
  type Point,
  type PreviewRect,
} from './imageProcessingModel'

export interface ImageCropDragState {
  handle: ImageCropHandle
  startPointer: Point
  startPreviewRect: PreviewRect
}

export interface UseImageCropDragOptions {
  cropDrag: ImageCropDragState | null
  previewImageRect: PreviewRect | null
  activeImageSource: ImageSourceLike | null
  previewZoom: number
  minPreviewCropSize: number
  setCrop: Dispatch<SetStateAction<CropBox | null>>
  setCropDraftRect: Dispatch<SetStateAction<PreviewRect | null>>
  setCropDrag: Dispatch<SetStateAction<ImageCropDragState | null>>
}

export function useImageCropDrag({
  cropDrag,
  previewImageRect,
  activeImageSource,
  previewZoom,
  minPreviewCropSize,
  setCrop,
  setCropDraftRect,
  setCropDrag,
}: UseImageCropDragOptions) {
  useEffect(() => {
    if (!cropDrag || !previewImageRect || !activeImageSource) return
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
          minPreviewCropSize,
          event.shiftKey,
          { width: previewImageRect.width, height: previewImageRect.height }
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
      const nextCrop = getCropBoxFromPreviewRect(nextDraftRect, previewImageRect, {
        width: activeImageSource.width,
        height: activeImageSource.height,
      })
      setCrop(nextCrop)
      setCropDraftRect(null)
      setCropDrag(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [activeImageSource, cropDrag, minPreviewCropSize, previewImageRect, previewZoom, setCrop, setCropDraftRect, setCropDrag])
}
