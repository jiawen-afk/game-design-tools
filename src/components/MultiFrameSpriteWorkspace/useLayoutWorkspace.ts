import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import {
  getGuideLineEdgeStartPosition,
  normalizeGuideLinePosition,
  shouldIgnoreInitialGuideDrag,
} from './guideModel'
import {
  applyCanvasRatioToFrameLayouts,
  applyLayoutPresetToFrames,
  computeHandleResize,
  computeKeyboardOffset,
  computeWheelFrameResize,
  getPendingComposedFrameIds,
} from './layoutModel'
import { createWorkspaceId } from './imagePipeline'
import { coerceLayoutDefaults, type LayoutDefaults } from './model'
import { writeStoredLayoutDefaults } from './storage'
import type { ComposeStyle, DragState, FrameItem, FrameLayout, GuideAxis, GuideDragState, GuideLine } from './types'

const CANVAS_RATIO_MESSAGE_KEY = 'canvas-ratio-apply'

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
  const [dragState, setDragState] = useState<DragState>(null)
  const [guideLines, setGuideLines] = useState<GuideLine[]>([])
  const [selectedGuideLineId, setSelectedGuideLineId] = useState<string | null>(null)
  const [guideDragState, setGuideDragState] = useState<GuideDragState | null>(null)
  const [layoutDefaultsOpen, setLayoutDefaultsOpen] = useState(false)
  const [layoutDefaultsDraft, setLayoutDefaultsDraft] = useState<LayoutDefaults>(initialLayoutDefaults)
  const [canvasRatioPercent, setCanvasRatioPercent] = useState(initialLayoutDefaults.ratioPercent)
  const [canvasRatioBasis, setCanvasRatioBasis] = useState<'width' | 'height'>(initialLayoutDefaults.ratioBasis)
  const [canvasRatioApplying, setCanvasRatioApplying] = useState(false)
  const [activeRatioPercent, setActiveRatioPercent] = useState(initialLayoutDefaults.ratioPercent)
  const [activeRatioBasis, setActiveRatioBasis] = useState<'width' | 'height'>(initialLayoutDefaults.ratioBasis)
  const [strokeColor, setStrokeColor] = useState(initialLayoutDefaults.strokeColor)
  const [strokeWidth, setStrokeWidth] = useState(initialLayoutDefaults.strokeWidth)
  const [outlineColor, setOutlineColor] = useState(initialLayoutDefaults.outlineColor)
  const [outlineWidth, setOutlineWidth] = useState(initialLayoutDefaults.outlineWidth)
  const [layoutWheelScalingEnabled, setLayoutWheelScalingEnabled] = useState(false)
  const layoutRafRef = useRef<number | null>(null)
  const pendingLayoutRef = useRef<{ id: string; patch: Partial<FrameLayout> } | null>(null)
  const canvasRatioApplyIdsRef = useRef<string[]>([])
  const canvasRatioFallbackTimerRef = useRef<number | null>(null)
  const canvasStageRef = useRef<HTMLDivElement | null>(null)

  const composeStyle = useMemo<ComposeStyle>(
    () => ({ strokeColor, strokeWidth, outlineColor, outlineWidth }),
    [outlineColor, outlineWidth, strokeColor, strokeWidth]
  )

  useEffect(() => {
    return () => {
      if (layoutRafRef.current !== null) window.cancelAnimationFrame(layoutRafRef.current)
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

  const updateGuideLineFromPointer = useCallback(
    (id: string, axis: GuideAxis, clientX: number, clientY: number) => {
      const rect = canvasStageRef.current?.getBoundingClientRect()
      if (!rect) return
      const raw = axis === 'x'
        ? ((clientX - rect.left) / Math.max(1, rect.width)) * canvasWidth
        : ((clientY - rect.top) / Math.max(1, rect.height)) * canvasHeight
      const nextPosition = normalizeGuideLinePosition(raw, axis === 'x' ? canvasWidth : canvasHeight)
      if (nextPosition === null) {
        setGuideLines((prev) => prev.filter((line) => line.id !== id))
        setSelectedGuideLineId((selected) => (selected === id ? null : selected))
        setGuideDragState(null)
        return
      }
      setGuideLines((prev) =>
        prev.map((line) => (line.id === id ? { ...line, position: nextPosition } : line))
      )
    },
    [canvasHeight, canvasWidth]
  )

  const createGuideLine = (axis: GuideAxis, e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const id = createWorkspaceId()
    setGuideLines((prev) => [...prev, { id, axis, position: getGuideLineEdgeStartPosition() }])
    setSelectedGuideLineId(id)
    let hasEnteredCanvas = false
    const onMove = (event: PointerEvent) => {
      const rect = canvasStageRef.current?.getBoundingClientRect()
      if (!rect) return
      const raw = axis === 'x'
        ? ((event.clientX - rect.left) / Math.max(1, rect.width)) * canvasWidth
        : ((event.clientY - rect.top) / Math.max(1, rect.height)) * canvasHeight
      const max = axis === 'x' ? canvasWidth : canvasHeight
      if (shouldIgnoreInitialGuideDrag(raw, max, hasEnteredCanvas)) return
      hasEnteredCanvas = true
      updateGuideLineFromPointer(id, axis, event.clientX, event.clientY)
    }
    const onUp = () => {
      setGuideDragState(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const addGuideLine = (axis: GuideAxis) => {
    const id = createWorkspaceId()
    const position = axis === 'x' ? Math.round(canvasWidth / 2) : Math.round(canvasHeight / 2)
    setGuideLines((prev) => [...prev, { id, axis, position }])
    setSelectedGuideLineId(id)
  }

  useEffect(() => {
    if (!guideDragState) return
    const onMove = (e: PointerEvent) => {
      updateGuideLineFromPointer(guideDragState.id, guideDragState.axis, e.clientX, e.clientY)
    }
    const onUp = () => setGuideDragState(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [guideDragState, updateGuideLineFromPointer])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement
      const tag = el?.tagName?.toLowerCase()
      const editingText = tag === 'input' || tag === 'textarea' || (el instanceof HTMLElement && el.isContentEditable)
      if (selectedGuideLineId && e.key === 'Delete' && !editingText) {
        e.preventDefault()
        setGuideLines((prev) => prev.filter((line) => line.id !== selectedGuideLineId))
        setSelectedGuideLineId(null)
        return
      }
      if (!activeFrame || detailPreview) return
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (editingText) return
      e.preventDefault()
      const next = computeKeyboardOffset(
        { offsetX: activeFrame.layout.offsetX, offsetY: activeFrame.layout.offsetY },
        e.key,
        e.shiftKey
      )
      setLayout(activeFrame.id, next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeFrame, detailPreview, selectedGuideLineId, setLayout])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState) return
      const item = frames.find((x) => x.id === dragState.id)
      if (!item) return
      if (dragState.kind === 'move') {
        scheduleLayout(dragState.id, {
          offsetX: Math.round(dragState.startOffsetX + e.clientX - dragState.startX),
          offsetY: Math.round(dragState.startOffsetY + e.clientY - dragState.startY),
        })
      } else {
        const next = computeHandleResize({
          startWidth: dragState.startWidth,
          startHeight: dragState.startHeight,
          deltaX: e.clientX - dragState.startX,
          deltaY: e.clientY - dragState.startY,
          handle: dragState.handle,
          keepAspect: item.layout.keepAspect && ['nw', 'ne', 'se', 'sw'].includes(dragState.handle),
          minSize: 1,
        })
        scheduleLayout(dragState.id, next)
      }
    },
    [dragState, frames, scheduleLayout]
  )

  useEffect(() => {
    const up = () => setDragState(null)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', up)
    }
  }, [onPointerMove])

  const applyAllCenter = () => {
    setFrames((prev) => applyLayoutPresetToFrames(prev, { mode: 'center' }))
  }

  const applyPresetSize = (mode: string) => {
    if (!['active', 'maxBoth', 'maxWidth', 'maxHeight'].includes(mode)) return
    setFrames((prev) => applyLayoutPresetToFrames(prev, { mode: mode as 'active' | 'maxBoth' | 'maxWidth' | 'maxHeight', activeFrameId: activeFrame?.id }))
  }

  const applyCanvasRatio = (percent: number, basis: 'width' | 'height') => {
    const targetIds = frames.filter((item) => item.matteUrl).map((item) => item.id)
    if (targetIds.length > 0) {
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
    }
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
