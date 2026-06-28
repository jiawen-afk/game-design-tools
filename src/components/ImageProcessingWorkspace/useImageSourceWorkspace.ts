import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react'
import { message } from 'antd'

import {
  createFullImageCrop,
  isSupportedImageFile,
  type CropBox,
} from './imageProcessingModel'
import {
  createImageDraft,
  revokeLoadedImageDraftUrl,
  type LoadedImageDraft,
} from './imageProcessingPipeline'

interface UseImageSourceWorkspaceOptions {
  draft: LoadedImageDraft | null
  setDraft: Dispatch<SetStateAction<LoadedImageDraft | null>>
  clearCropPreview: () => void
  clearProcessed: () => void
  resetPreviewTransform: () => void
  resetUpscale: (enabled?: boolean) => void
  setCrop: Dispatch<SetStateAction<CropBox | null>>
  setCropDraftRect: (value: null) => void
  setCropDrag: (value: null) => void
  setExportScale: Dispatch<SetStateAction<number>>
  setMatteEnabled: Dispatch<SetStateAction<boolean>>
}

export function useImageSourceWorkspace({
  draft,
  setDraft,
  clearCropPreview,
  clearProcessed,
  resetPreviewTransform,
  resetUpscale,
  setCrop,
  setCropDraftRect,
  setCropDrag,
  setExportScale,
  setMatteEnabled,
}: UseImageSourceWorkspaceOptions) {
  useEffect(() => {
    return () => {
      revokeLoadedImageDraftUrl(draft)
    }
  }, [draft])

  const uploadImage = async (file: File) => {
    if (!isSupportedImageFile(file)) {
      message.error('仅支持 WebP、JPG、JPEG、PNG 图片')
      return
    }
    try {
      const nextDraft = await createImageDraft(file)
      setDraft((previous) => {
        revokeLoadedImageDraftUrl(previous)
        return nextDraft
      })
      clearProcessed()
      setCrop(createFullImageCrop(nextDraft.width, nextDraft.height))
      setMatteEnabled(true)
      resetUpscale(false)
      setExportScale(1)
      setCropDraftRect(null)
      setCropDrag(null)
      resetPreviewTransform()
      message.success('图片已载入')
    } catch (error) {
      message.error(`图片读取失败：${String(error)}`)
    }
  }

  const resetWorkspace = useCallback(() => {
    setDraft((previous) => {
      revokeLoadedImageDraftUrl(previous)
      return null
    })
    clearProcessed()
    clearCropPreview()
    setCrop(null)
    setMatteEnabled(true)
    resetUpscale(false)
    setCropDraftRect(null)
    setCropDrag(null)
    setExportScale(1)
    resetPreviewTransform()
  }, [
    clearCropPreview,
    clearProcessed,
    resetPreviewTransform,
    resetUpscale,
    setCrop,
    setCropDraftRect,
    setCropDrag,
    setDraft,
    setExportScale,
    setMatteEnabled,
  ])

  return {
    resetWorkspace,
    uploadImage,
  }
}
