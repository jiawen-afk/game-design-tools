import {
  minAudioClipDurationSeconds,
  type AudioClipRange,
} from './audioClipModel'

const defaultSegmentDurationSeconds = 3

export interface AudioSegmentRegion extends AudioClipRange {
  id: string
}

export interface AudioPendingSegment extends AudioClipRange {
  regionId: string
}

export interface CreateAudioSegmentRegionInput {
  id: string
  atSeconds: number
  durationSeconds: number
  existingRegions: AudioSegmentRegion[]
}

function cleanNumber(value: number) {
  return Number.isFinite(value) ? value : 0
}

function roundSeconds(value: number) {
  return Math.round(value * 1000) / 1000
}

function normalizeRange(range: AudioClipRange, durationSeconds: number): AudioClipRange {
  const duration = Math.max(0, cleanNumber(durationSeconds))
  const first = Math.max(0, Math.min(duration, cleanNumber(range.startSeconds)))
  const second = Math.max(0, Math.min(duration, cleanNumber(range.endSeconds)))
  return {
    startSeconds: roundSeconds(Math.min(first, second)),
    endSeconds: roundSeconds(Math.max(first, second)),
  }
}

function isValidRange(range: AudioClipRange) {
  return range.endSeconds - range.startSeconds >= minAudioClipDurationSeconds
}

function sortedRegions(regions: AudioSegmentRegion[]) {
  return [...regions].sort((first, second) => (
    first.startSeconds - second.startSeconds || first.endSeconds - second.endSeconds
  ))
}

export function createAudioSegmentRegion({
  id,
  atSeconds,
  durationSeconds,
  existingRegions,
}: CreateAudioSegmentRegionInput): AudioSegmentRegion | null {
  const duration = Math.max(0, cleanNumber(durationSeconds))
  const at = Math.max(0, Math.min(duration, cleanNumber(atSeconds)))
  const regions = sortedRegions(existingRegions)
  let gapStart = 0
  let gapEnd = duration

  for (const region of regions) {
    if (at >= gapStart && at <= region.startSeconds) {
      gapEnd = region.startSeconds
      break
    }
    gapStart = Math.max(gapStart, region.endSeconds)
  }

  if (at < gapStart || at > gapEnd || gapEnd - gapStart < minAudioClipDurationSeconds) {
    return null
  }

  const startSeconds = roundSeconds(Math.min(Math.max(at, gapStart), gapEnd - minAudioClipDurationSeconds))
  const endSeconds = roundSeconds(Math.min(startSeconds + defaultSegmentDurationSeconds, gapEnd))
  if (!isValidRange({ startSeconds, endSeconds })) return null
  return { id, startSeconds, endSeconds }
}

export function updateAudioSegmentRegion(
  regions: AudioSegmentRegion[],
  regionId: string,
  range: AudioClipRange,
  durationSeconds: number,
): AudioSegmentRegion[] {
  const current = regions.find((region) => region.id === regionId)
  if (!current) return regions

  const ordered = sortedRegions(regions)
  const currentIndex = ordered.findIndex((region) => region.id === regionId)
  const lowerBound = currentIndex > 0 ? ordered[currentIndex - 1].endSeconds : 0
  const upperBound = currentIndex >= 0 && currentIndex < ordered.length - 1
    ? ordered[currentIndex + 1].startSeconds
    : Math.max(0, cleanNumber(durationSeconds))

  const normalized = normalizeRange(range, durationSeconds)
  const nextRange = {
    startSeconds: roundSeconds(Math.max(lowerBound, normalized.startSeconds)),
    endSeconds: roundSeconds(Math.min(upperBound, normalized.endSeconds)),
  }
  if (!isValidRange(nextRange)) return regions

  return regions.map((region) => (
    region.id === regionId ? { ...region, ...nextRange } : region
  ))
}

export function deleteAudioSegmentRegion(
  regions: AudioSegmentRegion[],
  regionId: string,
): AudioSegmentRegion[] {
  return regions.filter((region) => region.id !== regionId)
}

function pendingFromRegion(region: AudioSegmentRegion): AudioPendingSegment {
  return {
    regionId: region.id,
    startSeconds: region.startSeconds,
    endSeconds: region.endSeconds,
  }
}

export function addPendingSegment(
  pending: AudioPendingSegment[],
  regions: AudioSegmentRegion[],
  regionId: string,
): AudioPendingSegment[] {
  if (pending.some((item) => item.regionId === regionId)) return pending
  const region = regions.find((item) => item.id === regionId)
  if (!region || !isValidRange(region)) return pending
  return [...pending, pendingFromRegion(region)]
}

export function removePendingSegment(
  pending: AudioPendingSegment[],
  regionId: string,
): AudioPendingSegment[] {
  return pending.filter((item) => item.regionId !== regionId)
}

export function reorderPendingSegments(
  pending: AudioPendingSegment[],
  fromIndex: number,
  toIndex: number,
): AudioPendingSegment[] {
  if (fromIndex === toIndex) return pending
  if (fromIndex < 0 || fromIndex >= pending.length) return pending
  const clampedToIndex = Math.max(0, Math.min(pending.length - 1, toIndex))
  const next = [...pending]
  const [item] = next.splice(fromIndex, 1)
  next.splice(clampedToIndex, 0, item)
  return next
}

export function syncPendingSegmentsWithRegions(
  pending: AudioPendingSegment[],
  regions: AudioSegmentRegion[],
): AudioPendingSegment[] {
  return pending.flatMap((item) => {
    const region = regions.find((candidate) => candidate.id === item.regionId)
    return region ? [pendingFromRegion(region)] : []
  })
}
