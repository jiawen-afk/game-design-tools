import { clampInt } from './numberUtils'

export type SpillColorMode = 'key' | 'green' | 'blue' | 'magenta' | 'custom'

export interface MatteDefaults {
  tolerance: number
  smoothness: number
  spill: number
  erosion: number
  spillColorMode: SpillColorMode
  customSpillHex: string
}

export interface MatteParamsState extends MatteDefaults {
  keyColor: [number, number, number]
}

export interface MatteFrameState {
  id: string
  matte: MatteParamsState
}

export interface ApplyMatteParamsToFollowingFramesResult<T> {
  frames: T[]
  recomputeIds: string[]
}

export function queueUniqueFrameId(queue: string[], id: string): string[] {
  return [...queue.filter((queuedId) => queuedId !== id), id]
}

export function resolvePipelineConcurrency(availableThreads: number | undefined, fallback = 4): number {
  if (!Number.isFinite(availableThreads) || !availableThreads || availableThreads <= 0) return fallback
  return clampInt(Math.floor(availableThreads / 2), 2, 6)
}

function cloneMatteParams(matte: MatteParamsState): MatteParamsState {
  return {
    ...matte,
    keyColor: [...matte.keyColor] as [number, number, number],
  }
}

export function applyMatteParamsToFollowingFrames<T extends MatteFrameState>(
  frames: T[],
  targetId: string
): ApplyMatteParamsToFollowingFramesResult<T> {
  const targetIndex = frames.findIndex((frame) => frame.id === targetId)
  if (targetIndex < 0 || targetIndex >= frames.length - 1) {
    return { frames, recomputeIds: [] }
  }

  const source = frames[targetIndex]
  const recomputeIds: string[] = []
  const next = frames.map((frame, index) => {
    if (index <= targetIndex) return frame
    recomputeIds.push(frame.id)
    return {
      ...frame,
      matte: cloneMatteParams(source.matte),
    }
  })

  return { frames: next, recomputeIds }
}

export function applyMatteParamsToAllFrames<T extends MatteFrameState>(
  frames: T[],
  sourceId: string
): ApplyMatteParamsToFollowingFramesResult<T> {
  const source = frames.find((frame) => frame.id === sourceId)
  if (!source) return { frames, recomputeIds: [] }

  const recomputeIds: string[] = []
  const next = frames.map((frame) => {
    recomputeIds.push(frame.id)
    if (frame.id === sourceId) return frame
    return {
      ...frame,
      matte: cloneMatteParams(source.matte),
    }
  })

  return { frames: next, recomputeIds }
}

function parseHexColor(hex: string | undefined): [number, number, number] | null {
  const clean = normalizeHexColor(hex, '').replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

export function normalizeHexColor(value: string | undefined, fallback = '#00ff00'): string {
  const raw = (value ?? '').trim()
  const rgbMatch = raw.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*[\d.]+)?\s*\)$/i)
  if (rgbMatch) {
    const channels = rgbMatch.slice(1, 4).map((channel) => clampInt(Number(channel), 0, 255))
    return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
  }
  const clean = raw.replace(/^#/, '')
  if (/^[0-9a-f]{6}$/i.test(clean)) return `#${clean.toLowerCase()}`
  if (/^[0-9a-f]{8}$/i.test(clean)) return `#${clean.slice(0, 6).toLowerCase()}`
  return fallback
}

export function normalizePickerColor(color: unknown, hex: string | undefined, fallback = '#00ff00'): string {
  if (color && typeof color === 'object') {
    const maybeColor = color as { toHexString?: () => string; toRgbString?: () => string }
    if (typeof maybeColor.toHexString === 'function') {
      const normalized = normalizeHexColor(maybeColor.toHexString(), '')
      if (normalized) return normalized
    }
    if (typeof maybeColor.toRgbString === 'function') {
      const normalized = normalizeHexColor(maybeColor.toRgbString(), '')
      if (normalized) return normalized
    }
  }
  return normalizeHexColor(hex, fallback)
}

export function resolveSpillColor(
  mode: SpillColorMode,
  customHex?: string,
  keyColor: [number, number, number] = [0, 255, 0]
): [number, number, number] {
  if (mode === 'key') return keyColor
  if (mode === 'blue') return [0, 0, 255]
  if (mode === 'magenta') return [255, 0, 255]
  if (mode === 'custom') return parseHexColor(customHex) ?? [0, 255, 0]
  return [0, 255, 0]
}

export function getSpillColorHex(
  mode: SpillColorMode,
  customHex?: string,
  keyColor: [number, number, number] = [0, 255, 0]
): string {
  const [r, g, b] = resolveSpillColor(mode, customHex, keyColor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function isSpillColorMode(value: unknown): value is SpillColorMode {
  return value === 'key' || value === 'green' || value === 'blue' || value === 'magenta' || value === 'custom'
}

export function coerceMatteDefaults(input: Partial<MatteDefaults>): MatteDefaults {
  return {
    tolerance: clampInt(input.tolerance ?? 5, 0, 100),
    smoothness: clampInt(input.smoothness ?? 5, 0, 100),
    spill: clampInt(input.spill ?? 0, 0, 100),
    erosion: clampInt(input.erosion ?? 5, 0, 100),
    spillColorMode: isSpillColorMode(input.spillColorMode) ? input.spillColorMode : 'key',
    customSpillHex: normalizeHexColor(input.customSpillHex, '#00ff00'),
  }
}
