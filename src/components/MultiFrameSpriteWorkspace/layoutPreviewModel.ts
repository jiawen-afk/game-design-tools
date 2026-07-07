import type { ComposeStyle } from './types'

export interface LayoutFramePreviewState {
  matteUrl: string | null
  composedUrl: string | null
}

export interface LayoutFrameSilhouettePreviewLayer {
  kind: 'outline' | 'stroke'
  id: string
  color: string
  offsetX: number
  offsetY: number
}

export function getLayoutFramePreviewUrl(frame: LayoutFramePreviewState): string | undefined {
  return frame.matteUrl ?? undefined
}

function addSilhouettePreviewLayers(
  layers: LayoutFrameSilhouettePreviewLayer[],
  kind: LayoutFrameSilhouettePreviewLayer['kind'],
  radius: number,
  color: string,
) {
  const safeRadius = Math.max(0, Math.round(radius))
  if (safeRadius <= 0) return
  for (let step = 1; step <= safeRadius; step += 1) {
    const offsets = [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
      [step, step],
      [step, -step],
      [-step, step],
      [-step, -step],
    ] as const
    for (const [offsetX, offsetY] of offsets) {
      layers.push({
        kind,
        id: `${kind}-${step}-${offsetX}-${offsetY}`,
        color,
        offsetX,
        offsetY,
      })
    }
  }
}

export function getLayoutFrameSilhouettePreviewLayers(style: ComposeStyle): LayoutFrameSilhouettePreviewLayer[] {
  const strokeWidth = Math.max(0, Math.round(style.strokeWidth))
  const outlineWidth = Math.max(0, Math.round(style.outlineWidth))
  const layers: LayoutFrameSilhouettePreviewLayer[] = []
  if (outlineWidth > 0) {
    addSilhouettePreviewLayers(layers, 'outline', strokeWidth + outlineWidth, style.outlineColor)
  }
  addSilhouettePreviewLayers(layers, 'stroke', strokeWidth, style.strokeColor)
  return layers
}
