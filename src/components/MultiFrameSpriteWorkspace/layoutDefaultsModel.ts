import { normalizeHexColor } from './matteModel'
import { clampInt } from './numberUtils'

export interface LayoutDefaults {
  canvasWidth: number
  canvasHeight: number
  ratioPercent: number
  ratioBasis: 'width' | 'height'
  strokeColor: string
  strokeWidth: number
  outlineColor: string
  outlineWidth: number
}

export function coerceLayoutDefaults(input: Partial<LayoutDefaults>): LayoutDefaults {
  return {
    canvasWidth: clampInt(input.canvasWidth ?? 256, 1, 4096),
    canvasHeight: clampInt(input.canvasHeight ?? 256, 1, 4096),
    ratioPercent: clampInt(input.ratioPercent ?? 80, 1, 300),
    ratioBasis: input.ratioBasis === 'width' ? 'width' : 'height',
    strokeColor: normalizeHexColor(input.strokeColor, '#ffffff'),
    strokeWidth: clampInt(input.strokeWidth ?? 0, 0, 128),
    outlineColor: normalizeHexColor(input.outlineColor, '#1a1a1a'),
    outlineWidth: clampInt(input.outlineWidth ?? 0, 0, 128),
  }
}
