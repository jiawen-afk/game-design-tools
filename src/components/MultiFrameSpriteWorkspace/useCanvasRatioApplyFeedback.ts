import { useCallback, useEffect, useRef, useState } from 'react'
import { message } from 'antd'

import { getPendingComposedFrameIds, type ComposedProgressFrameState } from './layoutModel'

const CANVAS_RATIO_MESSAGE_KEY = 'canvas-ratio-apply'

export interface UseCanvasRatioApplyFeedbackParams<T extends ComposedProgressFrameState> {
  frames: T[]
}

export interface CanvasRatioApplyFeedbackViewModel {
  canvasRatioApplying: boolean
  startCanvasRatioApplyFeedback: (targetIds: string[]) => void
}

export function useCanvasRatioApplyFeedback<T extends ComposedProgressFrameState>({
  frames,
}: UseCanvasRatioApplyFeedbackParams<T>): CanvasRatioApplyFeedbackViewModel {
  const [canvasRatioApplying, setCanvasRatioApplying] = useState(false)
  const canvasRatioApplyIdsRef = useRef<string[]>([])
  const canvasRatioFallbackTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (canvasRatioFallbackTimerRef.current !== null) window.clearTimeout(canvasRatioFallbackTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!canvasRatioApplying) return
    const pendingIds = getPendingComposedFrameIds(frames, canvasRatioApplyIdsRef.current)
    if (pendingIds.length > 0) return
    if (canvasRatioFallbackTimerRef.current !== null) {
      window.clearTimeout(canvasRatioFallbackTimerRef.current)
      canvasRatioFallbackTimerRef.current = null
    }
    canvasRatioApplyIdsRef.current = []
    setCanvasRatioApplying(false)
    message.open({
      key: CANVAS_RATIO_MESSAGE_KEY,
      type: 'success',
      content: '图片宽高调整已应用完成',
      duration: 2,
    })
  }, [canvasRatioApplying, frames])

  const startCanvasRatioApplyFeedback = useCallback((targetIds: string[]) => {
    if (targetIds.length === 0) return
    canvasRatioApplyIdsRef.current = targetIds
    setCanvasRatioApplying(true)
    message.open({
      key: CANVAS_RATIO_MESSAGE_KEY,
      type: 'loading',
      content: `正在应用图片宽高调整，共 ${targetIds.length} 帧...`,
      duration: 0,
    })
    if (canvasRatioFallbackTimerRef.current !== null) window.clearTimeout(canvasRatioFallbackTimerRef.current)
    canvasRatioFallbackTimerRef.current = window.setTimeout(() => {
      canvasRatioFallbackTimerRef.current = null
      canvasRatioApplyIdsRef.current = []
      setCanvasRatioApplying(false)
      message.open({
        key: CANVAS_RATIO_MESSAGE_KEY,
        type: 'warning',
        content: '图片宽高调整仍未完成，请检查是否有帧处理失败',
        duration: 3,
      })
    }, 60000)
  }, [])

  return { canvasRatioApplying, startCanvasRatioApplyFeedback }
}
