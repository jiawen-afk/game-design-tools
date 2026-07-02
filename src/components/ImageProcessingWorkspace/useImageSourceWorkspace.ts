import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { message } from 'antd'

import {
  createFullImageCrop,
  isSupportedImageFile,
  mapCropBoxToImageSize,
  type CropBox,
} from './imageProcessingModel'
import {
  createImageDraft,
  revokeLoadedImageDraftUrl,
  type LoadedImageDraft,
} from './imageProcessingPipeline'

export interface ImageProcessingBatchItem {
  id: string
  draft: LoadedImageDraft
}

interface UseImageSourceWorkspaceOptions {
  draft: LoadedImageDraft | null
  setDraft: Dispatch<SetStateAction<LoadedImageDraft | null>>
  batchImages: ImageProcessingBatchItem[]
  setBatchImages: Dispatch<SetStateAction<ImageProcessingBatchItem[]>>
  activeBatchImageId: string | null
  setActiveBatchImageId: Dispatch<SetStateAction<string | null>>
  clearCropPreview: () => void
  clearProcessed: () => void
  resetPreviewTransform: () => void
  resetUpscale: (enabled?: boolean) => void
  clearUpscalePreview: () => void
  setUpscaleCompareEnabled: Dispatch<SetStateAction<boolean>>
  crop: CropBox | null
  setCrop: Dispatch<SetStateAction<CropBox | null>>
  setCropDraftRect: (value: null) => void
  setCropDrag: (value: null) => void
  setExportScale: Dispatch<SetStateAction<number>>
  setMatteEnabled: Dispatch<SetStateAction<boolean>>
}

export function useImageSourceWorkspace({
  draft,
  setDraft,
  batchImages,
  setBatchImages,
  activeBatchImageId,
  setActiveBatchImageId,
  clearCropPreview,
  clearProcessed,
  resetPreviewTransform,
  resetUpscale,
  clearUpscalePreview,
  setUpscaleCompareEnabled,
  crop,
  setCrop,
  setCropDraftRect,
  setCropDrag,
  setExportScale,
  setMatteEnabled,
}: UseImageSourceWorkspaceOptions) {
  const batchImagesRef = useRef(batchImages)
  batchImagesRef.current = batchImages

  useEffect(() => {
    return () => {
      for (const item of batchImagesRef.current) {
        revokeLoadedImageDraftUrl(item.draft)
      }
    }
  }, [])

  const clearActiveProcessingState = useCallback((resetUpscaleEnabled: boolean) => {
    clearProcessed()
    clearCropPreview()
    if (resetUpscaleEnabled) {
      resetUpscale(false)
      setUpscaleCompareEnabled(false)
    } else {
      clearUpscalePreview()
    }
    setCropDraftRect(null)
    setCropDrag(null)
    resetPreviewTransform()
  }, [
    clearCropPreview,
    clearProcessed,
    clearUpscalePreview,
    resetPreviewTransform,
    resetUpscale,
    setCropDraftRect,
    setCropDrag,
    setUpscaleCompareEnabled,
  ])

  const createBatchItems = async (files: File[]) => {
    const created: ImageProcessingBatchItem[] = []
    for (const file of files) {
      if (!isSupportedImageFile(file)) {
        message.error(`仅支持 WebP、JPG、JPEG、PNG 图片：${file.name}`)
        continue
      }
      try {
        const draftItem = await createImageDraft(file)
        created.push({
          id: `${Date.now()}-${created.length}-${draftItem.sourceName}`,
          draft: draftItem,
        })
      } catch (error) {
        message.error(`图片读取失败：${String(error)}`)
      }
    }
    return created
  }

  const uploadImages = async (files: File[]) => {
    const nextItems = await createBatchItems(files)
    if (nextItems.length === 0) {
      message.error('仅支持 WebP、JPG、JPEG、PNG 图片')
      return
    }
    setBatchImages((current) => [...current, ...nextItems])
    if (!draft || !activeBatchImageId) {
      const first = nextItems[0]!
      setDraft(first.draft)
      setActiveBatchImageId(first.id)
      setCrop(createFullImageCrop(first.draft.width, first.draft.height))
      setMatteEnabled(true)
      setExportScale(1)
      clearActiveProcessingState(true)
    }
    message.success(nextItems.length === 1 ? '图片已载入' : `已载入 ${nextItems.length} 张图片`)
  }

  const uploadImage = (file: File) => uploadImages([file])

  const selectBatchImage = useCallback((id: string) => {
    if (id === activeBatchImageId) return
    const target = batchImagesRef.current.find((item) => item.id === id)
    if (!target) return
    const previousDraft = draft
    setDraft(target.draft)
    setActiveBatchImageId(id)
    setCrop((currentCrop) => {
      if (currentCrop && previousDraft) {
        return mapCropBoxToImageSize(
          currentCrop,
          { width: previousDraft.width, height: previousDraft.height },
          { width: target.draft.width, height: target.draft.height },
        )
      }
      return createFullImageCrop(target.draft.width, target.draft.height)
    })
    clearActiveProcessingState(false)
  }, [activeBatchImageId, clearActiveProcessingState, draft, setActiveBatchImageId, setCrop, setDraft])

  const resetWorkspace = useCallback(() => {
    for (const item of batchImagesRef.current) {
      revokeLoadedImageDraftUrl(item.draft)
    }
    setBatchImages([])
    setActiveBatchImageId(null)
    setDraft(null)
    clearProcessed()
    clearCropPreview()
    setCrop(null)
    setMatteEnabled(true)
    resetUpscale(false)
    setUpscaleCompareEnabled(false)
    setCropDraftRect(null)
    setCropDrag(null)
    setExportScale(1)
    resetPreviewTransform()
  }, [
    clearCropPreview,
    clearProcessed,
    resetPreviewTransform,
    resetUpscale,
    setActiveBatchImageId,
    setBatchImages,
    setCrop,
    setCropDraftRect,
    setCropDrag,
    setDraft,
    setExportScale,
    setMatteEnabled,
    setUpscaleCompareEnabled,
  ])

  return {
    batchImages,
    activeBatchImageId,
    resetWorkspace,
    selectBatchImage,
    uploadImage,
    uploadImages,
  }
}
