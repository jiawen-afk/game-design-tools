import type { DragEvent } from 'react'
import { useState } from 'react'

import type { StoryboardGroup } from './personalSpaceModel'
import {
  getStoryboardVoiceListDropTarget,
  moveAssetIdAroundTarget,
  type DraggedStoryboardVoice,
  type StoryboardVoiceDropPlacement,
} from './storyboardVoiceDrag'

interface UseStoryboardVoiceDragDropParams {
  storyboardGroups: StoryboardGroup[]
  onMoveStoryboardVoice: (
    groupId: string,
    draggedAssetId: string,
    targetAssetId: string,
    placement?: StoryboardVoiceDropPlacement,
  ) => void
}

function orderedStoryboardVoiceAssetIds(group: StoryboardGroup | undefined) {
  return group ? [...group.voiceEntries].sort((a, b) => a.order - b.order).map((entry) => entry.assetId) : []
}

export function useStoryboardVoiceDragDrop({
  storyboardGroups,
  onMoveStoryboardVoice,
}: UseStoryboardVoiceDragDropParams) {
  const [draggedStoryboardVoice, setDraggedStoryboardVoice] = useState<DraggedStoryboardVoice>(null)
  const [dropTargetStoryboardVoice, setDropTargetStoryboardVoice] = useState<DraggedStoryboardVoice>(null)
  const [previewStoryboardVoiceOrders, setPreviewStoryboardVoiceOrders] = useState<Record<string, string[]>>({})

  const startStoryboardVoiceDrag = (groupId: string, assetId: string) => {
    const group = storyboardGroups.find((item) => item.id === groupId)
    setDraggedStoryboardVoice({ groupId, assetId })
    setDropTargetStoryboardVoice(null)
    setPreviewStoryboardVoiceOrders((orders) => ({
      ...orders,
      [groupId]: orderedStoryboardVoiceAssetIds(group),
    }))
  }

  const previewStoryboardVoiceDrop = (
    groupId: string,
    targetAssetId: string,
    placement: StoryboardVoiceDropPlacement,
  ) => {
    if (!draggedStoryboardVoice || draggedStoryboardVoice.groupId !== groupId) return
    setDropTargetStoryboardVoice({ groupId, assetId: targetAssetId, placement })
    setPreviewStoryboardVoiceOrders((orders) => {
      const group = storyboardGroups.find((item) => item.id === groupId)
      const baseOrder = orders[groupId] ?? orderedStoryboardVoiceAssetIds(group)
      return {
        ...orders,
        [groupId]: moveAssetIdAroundTarget(baseOrder, draggedStoryboardVoice.assetId, targetAssetId, placement),
      }
    })
  }

  const previewStoryboardVoiceListDrop = (event: DragEvent<HTMLElement>, groupId: string, draggedAssetId: string) => {
    const target = getStoryboardVoiceListDropTarget(event, draggedAssetId)
    if (!target) return
    previewStoryboardVoiceDrop(groupId, target.assetId, target.placement)
  }

  const endStoryboardVoiceDrag = () => {
    setDraggedStoryboardVoice(null)
    setDropTargetStoryboardVoice(null)
    setPreviewStoryboardVoiceOrders({})
  }

  const dropStoryboardVoiceOnList = (event: DragEvent<HTMLElement>, groupId: string) => {
    event.preventDefault()
    const draggedAssetId = event.dataTransfer.getData('text/plain')
    if (draggedAssetId) {
      const target = getStoryboardVoiceListDropTarget(event, draggedAssetId)
      if (target) onMoveStoryboardVoice(groupId, draggedAssetId, target.assetId, target.placement)
    }
    endStoryboardVoiceDrag()
  }

  const cancelStoryboardVoiceListDrop = (event: DragEvent<HTMLElement>, groupId: string) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setDropTargetStoryboardVoice((target) => (target?.groupId === groupId ? null : target))
    setPreviewStoryboardVoiceOrders((orders) => {
      if (!orders[groupId]) return orders
      const next = { ...orders }
      delete next[groupId]
      return next
    })
  }

  return {
    draggedStoryboardVoice,
    dropTargetStoryboardVoice,
    previewStoryboardVoiceOrders,
    startStoryboardVoiceDrag,
    endStoryboardVoiceDrag,
    previewStoryboardVoiceListDrop,
    cancelStoryboardVoiceListDrop,
    dropStoryboardVoiceOnList,
  }
}
