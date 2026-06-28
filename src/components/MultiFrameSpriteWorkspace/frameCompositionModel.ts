export interface ComposedFrameState {
  id: string
  matteRevision: number
  composedUrl: string | null
  composedRevision?: number
}

export interface ComposedProgressFrameState {
  id: string
  matteUrl: string | null
  matteRevision: number
  composedRevision?: number
}

export interface ApplyComposedFrameUrlOptions {
  id: string
  matteRevision: number
  url: string
  revoke: (url: string) => void
}

export function applyComposedFrameUrl<T extends ComposedFrameState>(
  frames: T[],
  options: ApplyComposedFrameUrlOptions
): T[] {
  let applied = false
  const next = frames.map((frame) => {
    if (frame.id !== options.id) return frame
    if (frame.matteRevision !== options.matteRevision) return frame
    applied = true
    if (frame.composedUrl) options.revoke(frame.composedUrl)
    return {
      ...frame,
      composedUrl: options.url,
      composedRevision: options.matteRevision,
    }
  })
  if (!applied) options.revoke(options.url)
  return next as T[]
}

export function getPendingComposedFrameIds<T extends ComposedProgressFrameState>(
  frames: T[],
  targetIds: string[]
): string[] {
  if (targetIds.length === 0) return []
  const targets = new Set(targetIds)
  return frames
    .filter((frame) => (
      targets.has(frame.id) &&
      Boolean(frame.matteUrl) &&
      frame.composedRevision !== frame.matteRevision
    ))
    .map((frame) => frame.id)
}
