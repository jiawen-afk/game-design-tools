import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import {
  applyCanvasRatioToFrameLayouts,
  applyLayoutPresetToFrames,
  computeWheelFrameResize,
} from './layoutModel'
import { createWorkspaceId } from './imagePipeline'
import { coerceLayoutDefaults, type LayoutDefaults } from './model'
import { writeStoredLayoutDefaults } from './storage'
import type { ComposeStyle, DragState, FrameItem, FrameLayout, GuideAxis, GuideDragState, GuideLine } from './types'
import { useCanvasRatioApplyFeedback } from './useCanvasRatioApplyFeedback'
import { useLayoutPointerInteractions } from './useLayoutPointerInteractions'

export interface UseLayoutWorkspaceParams {
  initialLayoutDefaults: LayoutDefaults
  frames: FrameItem[]
  activeFrame: FrameItem | null
  detailPreview: { url: string; name: string } | null
  setFrames: React.Dispatch<React.SetStateAction<FrameItem[]>>
  updateFrame: (id: string, updater: (item: FrameItem) => FrameItem) => void
}

export interface LayoutWorkspaceViewModel {
  canvasWidth: number
  setCanvasWidth: React.Dispatch<React.SetStateAction<number>>
  canvasHeight: number
  setCanvasHeight: React.Dispatch<React.SetStateAction<number>>
  dragState: DragState
  setDragState: React.Dispatch<React.SetStateAction<DragState>>
  guideLines: GuideLine[]
  setGuideLines: React.Dispatch<React.SetStateAction<GuideLine[]>>
  selectedGuideLineId: string | null
  setSelectedGuideLineId: React.Dispatch<React.SetStateAction<string | null>>
  setGuideDragState: React.Dispatch<React.SetStateAction<GuideDragState | null>>
  layoutDefaultsOpen: boolean
  setLayoutDefaultsOpen: React.Dispatch<React.SetStateAction<boolean>>
  layoutDefaultsDraft: LayoutDefaults
  setLayoutDefaultsDraft: React.Dispatch<React.SetStateAction<LayoutDefaults>>
  canvasRatioPercent: number
  setCanvasRatioPercent: React.Dispatch<React.SetStateAction<number>>
  canvasRatioBasis: 'width' | 'height'
  setCanvasRatioBasis: React.Dispatch<React.SetStateAction<'width' | 'height'>>
  canvasRatioApplying: boolean
  activeRatioPercent: number
  activeRatioBasis: 'width' | 'height'
  strokeColor: string
  setStrokeColor: React.Dispatch<React.SetStateAction<string>>
  strokeWidth: number
  setStrokeWidth: React.Dispatch<React.SetStateAction<number>>
  outlineColor: string
  setOutlineColor: React.Dispatch<React.SetStateAction<string>>
  outlineWidth: number
  setOutlineWidth: React.Dispatch<React.SetStateAction<number>>
  composeStyle: ComposeStyle
  layoutWheelScalingEnabled: boolean
  setLayoutWheelScalingEnabled: React.Dispatch<React.SetStateAction<boolean>>
  canvasStageRef: React.RefObject<HTMLDivElement | null>
  setLayout: (id: string, patch: Partial<FrameLayout>) => void
  handleLayoutWheel: (e: React.WheelEvent<HTMLDivElement>) => void
  createGuideLine: (axis: GuideAxis, e: React.PointerEvent<HTMLElement>) => void
  addGuideLine: (axis: GuideAxis) => void
  applyAllCenter: () => void
  applyPresetSize: (mode: string) => void
  applyCanvasRatio: (percent: number, basis: 'width' | 'height') => void
  updateActiveRatio: (next: { percent?: number; basis?: 'width' | 'height' }) => void
  openLayoutDefaults: () => void
  saveLayoutDefaults: () => void
}

export function useLayoutWorkspace({
  initialLayoutDefaults,
  frames,
  activeFrame,
  detailPreview,
  setFrames,
  updateFrame,
}: UseLayoutWorkspaceParams): LayoutWorkspaceViewModel {
  const [canvasWidth, setCanvasWidth] = useState(initialLayoutDefaults.canvasWidth)
  const [canvasHeight, setCanvasHeight] = useState(initialLayoutDefaults.canvasHeight)
  const [guideLines, setGuideLines] = useState<GuideLine[]>([])
  const [selectedGuideLineId, setSelectedGuideLineId] = useState<string | null>(null)
  const [layoutDefaultsOpen, setLayoutDefaultsOpen] = useState(false)
  const [layoutDefaultsDraft, setLayoutDefaultsDraft] = useState<LayoutDefaults>(initialLayoutDefaults)
  const [canvasRatioPercent, setCanvasRatioPercent] = useState(initialLayoutDefaults.ratioPercent)
  const [canvasRatioBasis, setCanvasRatioBasis] = useState<'width' | 'height'>(initialLayoutDefaults.ratioBasis)
  const [activeRatioPercent, setActiveRatioPercent] = useState(initialLayoutDefaults.ratioPercent)
  const [activeRatioBasis, setActiveRatioBasis] = useState<'width' | 'height'>(initialLayoutDefaults.ratioBasis)
  const [strokeColor, setStrokeColor] = useState(initialLayoutDefaults.strokeColor)
  const [strokeWidth, setStrokeWidth] = useState(initialLayoutDefaults.strokeWidth)
  const [outlineColor, setOutlineColor] = useState(initialLayoutDefaults.outlineColor)
  const [outlineWidth, setOutlineWidth] = useState(initialLayoutDefaults.outlineWidth)
  const [layoutWheelScalingEnabled, setLayoutWheelScalingEnabled] = useState(false)
  const layoutRafRef = useRef<number | null>(null)
  const pendingLayoutRef = useRef<{ id: string; patch: Partial<FrameLayout> } | null>(null)
  const canvasStageRef = useRef<HTMLDivElement | null>(null)
  const { canvasRatioApplying, startCanvasRatioApplyFeedback } = useCanvasRatioApplyFeedback({ frames })

  const composeStyle = useMemo<ComposeStyle>(
    () => ({ strokeColor, strokeWidth, outlineColor, outlineWidth }),
    [outlineColor, outlineWidth, strokeColor, strokeWidth]
  )

  useEffect(() => {
    return () => {
      if (layoutRafRef.current !== null) window.cancelAnimationFrame(layoutRafRef.current)
    }
  }, [])

  const setLayout = useCallback((id: string, patch: Partial<FrameLayout>) => {
    updateFrame(id, (item) => ({ ...item, layout: { ...item.layout, ...patch }, composedRevision: -1 }))
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

  const addGuideLine = (axis: GuideAxis) => {
    const id = createWorkspaceId()
    const position = axis === 'x' ? Math.round(canvasWidth / 2) : Math.round(canvasHeight / 2)
    setGuideLines((prev) => [...prev, { id, axis, position }])
    setSelectedGuideLineId(id)
  }

  const {
    dragState,
    setDragState,
    setGuideDragState,
    createGuideLine,
  } = useLayoutPointerInteractions({
    frames,
    activeFrame,
    detailPreview,
    canvasWidth,
    canvasHeight,
    canvasStageRef,
    selectedGuideLineId,
    setGuideLines,
    setSelectedGuideLineId,
    setLayout,
    scheduleLayout,
  })

  const applyAllCenter = () => {
    setFrames((prev) => applyLayoutPresetToFrames(prev, { mode: 'center' }))
  }

  const applyPresetSize = (mode: string) => {
    if (!['active', 'maxBoth', 'maxWidth', 'maxHeight'].includes(mode)) return
    setFrames((prev) => applyLayoutPresetToFrames(prev, { mode: mode as 'active' | 'maxBoth' | 'maxWidth' | 'maxHeight', activeFrameId: activeFrame?.id }))
  }

  const applyCanvasRatio = (percent: number, basis: 'width' | 'height') => {
    const targetIds = frames.filter((item) => item.matteUrl).map((item) => item.id)
    startCanvasRatioApplyFeedback(targetIds)
    setFrames((prev) =>
      applyCanvasRatioToFrameLayouts(prev, { canvasWidth, canvasHeight, percent, basis })
    )
  }

  const applyActiveCanvasRatio = (percent: number, basis: 'width' | 'height') => {
    if (!activeFrame) return
    setFrames((prev) =>
      applyCanvasRatioToFrameLayouts(prev, { canvasWidth, canvasHeight, percent, basis, targetId: activeFrame.id })
    )
  }

  const updateActiveRatio = (next: { percent?: number; basis?: 'width' | 'height' }) => {
    const percent = next.percent ?? activeRatioPercent
    const basis = next.basis ?? activeRatioBasis
    if (next.percent !== undefined) setActiveRatioPercent(next.percent)
    if (next.basis !== undefined) setActiveRatioBasis(next.basis)
    applyActiveCanvasRatio(percent, basis)
  }

  const openLayoutDefaults = () => {
    setLayoutDefaultsDraft(coerceLayoutDefaults({
      canvasWidth,
      canvasHeight,
      ratioPercent: canvasRatioPercent,
      ratioBasis: canvasRatioBasis,
      strokeColor,
      strokeWidth,
      outlineColor,
      outlineWidth,
    }))
    setLayoutDefaultsOpen(true)
  }

  const saveLayoutDefaults = () => {
    const next = coerceLayoutDefaults(layoutDefaultsDraft)
    setCanvasWidth(next.canvasWidth)
    setCanvasHeight(next.canvasHeight)
    setCanvasRatioPercent(next.ratioPercent)
    setCanvasRatioBasis(next.ratioBasis)
    setActiveRatioPercent(next.ratioPercent)
    setActiveRatioBasis(next.ratioBasis)
    setStrokeColor(next.strokeColor)
    setStrokeWidth(next.strokeWidth)
    setOutlineColor(next.outlineColor)
    setOutlineWidth(next.outlineWidth)
    try {
      writeStoredLayoutDefaults(next)
    } catch {
      // 本地存储不可用时仍保留本次会话设置
    }
    setLayoutDefaultsOpen(false)
    message.success('已保存公共参数配置')
  }

  return {
    canvasWidth,
    setCanvasWidth,
    canvasHeight,
    setCanvasHeight,
    dragState,
    setDragState,
    guideLines,
    setGuideLines,
    selectedGuideLineId,
    setSelectedGuideLineId,
    setGuideDragState,
    layoutDefaultsOpen,
    setLayoutDefaultsOpen,
    layoutDefaultsDraft,
    setLayoutDefaultsDraft,
    canvasRatioPercent,
    setCanvasRatioPercent,
    canvasRatioBasis,
    setCanvasRatioBasis,
    canvasRatioApplying,
    activeRatioPercent,
    activeRatioBasis,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    outlineColor,
    setOutlineColor,
    outlineWidth,
    setOutlineWidth,
    composeStyle,
    layoutWheelScalingEnabled,
    setLayoutWheelScalingEnabled,
    canvasStageRef,
    setLayout,
    handleLayoutWheel,
    createGuideLine,
    addGuideLine,
    applyAllCenter,
    applyPresetSize,
    applyCanvasRatio,
    updateActiveRatio,
    openLayoutDefaults,
    saveLayoutDefaults,
  }
}
