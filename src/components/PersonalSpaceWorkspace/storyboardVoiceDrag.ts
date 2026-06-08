import type { DragEvent } from 'react'

export type StoryboardVoiceDropPlacement = 'before' | 'after'
export type DraggedStoryboardVoice = { groupId: string; assetId: string; placement?: StoryboardVoiceDropPlacement } | null
export type StoryboardVoiceDropTarget = { assetId: string; placement: StoryboardVoiceDropPlacement } | null

export function moveAssetIdAroundTarget(
  assetIds: string[],
  draggedAssetId: string,
  targetAssetId: string,
  placement: StoryboardVoiceDropPlacement,
) {
  if (draggedAssetId === targetAssetId) return assetIds
  const next = assetIds.filter((assetId) => assetId !== draggedAssetId)
  const targetIndex = next.indexOf(targetAssetId)
  if (targetIndex < 0) return assetIds
  next.splice(placement === 'before' ? targetIndex : targetIndex + 1, 0, draggedAssetId)
  return next
}

export function getStoryboardVoiceListDropTarget(event: DragEvent<HTMLElement>, draggedAssetId: string): StoryboardVoiceDropTarget {
  const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-storyboard-voice-id]'))
    .map((row) => ({ row, assetId: row.dataset.storyboardVoiceId ?? '' }))
    .filter((row) => row.assetId && row.assetId !== draggedAssetId)
  if (rows.length === 0) return null
  const beforeRow = rows.find(({ row }) => {
    const rect = row.getBoundingClientRect()
    return event.clientY < rect.top + rect.height / 2
  })
  if (beforeRow) return { assetId: beforeRow.assetId, placement: 'before' }
  return { assetId: rows[rows.length - 1].assetId, placement: 'after' }
}
