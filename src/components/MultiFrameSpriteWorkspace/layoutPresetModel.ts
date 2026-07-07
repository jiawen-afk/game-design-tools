export interface RatioFrameLayoutState {
  id: string
  matteWidth: number
  matteHeight: number
  layout: { width: number; height: number }
  composedRevision?: number
}

export interface PresetFrameLayoutState {
  id: string
  matteWidth: number
  matteHeight: number
  layout: { width: number; height: number; offsetX: number; offsetY: number }
  composedRevision?: number
}

export type LayoutPresetMode = 'center' | 'active' | 'maxBoth' | 'maxWidth' | 'maxHeight'

export interface ApplyCanvasRatioOptions {
  canvasWidth: number
  canvasHeight: number
  percent: number
  basis: 'width' | 'height'
  targetId?: string
}

export interface ApplyLayoutPresetOptions {
  mode: LayoutPresetMode
  activeFrameId?: string | null
}

export function computeRatioSize(
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  percent: number,
  basis: 'width' | 'height',
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
  options: ApplyCanvasRatioOptions,
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
          options.basis,
        ),
      },
      composedRevision: -1,
    }
  })
}

function updatePresetFrameLayout<T extends PresetFrameLayoutState>(
  frame: T,
  layout: Partial<PresetFrameLayoutState['layout']>,
): T {
  return {
    ...frame,
    layout: { ...frame.layout, ...layout },
    composedRevision: -1,
  }
}

export function applyLayoutPresetToFrames<T extends PresetFrameLayoutState>(
  frames: T[],
  options: ApplyLayoutPresetOptions,
): T[] {
  if (frames.length === 0) return frames
  if (options.mode === 'center') {
    return frames.map((frame) => updatePresetFrameLayout(frame, { offsetX: 0, offsetY: 0 }))
  }
  if (options.mode === 'active') {
    const activeFrame = frames.find((frame) => frame.id === options.activeFrameId)
    if (!activeFrame) return frames
    return frames.map((frame) => updatePresetFrameLayout(frame, {
      width: activeFrame.layout.width,
      height: activeFrame.layout.height,
    }))
  }
  if (options.mode === 'maxBoth') {
    const width = Math.max(...frames.map((frame) => frame.layout.width))
    const height = Math.max(...frames.map((frame) => frame.layout.height))
    return frames.map((frame) => updatePresetFrameLayout(frame, { width, height }))
  }
  if (options.mode === 'maxWidth') {
    const width = Math.max(...frames.map((frame) => frame.layout.width))
    return frames.map((frame) => {
      const ratio = frame.matteWidth / Math.max(1, frame.matteHeight)
      return updatePresetFrameLayout(frame, { width, height: Math.max(1, Math.round(width / ratio)) })
    })
  }
  const height = Math.max(...frames.map((frame) => frame.layout.height))
  return frames.map((frame) => {
    const ratio = frame.matteWidth / Math.max(1, frame.matteHeight)
    return updatePresetFrameLayout(frame, { width: Math.max(1, Math.round(height * ratio)), height })
  })
}
