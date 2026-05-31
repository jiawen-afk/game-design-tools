import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { clearFrameCollection } from './playbackModel'
import { revokeFrameUrls } from './imagePipeline'
import type { FrameItem } from './types'

export function useFrameWorkspaceState() {
  const [frames, setFrames] = useState<FrameItem[]>([])
  const framesRef = useRef(frames)
  framesRef.current = frames
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const [detailPreview, setDetailPreview] = useState<{ url: string; name: string } | null>(null)
  const [detailZoom, setDetailZoom] = useState(1)
  const [dragOrderId, setDragOrderId] = useState<string | null>(null)

  useEffect(() => {
    return () => framesRef.current.forEach(revokeFrameUrls)
  }, [])

  const activeFrame = useMemo(
    () => frames.find((item) => item.id === activeId) ?? frames[0] ?? null,
    [activeId, frames]
  )
  const activeFrameIndex = activeFrame ? frames.findIndex((item) => item.id === activeFrame.id) : -1

  useEffect(() => {
    const ids = new Set(frames.map((item) => item.id))
    setSelectedFrameIds((prev) => prev.filter((id) => ids.has(id)))
    setSelectionAnchorId((prev) => (prev && ids.has(prev) ? prev : null))
  }, [frames])

  const updateFrame = useCallback((id: string, updater: (item: FrameItem) => FrameItem) => {
    setFrames((prev) => prev.map((item) => (item.id === id ? updater(item) : item)))
  }, [])

  const appendFrames = useCallback((created: FrameItem[]) => {
    setFrames((prev) => [...prev, ...created])
    setActiveId((current) => current ?? created[0]?.id ?? null)
  }, [])

  const removeFrame = useCallback((id: string) => {
    setFrames((prev) => {
      const item = prev.find((x) => x.id === id)
      if (item) revokeFrameUrls(item)
      const next = prev.filter((x) => x.id !== id)
      setActiveId((current) => (current === id ? next[0]?.id ?? null : current))
      return next
    })
  }, [])

  const clearFrames = useCallback(() => {
    setDetailPreview(null)
    setActiveId(null)
    setSelectedFrameIds([])
    setSelectionAnchorId(null)
    setFrames((prev) => clearFrameCollection(prev, revokeFrameUrls))
  }, [])

  const reorder = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return
    setFrames((prev) => {
      const from = prev.findIndex((x) => x.id === fromId)
      const to = prev.findIndex((x) => x.id === toId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved!)
      return next
    })
  }, [])

  const toggleFrameHidden = useCallback((id: string) => {
    setFrames((prev) => prev.map((item) => (item.id === id ? { ...item, hidden: !item.hidden } : item)))
  }, [])

  return {
    frames,
    setFrames,
    framesRef,
    activeId,
    setActiveId,
    activeFrame,
    activeFrameIndex,
    selectedFrameIds,
    setSelectedFrameIds,
    selectionAnchorId,
    setSelectionAnchorId,
    detailPreview,
    setDetailPreview,
    detailZoom,
    setDetailZoom,
    dragOrderId,
    setDragOrderId,
    updateFrame,
    appendFrames,
    removeFrame,
    clearFrames,
    reorder,
    toggleFrameHidden,
  }
}
