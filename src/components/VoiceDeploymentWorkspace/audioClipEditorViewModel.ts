import type { AudioClipRange, AudioClipSource } from './audioClipModel'
import type { AudioPendingSegment } from './audioSegmentModel'

export interface AudioClipEditorViewModelInput {
  source: AudioClipSource
  range: AudioClipRange
  pendingSegments: AudioPendingSegment[]
  previewPendingSegments: AudioPendingSegment[] | null
}

export function buildAudioClipEditorViewModel({
  source,
  range,
  pendingSegments,
  previewPendingSegments,
}: AudioClipEditorViewModelInput) {
  const sourceKindLabel = source.sourceKind === 'voice'
    ? '配音'
    : source.sourceKind === 'sound-effect'
      ? '音效'
      : '导入音频'
  const selectedDuration = Math.max(0, range.endSeconds - range.startSeconds)
  const pendingDuration = pendingSegments.reduce((sum, segment) => (
    sum + Math.max(0, segment.endSeconds - segment.startSeconds)
  ), 0)
  const visiblePendingSegments = previewPendingSegments ?? pendingSegments

  return {
    pendingDuration,
    selectedDuration,
    sourceKindLabel,
    visiblePendingSegments,
  }
}
