import { useCallback, useEffect, useState } from 'react'
import type * as React from 'react'

import {
  getGuideLineEdgeStartPosition,
  normalizeGuideLinePosition,
  shouldIgnoreInitialGuideDrag,
} from './guideModel'
import {
  computeHandleResize,
  computeKeyboardOffset,
} from './layoutModel'
import { createWorkspaceId } from './imagePipeline'
import type { DragState, FrameItem, FrameLayout, GuideAxis, GuideDragState, GuideLine } from './types'

export interface UseLayoutPointerInteractionsParams {
  frames: FrameItem[]
  activeFrame: FrameItem | null
  detailPreview: { url: string; name: string } | null
  canvasWidth: number
  canvasHeight: number
  canvasStageRef: React.RefObject<HTMLDivElement | null>
  selectedGuideLineId: string | null
  setGuideLines: React.Dispatch<React.SetStateAction<GuideLine[]>>
  setSelectedGuideLineId: React.Dispatch<React.SetStateAction<string | null>>
  setLayout: (id: string, patch: Partial<FrameLayout>) => void
  scheduleLayout: (id: string, patch: Partial<FrameLayout>) => void
}

export function useLayoutPointerInteractions({
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
}: UseLayoutPointerInteractionsParams) {
  const [dragState, setDragState] = useState<DragState>(null)
  const [guideDragState, setGuideDragState] = useState<GuideDragState | null>(null)

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
    [canvasHeight, canvasStageRef, canvasWidth, setGuideLines, setSelectedGuideLineId]
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
  }, [activeFrame, detailPreview, selectedGuideLineId, setGuideLines, setLayout, setSelectedGuideLineId])

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

  return {
    dragState,
    setDragState,
    setGuideDragState,
    createGuideLine,
  }
}
