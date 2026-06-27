export type PlaybackMode = 'loop' | 'pingpong'

export interface VisibleFrameState {
  hidden?: boolean
}

export interface PlaybackFrameState extends VisibleFrameState {
  id: string
  composedUrl?: string | null
}

export type FrameTagSelectionGesture = 'single' | 'range' | 'toggle'

export interface ApplyFrameTagSelectionInput {
  ids: string[]
  currentSelectedIds: string[]
  targetId: string
  anchorId?: string | null
  gesture: FrameTagSelectionGesture
}

export function filterVisibleFrames<T extends VisibleFrameState>(frames: T[]): T[] {
  return frames.filter((frame) => !frame.hidden)
}

export function buildPlaybackFrameIds<T extends PlaybackFrameState>(frames: T[], selectedIds?: string[]): string[] {
  const selected = selectedIds ? new Set(selectedIds) : null
  return frames
    .filter((frame) => !frame.hidden && !!frame.composedUrl && (!selected || selected.has(frame.id)))
    .map((frame) => frame.id)
}

export function countPlayableFrames<T extends PlaybackFrameState>(frames: T[]): number {
  let count = 0
  for (const frame of frames) {
    if (!frame.hidden && frame.composedUrl) count += 1
  }
  return count
}

export function filterLivePlaybackFrameIds<T extends PlaybackFrameState>(frames: T[], ids: string[]): string[] {
  const liveIds = new Set<string>()
  for (const frame of frames) {
    if (!frame.hidden && frame.composedUrl) liveIds.add(frame.id)
  }
  return ids.filter((id) => liveIds.has(id))
}

export function advancePlaybackCursor(
  currentIndex: number,
  count: number,
  playbackMode: PlaybackMode,
  direction: number
): { index: number; direction: number } {
  if (count <= 1) return { index: 0, direction: 1 }
  if (playbackMode === 'loop') return { index: (currentIndex + 1) % count, direction: 1 }

  const step = direction < 0 ? -1 : 1
  let nextIndex = currentIndex + step
  let nextDirection = step
  if (nextIndex >= count) {
    nextIndex = Math.max(0, count - 2)
    nextDirection = -1
  } else if (nextIndex < 0) {
    nextIndex = Math.min(count - 1, 1)
    nextDirection = 1
  }
  return { index: nextIndex, direction: nextDirection }
}

export function applyFrameTagSelection(input: ApplyFrameTagSelectionInput): { selectedIds: string[]; anchorId: string | null } {
  const ids = input.ids
  if (!ids.includes(input.targetId)) {
    return { selectedIds: input.currentSelectedIds.filter((id) => ids.includes(id)), anchorId: input.anchorId ?? null }
  }

  if (input.gesture === 'single') {
    return { selectedIds: [input.targetId], anchorId: input.targetId }
  }

  if (input.gesture === 'toggle') {
    const current = new Set(input.currentSelectedIds.filter((id) => ids.includes(id)))
    if (current.has(input.targetId)) current.delete(input.targetId)
    else current.add(input.targetId)
    return { selectedIds: ids.filter((id) => current.has(id)), anchorId: input.targetId }
  }

  const fallbackAnchor = input.currentSelectedIds.find((id) => ids.includes(id)) ?? input.targetId
  const anchorId = input.anchorId && ids.includes(input.anchorId) ? input.anchorId : fallbackAnchor
  const start = ids.indexOf(anchorId)
  const end = ids.indexOf(input.targetId)
  const [from, to] = start <= end ? [start, end] : [end, start]
  const current = new Set(input.currentSelectedIds.filter((id) => ids.includes(id)))
  ids.slice(from, to + 1).forEach((id) => current.add(id))
  return { selectedIds: ids.filter((id) => current.has(id)), anchorId }
}

export function batchHideSelectedFrames<T extends { id: string; hidden?: boolean }>(frames: T[], selectedIds: string[]): T[] {
  const selected = new Set(selectedIds)
  return frames.map((frame) => (selected.has(frame.id) ? { ...frame, hidden: true } : frame))
}

function normalizeFrameVisibilityStride(stride: number): number {
  return Math.min(4, Math.max(1, Math.round(Number.isFinite(stride) ? stride : 1)))
}

export function selectFramesByVisibilityStride<T>(frames: T[], stride: number): T[] {
  const safeStride = normalizeFrameVisibilityStride(stride)
  return frames.filter((_, index) => index % safeStride === 0)
}

export function applyFrameVisibilityStride<T extends { hidden?: boolean }>(frames: T[], stride: number): T[] {
  const safeStride = normalizeFrameVisibilityStride(stride)
  return frames.map((frame, index) => {
    const hidden = index % safeStride !== 0
    return frame.hidden === hidden ? frame : { ...frame, hidden }
  })
}

export function clearFrameCollection<T>(frames: T[], revokeFrame: (frame: T) => void): T[] {
  frames.forEach(revokeFrame)
  return []
}
