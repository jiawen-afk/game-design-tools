import { clampInt } from './numberUtils'

export interface MatteProcessingFrameState {
  id: string
  matteUrl?: string | null
  processing?: boolean
}

export interface BuildMatteProcessingProgressOptions {
  targetIds: Iterable<string>
  activeIds: Iterable<string>
  queuedIds: Iterable<string>
  delayedIds: Iterable<string>
}

export interface MatteProcessingProgress {
  total: number
  completed: number
  active: number
  waiting: number
  percent: number
  label: string
}

export function buildMatteProcessingProgress<T extends MatteProcessingFrameState>(
  frames: T[],
  options: BuildMatteProcessingProgressOptions
): MatteProcessingProgress | null {
  const targetIds = new Set(options.targetIds)
  if (targetIds.size === 0) return null

  const activeIds = new Set(options.activeIds)
  const queuedIds = new Set(options.queuedIds)
  const delayedIds = new Set(options.delayedIds)
  const targetFrames = frames.filter((frame) => targetIds.has(frame.id))
  const total = targetFrames.length
  if (total === 0) return null

  const active = targetFrames.filter((frame) => activeIds.has(frame.id) || Boolean(frame.processing)).length
  const completed = targetFrames.filter((frame) => (
    Boolean(frame.matteUrl) &&
    !frame.processing &&
    !activeIds.has(frame.id) &&
    !queuedIds.has(frame.id) &&
    !delayedIds.has(frame.id)
  )).length
  const waiting = Math.max(0, total - completed - active)
  const percent = Math.min(100, Math.max(0, Math.round((completed / total) * 100)))
  const parts = [`已完成 ${completed} / ${total} 帧`]
  if (active > 0) parts.push(`处理中 ${active} 帧`)
  if (waiting > 0) parts.push(`等待 ${waiting} 帧`)

  return {
    total,
    completed,
    active,
    waiting,
    percent,
    label: parts.join('，'),
  }
}

export function queueUniqueFrameId(queue: string[], id: string): string[] {
  return [...queue.filter((queuedId) => queuedId !== id), id]
}

export function dequeueNextInactiveFrameId(
  queue: string[],
  activeIds: ReadonlySet<string>
): { id: string | null; queue: string[] } {
  const queueIndex = queue.findIndex((queuedId) => !activeIds.has(queuedId))
  if (queueIndex < 0) return { id: null, queue }
  const nextQueue = [...queue]
  const [id] = nextQueue.splice(queueIndex, 1)
  return { id: id ?? null, queue: nextQueue }
}

export function resolvePipelineConcurrency(availableThreads: number | undefined, fallback = 4): number {
  if (!Number.isFinite(availableThreads) || !availableThreads || availableThreads <= 0) return fallback
  return clampInt(Math.floor(availableThreads / 2), 2, 6)
}
