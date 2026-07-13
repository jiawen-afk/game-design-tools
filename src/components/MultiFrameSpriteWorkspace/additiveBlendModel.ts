export type AdditiveTargetFrameMode = 'current' | 'group' | 'custom'

export interface AdditiveFrameRangeParseResult {
  frameNumbers: number[]
  invalidTokens: string[]
}

export interface AdditiveTargetFrameState {
  id: string
}

export interface AdditiveTargetFrameInput<T extends AdditiveTargetFrameState = AdditiveTargetFrameState> {
  mode: AdditiveTargetFrameMode
  frames: T[]
  currentFrameId: string | null
  customSelectedFrameIds?: string[]
  customRangeInput?: string
}

export interface AdditiveTargetFrameResult {
  frameIds: string[]
  invalidTokens: string[]
  canApply: boolean
}

export interface AdditivePixelInput {
  r: number
  g: number
  b: number
  a: number
  masked: boolean
  threshold: number
  strength: number
}

export interface AdditivePixelOutput {
  r: number
  g: number
  b: number
  a: number
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function clampByte(value: number): number {
  return Math.round(clampNumber(value, 0, 255))
}

function clampFrameNumber(value: number, frameCount: number): number {
  return Math.min(frameCount, Math.max(1, value))
}

export function parseFrameRangeSelection(input: string, frameCount: number): AdditiveFrameRangeParseResult {
  const validFrameCount = Math.max(0, Math.floor(frameCount))
  if (validFrameCount <= 0) return { frameNumbers: [], invalidTokens: [] }

  const selected = new Set<number>()
  const invalidTokens: string[] = []
  const tokens = input
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)

  tokens.forEach((token) => {
    const rangeMatch = /^(?<start>\d+)\s*-\s*(?<end>\d+)$/.exec(token)
    if (rangeMatch?.groups) {
      const start = Number(rangeMatch.groups.start)
      const end = Number(rangeMatch.groups.end)
      if (start > end) {
        invalidTokens.push(token)
        return
      }
      const clampedStart = clampFrameNumber(start, validFrameCount)
      const clampedEnd = clampFrameNumber(end, validFrameCount)
      for (let frameNumber = clampedStart; frameNumber <= clampedEnd; frameNumber += 1) {
        selected.add(frameNumber)
      }
      return
    }

    if (/^\d+$/.test(token)) {
      selected.add(clampFrameNumber(Number(token), validFrameCount))
      return
    }

    invalidTokens.push(token)
  })

  return {
    frameNumbers: Array.from(selected).sort((a, b) => a - b),
    invalidTokens,
  }
}

export function resolveAdditiveTargetFrameIds({
  mode,
  frames,
  currentFrameId,
  customSelectedFrameIds = [],
  customRangeInput = '',
}: AdditiveTargetFrameInput): AdditiveTargetFrameResult {
  const frameIds = frames.map((frame) => frame.id)
  let selectedIds = new Set<string>()
  let invalidTokens: string[] = []

  if (mode === 'current') {
    if (currentFrameId && frameIds.includes(currentFrameId)) {
      selectedIds.add(currentFrameId)
    }
  } else if (mode === 'group') {
    selectedIds = new Set(frameIds)
  } else {
    const selectedInputIds = new Set(customSelectedFrameIds)
    selectedIds = new Set(frameIds.filter((frameId) => selectedInputIds.has(frameId)))

    const rangeResult = parseFrameRangeSelection(customRangeInput, frameIds.length)
    invalidTokens = rangeResult.invalidTokens
    rangeResult.frameNumbers.forEach((frameNumber) => {
      const frameId = frameIds[frameNumber - 1]
      if (frameId) selectedIds.add(frameId)
    })
  }

  const resolvedFrameIds = frameIds.filter((frameId) => selectedIds.has(frameId))
  return {
    frameIds: resolvedFrameIds,
    invalidTokens,
    canApply: resolvedFrameIds.length > 0,
  }
}

export function computeAdditiveBlackToAlphaPixel({
  r,
  g,
  b,
  a,
  masked,
  threshold,
  strength,
}: AdditivePixelInput): AdditivePixelOutput {
  const source = {
    r: clampByte(r),
    g: clampByte(g),
    b: clampByte(b),
    a: clampByte(a),
  }
  if (!masked || source.a === 0) return source

  const normalizedThreshold = clampNumber(threshold, 0, 1)
  const normalizedStrength = clampNumber(strength, 0, 1)
  if (normalizedThreshold <= 0 || normalizedStrength <= 0) return source

  const brightness = Math.max(source.r, source.g, source.b) / 255
  const blackAlphaFactor = clampNumber(brightness / normalizedThreshold, 0, 1)
  const alphaFactor = 1 - normalizedStrength + normalizedStrength * blackAlphaFactor
  const nextAlpha = clampByte(source.a * alphaFactor)

  if (alphaFactor <= 0) return { ...source, a: 0 }

  return {
    r: clampByte(source.r / alphaFactor),
    g: clampByte(source.g / alphaFactor),
    b: clampByte(source.b / alphaFactor),
    a: nextAlpha,
  }
}
