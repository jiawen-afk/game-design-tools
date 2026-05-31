import { useCallback, useEffect, useMemo, useState } from 'react'
import { message } from 'antd'

import {
  advancePlaybackCursor,
  applyFrameTagSelection,
  batchHideSelectedFrames,
  buildPlaybackFrameIds,
  countPlayableFrames,
  filterLivePlaybackFrameIds,
  filterVisibleFrames,
  type PlaybackMode,
} from './playbackModel'
import type { FrameItem } from './types'

export interface UsePlaybackWorkspaceParams {
  frames: FrameItem[]
  framesRef: React.MutableRefObject<FrameItem[]>
  selectedFrameIds: string[]
  selectionAnchorId: string | null
  dragOrderId: string | null
  setFrames: React.Dispatch<React.SetStateAction<FrameItem[]>>
  setSelectedFrameIds: React.Dispatch<React.SetStateAction<string[]>>
  setSelectionAnchorId: React.Dispatch<React.SetStateAction<string | null>>
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>
  setDragOrderId: React.Dispatch<React.SetStateAction<string | null>>
  reorder: (fromId: string, toId: string) => void
  toggleFrameHidden: (id: string) => void
}

export type PlaybackWorkspaceViewModel = ReturnType<typeof usePlaybackWorkspace>

export function usePlaybackWorkspace({
  frames,
  framesRef,
  selectedFrameIds,
  selectionAnchorId,
  dragOrderId,
  setFrames,
  setSelectedFrameIds,
  setSelectionAnchorId,
  setActiveId,
  setDragOrderId,
  reorder,
  toggleFrameHidden,
}: UsePlaybackWorkspaceParams) {
  const [fps, setFps] = useState(12)
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('loop')
  const [playing, setPlaying] = useState(false)
  const [playIndex, setPlayIndex] = useState(0)
  const [playDirection, setPlayDirection] = useState(1)
  const [playbackFrameIds, setPlaybackFrameIds] = useState<string[]>([])

  useEffect(() => {
    if (!playing || countPlayableFrames(framesRef.current) === 0) return
    const ms = 1000 / Math.max(1, fps)
    const timer = window.setInterval(() => {
      setPlayIndex((idx) => {
        const ids = playbackFrameIds.length > 0
          ? playbackFrameIds
          : buildPlaybackFrameIds(framesRef.current)
        const liveIds = filterLivePlaybackFrameIds(framesRef.current, ids)
        const next = advancePlaybackCursor(idx, liveIds.length, playbackMode, playDirection)
        setPlayDirection(next.direction)
        return next.index
      })
    }, ms)
    return () => window.clearInterval(timer)
  }, [fps, framesRef, playDirection, playbackFrameIds, playbackMode, playing])

  const visibleFrames = useMemo(() => filterVisibleFrames(frames), [frames])
  const composedFrames = useMemo(() => visibleFrames.filter((item) => item.composedUrl), [visibleFrames])
  const frameById = useMemo(() => new Map(frames.map((item) => [item.id, item])), [frames])
  const selectedFrameIdSet = useMemo(() => new Set(selectedFrameIds), [selectedFrameIds])
  const playbackFrameIdSet = useMemo(() => new Set(playbackFrameIds), [playbackFrameIds])
  const playbackFrames = useMemo(
    () => (playbackFrameIds.length > 0
      ? playbackFrameIds
          .map((id) => frameById.get(id) ?? null)
          .filter((item): item is FrameItem => !!item?.composedUrl)
      : composedFrames),
    [composedFrames, frameById, playbackFrameIds]
  )
  const previewFrame = playbackFrames[Math.min(playIndex, Math.max(0, playbackFrames.length - 1))]

  const selectPreviewFrame = useCallback((item: FrameItem) => {
    const visibleIndex = playbackFrames.findIndex((frame) => frame.id === item.id)
    if (visibleIndex >= 0) setPlayIndex(visibleIndex)
  }, [playbackFrames])

  const selectFrameTag = useCallback((item: FrameItem, e: React.MouseEvent<HTMLDivElement>) => {
    const result = applyFrameTagSelection({
      ids: frames.map((frame) => frame.id),
      currentSelectedIds: selectedFrameIds,
      targetId: item.id,
      anchorId: selectionAnchorId,
      gesture: e.shiftKey ? 'range' : e.altKey ? 'toggle' : 'single',
    })
    setSelectedFrameIds(result.selectedIds)
    setSelectionAnchorId(result.anchorId)
    setActiveId(item.id)
    if (!playing) selectPreviewFrame(item)
  }, [frames, playing, selectPreviewFrame, selectedFrameIds, selectionAnchorId, setActiveId, setSelectedFrameIds, setSelectionAnchorId])

  const startPlayback = useCallback((ids: string[], emptyMessage: string) => {
    if (ids.length === 0) {
      message.warning(emptyMessage)
      return
    }
    setPlaybackFrameIds(ids)
    setPlayIndex(0)
    setPlayDirection(1)
    setPlaying(true)
  }, [])

  const startAllPlayback = useCallback(() => {
    startPlayback(buildPlaybackFrameIds(frames), '没有可播放的已处理图片')
  }, [frames, startPlayback])

  const startSelectedPlayback = useCallback(() => {
    startPlayback(buildPlaybackFrameIds(frames, selectedFrameIds), '请先选择已处理的图片')
  }, [frames, selectedFrameIds, startPlayback])

  const batchHideSelected = useCallback(() => {
    if (selectedFrameIds.length === 0) return
    setFrames((prev) => batchHideSelectedFrames(prev, selectedFrameIds))
    setSelectedFrameIds([])
    setSelectionAnchorId(null)
    setPlaying(false)
  }, [selectedFrameIds, setFrames, setSelectedFrameIds, setSelectionAnchorId])

  const handlePlaybackRowDragStart = useCallback((id: string) => {
    setDragOrderId(id)
  }, [setDragOrderId])

  const handlePlaybackRowDrop = useCallback((id: string) => {
    if (dragOrderId) reorder(dragOrderId, id)
    setDragOrderId(null)
  }, [dragOrderId, reorder, setDragOrderId])

  const handlePlaybackRowToggleHidden = useCallback((id: string, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    toggleFrameHidden(id)
    setPlaying(false)
  }, [toggleFrameHidden])

  useEffect(() => {
    if (playbackFrames.length === 0) {
      if (playIndex !== 0) setPlayIndex(0)
      return
    }
    if (playIndex >= playbackFrames.length) setPlayIndex(playbackFrames.length - 1)
  }, [playbackFrames.length, playIndex])

  return {
    fps,
    setFps,
    playbackMode,
    setPlaybackMode,
    playing,
    setPlaying,
    playIndex,
    setPlayIndex,
    playbackFrameIds,
    setPlaybackFrameIds,
    visibleFrames,
    selectedFrameIdSet,
    playbackFrameIdSet,
    playbackFrames,
    previewFrame,
    startAllPlayback,
    startSelectedPlayback,
    batchHideSelected,
    handlePlaybackRowDragStart,
    handlePlaybackRowDrop,
    handlePlaybackRowToggleHidden,
    selectFrameTag,
  }
}
