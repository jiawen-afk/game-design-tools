export interface SpriteUpscaleFrameState {
  id: string
  sourceName?: string
  hidden?: boolean
  matteUrl?: string | null
  matteRevision?: number
  composedUrl?: string | null
  composedRevision?: number
}

export interface SpriteUpscaleResult {
  frameId: string
  sourceMatteUrl: string
  matteRevision: number
  sourceComposedUrl: string
  composedRevision: number
  upscaledSourceUrl: string
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

function getMatteRevision(frame: SpriteUpscaleFrameState): number {
  return frame.matteRevision ?? 0
}

export function getSpriteUpscaleTargetFrames<T extends SpriteUpscaleFrameState>(frames: T[]): T[] {
  return frames.filter((frame) => !frame.hidden && Boolean(frame.matteUrl) && Boolean(frame.composedUrl))
}

export function isSpriteUpscaleResultCurrent(
  frame: SpriteUpscaleFrameState | null | undefined,
  result: SpriteUpscaleResult | null | undefined
): boolean {
  return Boolean(
    frame?.matteUrl
    && frame.composedUrl
    && result
    && result.frameId === frame.id
    && result.sourceMatteUrl === frame.matteUrl
    && result.matteRevision === getMatteRevision(frame)
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
      if (result.upscaledSourceUrl) staleUrls.push(result.upscaledSourceUrl)
    }
  }

  return staleUrls
}

export function buildSpriteUpscaleExportPlan<T extends SpriteUpscaleFrameState>(
  visibleFrames: T[],
  resultsByFrameId: SpriteUpscaleResultMap,
  upscaleEnabled: boolean,
  canvasWidth: number,
  canvasHeight: number
): SpriteUpscaleExportPlan<T> {
  const fallbackCanvasWidth = Math.max(1, Math.round(Number(canvasWidth) || 1))
  const fallbackCanvasHeight = Math.max(1, Math.round(Number(canvasHeight) || 1))

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
    canvasWidth: fallbackCanvasWidth,
    canvasHeight: fallbackCanvasHeight,
    usingUpscale: true,
    missingFrameNames: [],
  }
}
