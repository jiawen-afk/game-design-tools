import { clampInt } from './numberUtils'
import { normalizeHexColor } from './matteModel'
import type { PlaybackMode } from './playbackModel'

export { clampUniformCrop, computeUniformCropSize, type UniformCrop } from './cropModel'
export {
  getGuideActionLabel,
  getGuideEmptyStateText,
  getGuideLineEdgeStartPosition,
  getGuideRulerCursor,
  getGuideRulerDragAxis,
  getGuideRulerLabel,
  normalizeGuideLinePosition,
  shouldIgnoreInitialGuideDrag,
} from './guideModel'
export {
  applyCanvasRatioToFrameLayouts,
  applyLayoutPresetToFrames,
  clampPreviewZoom,
  computeHandleResize,
  computeKeyboardOffset,
  computeRatioSize,
  computeWheelFrameResize,
  computeWheelResize,
  getPendingComposedFrameIds,
  getWheelScalingButtonLabel,
  type ApplyCanvasRatioOptions,
  type ApplyLayoutPresetOptions,
  type ComposedProgressFrameState,
  type FrameOffset,
  type HandleResizeInput,
  type LayoutPresetMode,
  type PresetFrameLayoutState,
  type RatioFrameLayoutState,
  type ResizeHandle,
} from './layoutModel'
export {
  applyMatteParamsToAllFrames,
  applyMatteParamsToFrameGroup,
  applyMatteParamsToFollowingFrames,
  buildMatteFrameGroups,
  coerceMatteDefaults,
  getSpillColorHex,
  getInitialMatteFrameIds,
  getNextMatteGroupName,
  normalizeHexColor,
  normalizePickerColor,
  queueUniqueFrameId,
  removeMatteFrameGroup,
  resolvePipelineConcurrency,
  resolveSpillColor,
  type ApplyMatteParamsToFollowingFramesResult,
  type MatteFrameGroup,
  type MatteGroupFrameState,
  type MatteDefaults,
  type MatteFrameState,
  type MatteImportGroupKind,
  type MatteParamsState,
  type SpillColorMode,
} from './matteModel'
export { clampInt } from './numberUtils'
export {
  advancePlaybackCursor,
  applyFrameTagSelection,
  batchHideSelectedFrames,
  buildPlaybackFrameIds,
  clearFrameCollection,
  countPlayableFrames,
  filterLivePlaybackFrameIds,
  filterVisibleFrames,
  type ApplyFrameTagSelectionInput,
  type FrameTagSelectionGesture,
  type PlaybackFrameState,
  type PlaybackMode,
  type VisibleFrameState,
} from './playbackModel'
export {
  buildVideoFrameTimestamps,
  clampVideoClipRange,
  getVideoExtractionFrameCount,
  getVideoExtractionLimitMessage,
  getVideoPreviewSeekTarget,
  getVideoSourceUrlToRevoke,
  shouldReplayVideoSegment,
} from './videoModel'

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

export interface SpriteIndexFrameInput {
  id: string
  sourceName: string
}

export interface MultiFrameSpriteIndexInput {
  canvasWidth: number
  canvasHeight: number
  columns: number
  fps: number
  playbackMode: PlaybackMode
  frames: SpriteIndexFrameInput[]
}

export interface MultiFrameSpriteIndexFrame {
  i: number
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  t: number
}

export interface MultiFrameSpriteIndex {
  version: '1.0'
  frame_size: { w: number; h: number }
  sheet_size: { w: number; h: number }
  fps: number
  playbackMode: PlaybackMode
  frames: MultiFrameSpriteIndexFrame[]
}

export interface SpriteSheetGridCell {
  index: number
  row: number
  column: number
  x: number
  y: number
  width: number
  height: number
}

export interface ComposedFrameState {
  id: string
  matteRevision: number
  composedUrl: string | null
  composedRevision?: number
}

export interface ApplyComposedFrameUrlOptions {
  id: string
  matteRevision: number
  url: string
  revoke: (url: string) => void
}

export interface UploadFileIdentity {
  name: string
  size: number
  lastModified: number
}

export interface UploadFilterState {
  existingKeys: Set<string>
  pendingKeys: Set<string>
}

export function buildUploadFileKey(file: UploadFileIdentity): string {
  return `${file.name}-${file.size}-${file.lastModified}`
}

export function filterNewUploadFiles<T extends UploadFileIdentity>(
  files: T[],
  state: UploadFilterState
): T[] {
  const seen = new Set<string>()
  const next: T[] = []
  for (const file of files) {
    const key = buildUploadFileKey(file)
    if (seen.has(key)) continue
    seen.add(key)
    if (state.existingKeys.has(key)) continue
    if (state.pendingKeys.has(key)) continue
    next.push(file)
  }
  return next
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

export function computeAutoSpriteColumns(frameCount: number): number {
  return Math.max(1, Math.ceil(Math.sqrt(Math.max(1, frameCount))))
}

export function buildSpriteSheetGridCells(
  sheetWidth: number,
  sheetHeight: number,
  rows: number,
  columns: number
): SpriteSheetGridCell[] {
  const safeRows = clampInt(rows, 1, 128)
  const safeColumns = clampInt(columns, 1, 128)
  const cellWidth = Math.max(1, Math.floor(Math.max(1, sheetWidth) / safeColumns))
  const cellHeight = Math.max(1, Math.floor(Math.max(1, sheetHeight) / safeRows))
  const cells: SpriteSheetGridCell[] = []
  for (let row = 0; row < safeRows; row += 1) {
    for (let column = 0; column < safeColumns; column += 1) {
      cells.push({
        index: row * safeColumns + column,
        row,
        column,
        x: column * cellWidth,
        y: row * cellHeight,
        width: column === safeColumns - 1 ? Math.max(1, Math.max(1, sheetWidth) - column * cellWidth) : cellWidth,
        height: row === safeRows - 1 ? Math.max(1, Math.max(1, sheetHeight) - row * cellHeight) : cellHeight,
      })
    }
  }
  return cells
}

export function buildMultiFrameSpriteIndex(input: MultiFrameSpriteIndexInput): MultiFrameSpriteIndex {
  const frameW = Math.max(1, Math.round(input.canvasWidth))
  const frameH = Math.max(1, Math.round(input.canvasHeight))
  const cols = Math.max(1, Math.round(input.columns))
  const rows = Math.max(1, Math.ceil(input.frames.length / cols))
  const fps = Math.max(1, Math.round(input.fps))

  return {
    version: '1.0',
    frame_size: { w: frameW, h: frameH },
    sheet_size: { w: cols * frameW, h: rows * frameH },
    fps,
    playbackMode: input.playbackMode,
    frames: input.frames.map((frame, i) => ({
      i,
      id: frame.id,
      name: frame.sourceName,
      x: (i % cols) * frameW,
      y: Math.floor(i / cols) * frameH,
      w: frameW,
      h: frameH,
      t: Math.round((i / fps) * 1000) / 1000,
    })),
  }
}

export function applyComposedFrameUrl<T extends ComposedFrameState>(
  frames: T[],
  options: ApplyComposedFrameUrlOptions
): T[] {
  let applied = false
  const next = frames.map((frame) => {
    if (frame.id !== options.id) return frame
    if (frame.matteRevision !== options.matteRevision) return frame
    applied = true
    if (frame.composedUrl) options.revoke(frame.composedUrl)
    return {
      ...frame,
      composedUrl: options.url,
      composedRevision: options.matteRevision,
    }
  })
  if (!applied) options.revoke(options.url)
  return next as T[]
}
