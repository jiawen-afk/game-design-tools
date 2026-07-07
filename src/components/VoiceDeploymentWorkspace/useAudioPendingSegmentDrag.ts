import { type DragEvent, type MutableRefObject, useEffect, useRef, useState } from 'react'

import {
  reorderPendingSegmentsAroundTarget,
  type AudioPendingDropPlacement,
  type AudioPendingSegment,
} from './audioSegmentModel'

type AudioPendingDropTarget = { regionId: string; placement: AudioPendingDropPlacement } | null

interface UseAudioPendingSegmentDragOptions {
  pendingSegments: AudioPendingSegment[]
  pendingSegmentsRef: MutableRefObject<AudioPendingSegment[]>
  onCommitPendingSegmentsOrder: (segments: AudioPendingSegment[]) => void
}

export function useAudioPendingSegmentDrag({
  pendingSegments,
  pendingSegmentsRef,
  onCommitPendingSegmentsOrder,
}: UseAudioPendingSegmentDragOptions) {
  const draggedPendingRegionIdRef = useRef<string | null>(null)
  const pendingDropTargetRef = useRef<AudioPendingDropTarget>(null)
  const previewPendingSegmentsRef = useRef<AudioPendingSegment[] | null>(null)
  const [draggedPendingRegionId, setDraggedPendingRegionId] = useState('')
  const [pendingDropTarget, setPendingDropTarget] = useState<AudioPendingDropTarget>(null)
  const [previewPendingSegments, setPreviewPendingSegments] = useState<AudioPendingSegment[] | null>(null)

  useEffect(() => {
    pendingDropTargetRef.current = null
    previewPendingSegmentsRef.current = null
    setPendingDropTarget(null)
    setPreviewPendingSegments(null)
  }, [pendingSegments])

  const getPendingDropTarget = (
    event: DragEvent<HTMLElement>,
    draggedRegionId: string,
  ): AudioPendingDropTarget => {
    const cards = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-audio-pending-region-id]'))
      .map((card) => ({ card, regionId: card.dataset.audioPendingRegionId ?? '' }))
      .filter((card) => card.regionId && card.regionId !== draggedRegionId)
    if (cards.length === 0) return null

    const beforeCard = cards.find(({ card }) => {
      const rect = card.getBoundingClientRect()
      if (event.clientY < rect.top + rect.height / 2) return true
      return event.clientY <= rect.bottom && event.clientX < rect.left + rect.width / 2
    })
    if (beforeCard) return { regionId: beforeCard.regionId, placement: 'before' }
    return { regionId: cards[cards.length - 1].regionId, placement: 'after' }
  }

  const previewPendingSegmentDrop = (event: DragEvent<HTMLElement>, draggedRegionId: string) => {
    const target = getPendingDropTarget(event, draggedRegionId)
    if (!target) return
    const previewSegments = reorderPendingSegmentsAroundTarget(
      pendingSegmentsRef.current,
      draggedRegionId,
      target.regionId,
      target.placement,
    )
    pendingDropTargetRef.current = target
    previewPendingSegmentsRef.current = previewSegments
    setPendingDropTarget(target)
    setPreviewPendingSegments(previewSegments)
  }

  const clearPendingDropPreview = () => {
    pendingDropTargetRef.current = null
    previewPendingSegmentsRef.current = null
    setPendingDropTarget(null)
    setPreviewPendingSegments(null)
  }

  const endPendingDrag = () => {
    draggedPendingRegionIdRef.current = null
    setDraggedPendingRegionId('')
    clearPendingDropPreview()
  }

  const handlePendingListDragOver = (event: DragEvent<HTMLElement>) => {
    const draggedRegionId = event.dataTransfer.getData('text/plain') || draggedPendingRegionIdRef.current
    if (!draggedRegionId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    previewPendingSegmentDrop(event, draggedRegionId)
  }

  const handlePendingListDragLeave = (event: DragEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    clearPendingDropPreview()
  }

  const handlePendingListDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const draggedRegionId = event.dataTransfer.getData('text/plain') || draggedPendingRegionIdRef.current
    if (draggedRegionId) {
      const target = pendingDropTargetRef.current ?? getPendingDropTarget(event, draggedRegionId)
      if (target) {
        const committedPendingSegments = previewPendingSegmentsRef.current ?? reorderPendingSegmentsAroundTarget(
          pendingSegmentsRef.current,
          draggedRegionId,
          target.regionId,
          target.placement,
        )
        pendingSegmentsRef.current = committedPendingSegments
        onCommitPendingSegmentsOrder(committedPendingSegments)
      }
    }
    endPendingDrag()
  }

  const startPendingDrag = (regionId: string, event: DragEvent<HTMLElement>) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', regionId)
    draggedPendingRegionIdRef.current = regionId
    setDraggedPendingRegionId(regionId)
  }

  return {
    draggedPendingRegionId,
    pendingDropTarget,
    previewPendingSegments,
    endPendingDrag,
    handlePendingListDragLeave,
    handlePendingListDragOver,
    handlePendingListDrop,
    startPendingDrag,
  }
}
