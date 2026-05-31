import { clampInt } from './numberUtils'

export function clampVideoClipRange(input: { duration: number; start: number; end: number }): { start: number; end: number } {
  const duration = Number.isFinite(input.duration) ? Math.max(0, input.duration) : 0
  const rawStart = Number.isFinite(input.start) ? input.start : 0
  const rawEnd = Number.isFinite(input.end) ? input.end : duration
  const start = Math.max(0, Math.min(duration, rawStart))
  const end = Math.max(0, Math.min(duration, rawEnd))
  const [from, to] = start <= end ? [start, end] : [end, start]
  return {
    start: Math.round(from * 1000) / 1000,
    end: Math.round(to * 1000) / 1000,
  }
}

export function getVideoExtractionFrameCount(start: number, end: number, fps: number): number {
  const safeFps = clampInt(fps, 1, 60)
  const duration = Math.max(0, end - start)
  return Math.max(1, Math.floor(duration * safeFps) + 1)
}

export function buildVideoFrameTimestamps(start: number, end: number, fps: number): number[] {
  const count = getVideoExtractionFrameCount(start, end, fps)
  const step = 1 / clampInt(fps, 1, 60)
  const timestamps: number[] = []
  for (let index = 0; index < count; index += 1) {
    const time = Math.min(end, start + index * step)
    timestamps.push(Math.round(time * 1000) / 1000)
  }
  if (timestamps[timestamps.length - 1] !== Math.round(end * 1000) / 1000) {
    timestamps.push(Math.round(end * 1000) / 1000)
  }
  return timestamps
}

export function getVideoExtractionLimitMessage(start: number, end: number, fps: number, limit: number): string | null {
  const frameCount = getVideoExtractionFrameCount(start, end, fps)
  if (frameCount <= limit) return null
  return `预计提取 ${frameCount} 帧，已超过单次上限 ${limit} 帧。请缩短片段或降低 FPS。`
}

export function getVideoPreviewSeekTarget(previous: [number, number], next: [number, number]): number {
  return next[0] !== previous[0] ? next[0] : next[1]
}

export function shouldReplayVideoSegment(currentTime: number, start: number, end: number): boolean {
  return end > start && currentTime >= end - 0.05
}

export function getVideoSourceUrlToRevoke(previousUrl: string | null, nextUrl: string | null): string | null {
  if (!previousUrl || previousUrl === nextUrl) return null
  return previousUrl
}
