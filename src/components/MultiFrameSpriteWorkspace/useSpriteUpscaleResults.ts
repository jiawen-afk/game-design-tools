import { useCallback, useEffect, useRef, useState } from 'react'

import { revokeImageObjectUrl } from '../ImageProcessingWorkspace/imageProcessingPipeline'
import {
  collectStaleSpriteUpscaleResultUrls,
  type SpriteUpscaleResult,
  type SpriteUpscaleResultMap,
} from './spriteUpscaleModel'
import type { FrameItem } from './types'

interface UseSpriteUpscaleResultsParams {
  frames: FrameItem[]
}

export function useSpriteUpscaleResults({ frames }: UseSpriteUpscaleResultsParams) {
  const [resultByFrameId, setResultByFrameId] = useState<SpriteUpscaleResultMap>({})
  const resultByFrameIdRef = useRef(resultByFrameId)

  const revokeUpscaleResult = useCallback((result: SpriteUpscaleResult) => {
    revokeImageObjectUrl(result.url)
    if (result.upscaledSourceUrl) revokeImageObjectUrl(result.upscaledSourceUrl)
  }, [])

  useEffect(() => {
    resultByFrameIdRef.current = resultByFrameId
  }, [resultByFrameId])

  const clearUpscaleResults = useCallback(() => {
    setResultByFrameId((previous) => {
      Object.values(previous).forEach(revokeUpscaleResult)
      return {}
    })
  }, [revokeUpscaleResult])

  const storeUpscaleResult = useCallback((result: SpriteUpscaleResult) => {
    setResultByFrameId((previous) => {
      const oldResult = previous[result.frameId]
      if (oldResult) revokeUpscaleResult(oldResult)
      return { ...previous, [result.frameId]: result }
    })
  }, [revokeUpscaleResult])

  useEffect(() => {
    return () => {
      Object.values(resultByFrameIdRef.current).forEach(revokeUpscaleResult)
    }
  }, [revokeUpscaleResult])

  useEffect(() => {
    setResultByFrameId((previous) => {
      const staleUrls = new Set(collectStaleSpriteUpscaleResultUrls(frames, previous))
      if (staleUrls.size === 0) return previous
      staleUrls.forEach(revokeImageObjectUrl)
      return Object.fromEntries(
        Object.entries(previous).filter(([, result]) => !staleUrls.has(result.url))
      )
    })
  }, [frames])

  return {
    clearUpscaleResults,
    resultByFrameId,
    storeUpscaleResult,
  }
}
