export interface SpriteUpscaleFrameState {
  id: string
  sourceName?: string
  hidden?: boolean
  composedUrl?: string | null
  composedRevision?: number
}

export interface SpriteUpscaleResult {
  frameId: string
  sourceComposedUrl: string
  composedRevision: number
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
  missingFrameNames: string[]
}

function getComposedRevision(frame: SpriteUpscaleFrameState): number {
  return frame.composedRevision ?? 0
}

export function getSpriteUpscaleTargetFrames<T extends SpriteUpscaleFrameState>(frames: T[]): T[] {
  return frames.filter((frame) => !frame.hidden && Boolean(frame.composedUrl))
}

export function isSpriteUpscaleResultCurrent(
  frame: SpriteUpscaleFrameState | null | undefined,
  result: SpriteUpscaleResult | null | undefined
): boolean {
  return Boolean(
    frame?.composedUrl
    && result
    && result.frameId === frame.id
    && result.sourceComposedUrl === frame.composedUrl
    && result.composedRevision === getComposedRevision(frame)
  )
}

export function getCurrentSpriteUpscalePreview(
  frame: SpriteUpscaleFrameState | null | undefined,
  resultsByFrameId: SpriteUpscaleResultMap,
  upscaleEnabled: boolean
): SpriteUpscaleResult | null {
  if (!upscaleEnabled || !frame) return null
  const result = resultsByFrameId[frame.id]
  return isSpriteUpscaleResultCurrent(frame, result) ? result : null
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
    }
  }

  return staleUrls
}

export function buildSpriteUpscaleExportPlan<T extends SpriteUpscaleFrameState>(
  visibleFrames: T[],
  resultsByFrameId: SpriteUpscaleResultMap,
  upscaleEnabled: boolean,
  canvasWidth: number,
  canvasHeight: number,
  upscaleScale = 1
): SpriteUpscaleExportPlan<T> {
  const fallbackCanvasWidth = Math.max(1, Math.round(Number(canvasWidth) || 1))
  const fallbackCanvasHeight = Math.max(1, Math.round(Number(canvasHeight) || 1))
  const safeScale = Math.max(1, Number(upscaleScale) || 1)

  if (!upscaleEnabled) {
    return {
      visibleFrames: visibleFrames.filter((frame): frame is T & { composedUrl: string } => Boolean(frame.composedUrl)),
      canvasWidth: fallbackCanvasWidth,
      canvasHeight: fallbackCanvasHeight,
      usingUpscale: false,
      missingFrameNames: [],
    }
  }

  const missingFrameNames = visibleFrames
    .filter((frame) => !isSpriteUpscaleResultCurrent(frame, resultsByFrameId[frame.id]))
    .map((frame) => frame.sourceName || frame.id)

  if (missingFrameNames.length > 0) {
    return {
      visibleFrames: [],
      canvasWidth: fallbackCanvasWidth,
      canvasHeight: fallbackCanvasHeight,
      usingUpscale: true,
      missingFrameNames,
    }
  }

  return {
    visibleFrames: visibleFrames.map((frame) => ({
      ...frame,
      composedUrl: resultsByFrameId[frame.id]!.url,
    })),
    canvasWidth: Math.max(1, Math.round(fallbackCanvasWidth * safeScale)),
    canvasHeight: Math.max(1, Math.round(fallbackCanvasHeight * safeScale)),
    usingUpscale: true,
    missingFrameNames: [],
  }
}
