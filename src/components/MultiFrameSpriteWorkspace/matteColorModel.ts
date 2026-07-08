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

export const MATTE_PARAM_MAX = {
  tolerance: 100,
  smoothness: 50,
  spill: 100,
  erosion: 100,
} as const

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

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = normalizeHexColor(hex, '#00ff00').replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(clean)) return [0, 255, 0]
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
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

export function computeChromaKeyAlpha(distance: number, tolerance: number, smoothness: number): number {
  const threshold = Math.max(0, tolerance)
  const feather = Math.max(0, smoothness)
  if (distance <= threshold) return 0
  if (feather > 0 && distance < threshold + feather) {
    return Math.min(1, (distance - threshold) / feather)
  }
  return 1
}

export function composeChromaKeyOutputAlpha(sourceAlpha: number, keyAlpha: number): number {
  return Math.min(1, Math.max(0, sourceAlpha)) * Math.min(1, Math.max(0, keyAlpha))
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
    tolerance: clampInt(input.tolerance ?? 5, 0, MATTE_PARAM_MAX.tolerance),
    smoothness: clampInt(input.smoothness ?? 5, 0, MATTE_PARAM_MAX.smoothness),
    spill: clampInt(input.spill ?? 0, 0, MATTE_PARAM_MAX.spill),
    erosion: clampInt(input.erosion ?? 5, 0, MATTE_PARAM_MAX.erosion),
    spillColorMode: isSpillColorMode(input.spillColorMode) ? input.spillColorMode : 'key',
    customSpillHex: normalizeHexColor(input.customSpillHex, '#00ff00'),
  }
}
