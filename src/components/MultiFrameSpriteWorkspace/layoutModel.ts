export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export interface HandleResizeInput {
  startWidth: number
  startHeight: number
  deltaX: number
  deltaY: number
  handle: ResizeHandle
  keepAspect: boolean
  minSize?: number
}

export interface FrameOffset {
  offsetX: number
  offsetY: number
}

export interface RatioFrameLayoutState {
  id: string
  matteWidth: number
  matteHeight: number
  layout: { width: number; height: number }
  composedRevision?: number
}

export interface ApplyCanvasRatioOptions {
  canvasWidth: number
  canvasHeight: number
  percent: number
  basis: 'width' | 'height'
  targetId?: string
}

export function clampPreviewZoom(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(0.25, Math.min(8, Math.round(value * 100) / 100))
}

export function computeKeyboardOffset(current: FrameOffset, key: string, fast: boolean): FrameOffset {
  const step = fast ? 10 : 1
  if (key === 'ArrowLeft') return { ...current, offsetX: current.offsetX - step }
  if (key === 'ArrowRight') return { ...current, offsetX: current.offsetX + step }
  if (key === 'ArrowUp') return { ...current, offsetY: current.offsetY - step }
  if (key === 'ArrowDown') return { ...current, offsetY: current.offsetY + step }
  return current
}

export function computeWheelResize(
  current: { width: number; height: number },
  deltaY: number,
  fast: boolean,
  minSize: number = 1
): { width: number; height: number } {
  const step = fast ? 0.25 : 0.1
  const scale = deltaY < 0 ? 1 + step : 1 / (1 + step)
  return {
    width: Math.max(minSize, Math.round(current.width * scale)),
    height: Math.max(minSize, Math.round(current.height * scale)),
  }
}

export function computeWheelFrameResize(
  current: { width: number; height: number },
  deltaY: number,
  wheelScalingEnabled: boolean,
  fast: boolean,
  minSize: number = 1
): { width: number; height: number } | null {
  if (!wheelScalingEnabled) return null
  return computeWheelResize(current, deltaY, fast, minSize)
}

export function getWheelScalingButtonLabel(wheelScalingEnabled: boolean): string {
  return wheelScalingEnabled ? '禁止缩放滚轮' : '开放缩放滚轮'
}

export function computeRatioSize(
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  percent: number,
  basis: 'width' | 'height'
): { width: number; height: number } {
  const sw = Math.max(1, sourceWidth)
  const sh = Math.max(1, sourceHeight)
  const ratio = sw / sh
  const p = Math.max(1, Math.min(300, percent)) / 100
  if (basis === 'width') {
    const width = Math.max(1, Math.round(Math.max(1, canvasWidth) * p))
    return { width, height: Math.max(1, Math.round(width / ratio)) }
  }
  const height = Math.max(1, Math.round(Math.max(1, canvasHeight) * p))
  return { width: Math.max(1, Math.round(height * ratio)), height }
}

export function applyCanvasRatioToFrameLayouts<T extends RatioFrameLayoutState>(
  frames: T[],
  options: ApplyCanvasRatioOptions
): T[] {
  return frames.map((frame) => {
    if (options.targetId && frame.id !== options.targetId) return frame
    return {
      ...frame,
      layout: {
        ...frame.layout,
        ...computeRatioSize(
          frame.matteWidth,
          frame.matteHeight,
          options.canvasWidth,
          options.canvasHeight,
          options.percent,
          options.basis
        ),
      },
      composedRevision: -1,
    }
  })
}

function axisDelta(handle: ResizeHandle, deltaX: number, deltaY: number): { w: number; h: number } {
  let dw = 0
  let dh = 0
  if (handle.includes('e')) dw = deltaX
  if (handle.includes('w')) dw = -deltaX
  if (handle.includes('s')) dh = deltaY
  if (handle.includes('n')) dh = -deltaY
  return { w: dw, h: dh }
}

export function computeHandleResize(input: HandleResizeInput): { width: number; height: number } {
  const minSize = Math.max(1, input.minSize ?? 1)
  const startWidth = Math.max(minSize, input.startWidth)
  const startHeight = Math.max(minSize, input.startHeight)
  const delta = axisDelta(input.handle, input.deltaX, input.deltaY)

  if (!input.keepAspect) {
    return {
      width: Math.max(minSize, Math.round(startWidth + delta.w)),
      height: Math.max(minSize, Math.round(startHeight + delta.h)),
    }
  }

  const aspect = startWidth / startHeight
  let nextWidth = startWidth
  let nextHeight = startHeight

  if (delta.w !== 0 || delta.h === 0) {
    nextWidth = Math.max(minSize, startWidth + delta.w)
    nextHeight = nextWidth / aspect
  }
  if (delta.h !== 0 && delta.w === 0) {
    nextHeight = Math.max(minSize, startHeight + delta.h)
    nextWidth = nextHeight * aspect
  }
  if (delta.w !== 0 && delta.h !== 0) {
    const scaleFromW = Math.max(minSize, startWidth + delta.w) / startWidth
    const scaleFromH = Math.max(minSize, startHeight + delta.h) / startHeight
    const scale = Math.max(scaleFromW, scaleFromH)
    nextWidth = startWidth * scale
    nextHeight = startHeight * scale
  }

  return {
    width: Math.max(minSize, Math.round(nextWidth)),
    height: Math.max(minSize, Math.round(nextHeight)),
  }
}
