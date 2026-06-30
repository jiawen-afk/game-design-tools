import { useCallback, useEffect, useRef, useState } from 'react'
import type * as React from 'react'

import {
  applyCanvasRatioToFrameLayouts,
  applyLayoutPresetToFrames,
  coerceFrameLayoutPatch,
  computeWheelFrameResize,
} from './layoutModel'
import type { FrameItem, FrameLayout } from './types'

export interface UseLayoutFrameActionsParams {
  frames: FrameItem[]
  activeFrame: FrameItem | null
  canvasWidth: number
  canvasHeight: number
  activeRatioPercent: number
  activeRatioBasis: 'width' | 'height'
  setActiveRatioPercent: React.Dispatch<React.SetStateAction<number>>
  setActiveRatioBasis: React.Dispatch<React.SetStateAction<'width' | 'height'>>
  setFrames: React.Dispatch<React.SetStateAction<FrameItem[]>>
  updateFrame: (id: string, updater: (item: FrameItem) => FrameItem) => void
  startCanvasRatioApplyFeedback: (targetIds: string[]) => void
}

export function useLayoutFrameActions({
  frames,
  activeFrame,
  canvasWidth,
  canvasHeight,
  activeRatioPercent,
  activeRatioBasis,
  setActiveRatioPercent,
  setActiveRatioBasis,
  setFrames,
  updateFrame,
  startCanvasRatioApplyFeedback,
}: UseLayoutFrameActionsParams) {
  const [layoutWheelScalingEnabled, setLayoutWheelScalingEnabled] = useState(false)
  const layoutRafRef = useRef<number | null>(null)
  const pendingLayoutRef = useRef<{ id: string; patch: Partial<FrameLayout> } | null>(null)

  useEffect(() => {
    return () => {
      if (layoutRafRef.current !== null) window.cancelAnimationFrame(layoutRafRef.current)
    }
  }, [])

  const setLayout = useCallback((id: string, patch: Partial<FrameLayout>) => {
    const safePatch = coerceFrameLayoutPatch(patch)
    if (Object.keys(safePatch).length === 0) return
    updateFrame(id, (item) => ({ ...item, layout: { ...item.layout, ...safePatch }, composedRevision: -1 }))
  }, [updateFrame])

  const scheduleLayout = useCallback(
    (id: string, patch: Partial<FrameLayout>) => {
      pendingLayoutRef.current = { id, patch }
      if (layoutRafRef.current !== null) return
      layoutRafRef.current = window.requestAnimationFrame(() => {
        const pending = pendingLayoutRef.current
        pendingLayoutRef.current = null
        layoutRafRef.current = null
        if (pending) setLayout(pending.id, pending.patch)
      })
    },
    [setLayout]
  )

  const handleLayoutWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!activeFrame) return
      const next = computeWheelFrameResize(
        { width: activeFrame.layout.width, height: activeFrame.layout.height },
        e.deltaY,
        layoutWheelScalingEnabled,
        e.shiftKey
      )
      if (!next) return
      e.preventDefault()
      e.stopPropagation()
      setLayout(activeFrame.id, next)
    },
    [activeFrame, layoutWheelScalingEnabled, setLayout]
  )

  const applyAllCenter = useCallback(() => {
    setFrames((prev) => applyLayoutPresetToFrames(prev, { mode: 'center' }))
  }, [setFrames])

  const applyPresetSize = useCallback((mode: string) => {
    if (!['active', 'maxBoth', 'maxWidth', 'maxHeight'].includes(mode)) return
    setFrames((prev) => applyLayoutPresetToFrames(prev, {
      mode: mode as 'active' | 'maxBoth' | 'maxWidth' | 'maxHeight',
      activeFrameId: activeFrame?.id,
    }))
  }, [activeFrame?.id, setFrames])

  const applyCanvasRatio = useCallback((percent: number, basis: 'width' | 'height') => {
    const targetIds = frames.filter((item) => item.matteUrl).map((item) => item.id)
    startCanvasRatioApplyFeedback(targetIds)
    setFrames((prev) =>
      applyCanvasRatioToFrameLayouts(prev, { canvasWidth, canvasHeight, percent, basis })
    )
  }, [canvasHeight, canvasWidth, frames, setFrames, startCanvasRatioApplyFeedback])

  const applyActiveCanvasRatio = useCallback((percent: number, basis: 'width' | 'height') => {
    if (!activeFrame) return
    setFrames((prev) =>
      applyCanvasRatioToFrameLayouts(prev, { canvasWidth, canvasHeight, percent, basis, targetId: activeFrame.id })
    )
  }, [activeFrame, canvasHeight, canvasWidth, setFrames])

  const updateActiveRatio = useCallback((next: { percent?: number; basis?: 'width' | 'height' }) => {
    const percent = next.percent ?? activeRatioPercent
    const basis = next.basis ?? activeRatioBasis
    if (next.percent !== undefined) setActiveRatioPercent(next.percent)
    if (next.basis !== undefined) setActiveRatioBasis(next.basis)
    applyActiveCanvasRatio(percent, basis)
  }, [activeRatioBasis, activeRatioPercent, applyActiveCanvasRatio, setActiveRatioBasis, setActiveRatioPercent])

  return {
    layoutWheelScalingEnabled,
    setLayoutWheelScalingEnabled,
    setLayout,
    scheduleLayout,
    handleLayoutWheel,
    applyAllCenter,
    applyPresetSize,
    applyCanvasRatio,
    updateActiveRatio,
  }
}
