import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { message } from 'antd'

import { createFullImageCrop, type CropBox } from './imageProcessingModel'
import {
  applyImageMatte,
  revokeProcessedImageDraftUrl,
  type LoadedImageDraft,
  type ProcessedImageDraft,
} from './imageProcessingPipeline'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'

export interface UseImageMatteProcessingOptions {
  draft: LoadedImageDraft | null
  matte: MatteParams
  matteEnabled: boolean
  setCrop: Dispatch<SetStateAction<CropBox | null>>
}

export function useImageMatteProcessing({
  draft,
  matte,
  matteEnabled,
  setCrop,
}: UseImageMatteProcessingOptions) {
  const [processed, setProcessed] = useState<ProcessedImageDraft | null>(null)
  const [processing, setProcessing] = useState(false)

  const clearProcessed = useCallback(() => {
    setProcessed((previous) => {
      revokeProcessedImageDraftUrl(previous)
      return null
    })
  }, [])

  useEffect(() => {
    return () => {
      revokeProcessedImageDraftUrl(processed)
    }
  }, [processed])

  useEffect(() => {
    if (!draft) {
      clearProcessed()
      setProcessing(false)
      setCrop(null)
      return
    }
    if (!matteEnabled) {
      clearProcessed()
      setProcessing(false)
      setCrop((current) => current ?? createFullImageCrop(draft.width, draft.height))
      return
    }
    let alive = true
    setProcessing(true)
    void applyImageMatte(draft.sourceUrl, matte)
      .then((result) => {
        if (!alive) {
          revokeProcessedImageDraftUrl(result)
          return
        }
        setProcessed((previous) => {
          revokeProcessedImageDraftUrl(previous)
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
  }, [clearProcessed, draft, matte, matteEnabled, setCrop])

  return {
    processed,
    processing,
    clearProcessed,
  }
}
