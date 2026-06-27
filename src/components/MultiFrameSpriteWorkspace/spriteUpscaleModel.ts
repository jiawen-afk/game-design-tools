export interface SpriteUpscaleFrameState {
  id: string
  sourceName?: string
  hidden?: boolean
  matteUrl?: string | null
  matteRevision?: number
  composedUrl?: string | null
  composedRevision?: number
}

export type SpriteUpscaleMode = 'off' | 'input' | 'output'
export type ActiveSpriteUpscaleMode = Exclude<SpriteUpscaleMode, 'off'>

export interface SpriteUpscaleResult {
  frameId: string
  mode?: ActiveSpriteUpscaleMode
  scale?: number
  sourceMatteUrl: string
  matteRevision: number
  sourceComposedUrl: string
  composedRevision: number
  upscaledSourceUrl?: string
  url: string
  blob?: Blob
  width: number
  height: number
}

export type SpriteUpscaleResultMap = Record<string, SpriteUpscaleResult>

export interface SpriteUpscaleExportPlan<T extends SpriteUpscaleFrameState> {
  visibleFrames: Array<T & { composedUrl: string }>
  canvasWidth: number
  canvasHeight: number
  usingUpscale: boolean
  upscaleMode: SpriteUpscaleMode
  missingFrameNames: string[]
}

function getComposedRevision(frame: SpriteUpscaleFrameState): number {
  return frame.composedRevision ?? 0
}

function getMatteRevision(frame: SpriteUpscaleFrameState): number {
  return frame.matteRevision ?? 0
}

export function getSpriteUpscaleTargetFrames<T extends SpriteUpscaleFrameState>(frames: T[]): T[] {
  return frames.filter((frame) => !frame.hidden && Boolean(frame.matteUrl) && Boolean(frame.composedUrl))
}

export function normalizeSpriteUpscaleMode(mode: boolean | SpriteUpscaleMode | null | undefined): SpriteUpscaleMode {
  if (mode === true) return 'input'
  if (mode === 'input' || mode === 'output') return mode
  return 'off'
}

export function getSpriteUpscaleModeLabel(mode: SpriteUpscaleMode): string {
  if (mode === 'input') return '输入图高清化'
  if (mode === 'output') return '结果图高清化'
  return '高清化'
}

export function getResultUpscaleFrameSize(canvasWidth: number, canvasHeight: number, scale: number) {
  const safeScale = Math.max(1, Math.round(Number(scale) || 1))
  return {
    width: Math.max(1, Math.round(Number(canvasWidth) || 1)) * safeScale,
    height: Math.max(1, Math.round(Number(canvasHeight) || 1)) * safeScale,
  }
}

export function isSpriteUpscaleResultCurrent(
  frame: SpriteUpscaleFrameState | null | undefined,
  result: SpriteUpscaleResult | null | undefined,
  upscaleMode?: boolean | SpriteUpscaleMode,
  upscaleScale?: number
): boolean {
  const mode = normalizeSpriteUpscaleMode(upscaleMode)
  const requiresModeMatch = upscaleMode === 'input' || upscaleMode === 'output'
  const requiresScaleMatch = requiresModeMatch && Number.isFinite(upscaleScale)
  return Boolean(
    frame?.matteUrl
    && frame.composedUrl
    && result
    && result.frameId === frame.id
    && (!requiresModeMatch || result.mode === mode)
    && (!requiresScaleMatch || result.scale === Math.max(1, Math.round(Number(upscaleScale) || 1)))
    && result.sourceMatteUrl === frame.matteUrl
    && result.matteRevision === getMatteRevision(frame)
    && result.sourceComposedUrl === frame.composedUrl
    && result.composedRevision === getComposedRevision(frame)
  )
}

export function getCurrentSpriteUpscalePreview(
  frame: SpriteUpscaleFrameState | null | undefined,
  resultsByFrameId: SpriteUpscaleResultMap,
  upscaleMode: boolean | SpriteUpscaleMode,
  upscaleScale?: number
): SpriteUpscaleResult | null {
  const mode = normalizeSpriteUpscaleMode(upscaleMode)
  if (mode === 'off' || !frame) return null
  const result = resultsByFrameId[frame.id]
  return isSpriteUpscaleResultCurrent(frame, result, upscaleMode, upscaleScale) ? result : null
}

export function collectStaleSpriteUpscaleResultUrls(
  frames: SpriteUpscaleFrameState[],
  resultsByFrameId: SpriteUpscaleResultMap
): string[] {
  const frameById = new Map(frames.map((frame) => [frame.id, frame]))
  const staleUrls: string[] = []

  for (const result of Object.values(resultsByFrameId)) {
    const frame = frameById.get(result.frameId)
    if (!isSpriteUpscaleResultCurrent(frame, result)) {
      staleUrls.push(result.url)
      if (result.upscaledSourceUrl) staleUrls.push(result.upscaledSourceUrl)
    }
  }

  return staleUrls
}

export function buildSpriteUpscaleExportPlan<T extends SpriteUpscaleFrameState>(
  visibleFrames: T[],
  resultsByFrameId: SpriteUpscaleResultMap,
  upscaleMode: boolean | SpriteUpscaleMode,
  canvasWidth: number,
  canvasHeight: number,
  upscaleScale = 1
): SpriteUpscaleExportPlan<T> {
  const fallbackCanvasWidth = Math.max(1, Math.round(Number(canvasWidth) || 1))
  const fallbackCanvasHeight = Math.max(1, Math.round(Number(canvasHeight) || 1))
  const normalizedMode = normalizeSpriteUpscaleMode(upscaleMode)
  const currentnessMode = typeof upscaleMode === 'boolean' ? upscaleMode : normalizedMode
  const resultFrameSize = getResultUpscaleFrameSize(fallbackCanvasWidth, fallbackCanvasHeight, upscaleScale)

  if (normalizedMode === 'off') {
    return {
      visibleFrames: visibleFrames.filter((frame): frame is T & { composedUrl: string } => Boolean(frame.composedUrl)),
      canvasWidth: fallbackCanvasWidth,
      canvasHeight: fallbackCanvasHeight,
      usingUpscale: false,
      upscaleMode: normalizedMode,
      missingFrameNames: [],
    }
  }

  const missingFrameNames = visibleFrames
    .filter((frame) => !isSpriteUpscaleResultCurrent(frame, resultsByFrameId[frame.id], currentnessMode, upscaleScale))
    .map((frame) => frame.sourceName || frame.id)

  if (missingFrameNames.length > 0) {
    return {
      visibleFrames: [],
      canvasWidth: normalizedMode === 'output' ? resultFrameSize.width : fallbackCanvasWidth,
      canvasHeight: normalizedMode === 'output' ? resultFrameSize.height : fallbackCanvasHeight,
      usingUpscale: true,
      upscaleMode: normalizedMode,
      missingFrameNames,
    }
  }

  return {
    visibleFrames: visibleFrames.map((frame) => ({
      ...frame,
      composedUrl: resultsByFrameId[frame.id]!.url,
    })),
    canvasWidth: normalizedMode === 'output' ? resultFrameSize.width : fallbackCanvasWidth,
    canvasHeight: normalizedMode === 'output' ? resultFrameSize.height : fallbackCanvasHeight,
    usingUpscale: true,
    upscaleMode: normalizedMode,
    missingFrameNames: [],
  }
}
