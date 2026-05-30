export type PlaybackMode = 'loop' | 'pingpong'

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

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

export interface HandleResizeInput {
  startWidth: number
  startHeight: number
  deltaX: number
  deltaY: number
  handle: ResizeHandle
  keepAspect: boolean
  minSize?: number
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

export interface UploadFileIdentity {
  name: string
  size: number
  lastModified: number
}

export interface UploadFilterState {
  existingKeys: Set<string>
  pendingKeys: Set<string>
}

export interface VisibleFrameState {
  hidden?: boolean
}

export interface PlaybackFrameState extends VisibleFrameState {
  id: string
  composedUrl?: string | null
}

export type FrameTagSelectionGesture = 'single' | 'range' | 'toggle'

export interface ApplyFrameTagSelectionInput {
  ids: string[]
  currentSelectedIds: string[]
  targetId: string
  anchorId?: string | null
  gesture: FrameTagSelectionGesture
}

export function filterVisibleFrames<T extends VisibleFrameState>(frames: T[]): T[] {
  return frames.filter((frame) => !frame.hidden)
}

export function buildPlaybackFrameIds<T extends PlaybackFrameState>(frames: T[], selectedIds?: string[]): string[] {
  const selected = selectedIds ? new Set(selectedIds) : null
  return frames
    .filter((frame) => !frame.hidden && !!frame.composedUrl && (!selected || selected.has(frame.id)))
    .map((frame) => frame.id)
}

export function countPlayableFrames<T extends PlaybackFrameState>(frames: T[]): number {
  let count = 0
  for (const frame of frames) {
    if (!frame.hidden && frame.composedUrl) count += 1
  }
  return count
}

export function filterLivePlaybackFrameIds<T extends PlaybackFrameState>(frames: T[], ids: string[]): string[] {
  const liveIds = new Set<string>()
  for (const frame of frames) {
    if (!frame.hidden && frame.composedUrl) liveIds.add(frame.id)
  }
  return ids.filter((id) => liveIds.has(id))
}

export function advancePlaybackCursor(
  currentIndex: number,
  count: number,
  playbackMode: PlaybackMode,
  direction: number
): { index: number; direction: number } {
  if (count <= 1) return { index: 0, direction: 1 }
  if (playbackMode === 'loop') return { index: (currentIndex + 1) % count, direction: 1 }

  const step = direction < 0 ? -1 : 1
  let nextIndex = currentIndex + step
  let nextDirection = step
  if (nextIndex >= count) {
    nextIndex = Math.max(0, count - 2)
    nextDirection = -1
  } else if (nextIndex < 0) {
    nextIndex = Math.min(count - 1, 1)
    nextDirection = 1
  }
  return { index: nextIndex, direction: nextDirection }
}

export function applyFrameTagSelection(input: ApplyFrameTagSelectionInput): { selectedIds: string[]; anchorId: string | null } {
  const ids = input.ids
  if (!ids.includes(input.targetId)) {
    return { selectedIds: input.currentSelectedIds.filter((id) => ids.includes(id)), anchorId: input.anchorId ?? null }
  }

  if (input.gesture === 'single') {
    return { selectedIds: [input.targetId], anchorId: input.targetId }
  }

  if (input.gesture === 'toggle') {
    const current = new Set(input.currentSelectedIds.filter((id) => ids.includes(id)))
    if (current.has(input.targetId)) current.delete(input.targetId)
    else current.add(input.targetId)
    return { selectedIds: ids.filter((id) => current.has(id)), anchorId: input.targetId }
  }

  const fallbackAnchor = input.currentSelectedIds.find((id) => ids.includes(id)) ?? input.targetId
  const anchorId = input.anchorId && ids.includes(input.anchorId) ? input.anchorId : fallbackAnchor
  const start = ids.indexOf(anchorId)
  const end = ids.indexOf(input.targetId)
  const [from, to] = start <= end ? [start, end] : [end, start]
  const current = new Set(input.currentSelectedIds.filter((id) => ids.includes(id)))
  ids.slice(from, to + 1).forEach((id) => current.add(id))
  return { selectedIds: ids.filter((id) => current.has(id)), anchorId }
}

export function batchHideSelectedFrames<T extends { id: string; hidden?: boolean }>(frames: T[], selectedIds: string[]): T[] {
  const selected = new Set(selectedIds)
  return frames.map((frame) => (selected.has(frame.id) ? { ...frame, hidden: true } : frame))
}

export function clearFrameCollection<T>(frames: T[], revokeFrame: (frame: T) => void): T[] {
  frames.forEach(revokeFrame)
  return []
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

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
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

export function normalizeGuideLinePosition(position: number, max: number): number | null {
  if (!Number.isFinite(position)) return null
  const rounded = Math.round(position)
  if (rounded <= 0) return null
  return Math.min(Math.max(1, rounded), Math.max(1, Math.round(max)))
}

export function getGuideLineEdgeStartPosition(): number {
  return 1
}

export function shouldIgnoreInitialGuideDrag(position: number, max: number, hasEnteredCanvas: boolean): boolean {
  if (hasEnteredCanvas) return false
  if (!Number.isFinite(position)) return true
  return position <= 0 || position > max
}

export function getGuideRulerLabel(axis: 'x' | 'y'): string {
  return axis === 'x' ? 'X 轴' : 'Y 轴'
}

export function getGuideRulerDragAxis(rulerAxis: 'x' | 'y'): 'x' | 'y' {
  return rulerAxis === 'x' ? 'y' : 'x'
}

export function getGuideRulerCursor(rulerAxis: 'x' | 'y'): 'ns-resize' | 'ew-resize' {
  return rulerAxis === 'x' ? 'ns-resize' : 'ew-resize'
}

export function getGuideActionLabel(axis: 'x' | 'y'): string {
  return axis === 'x' ? '添加竖向辅助线' : '添加横向辅助线'
}

export function getGuideEmptyStateText(): string {
  return '从顶部或左侧标尺添加辅助线。请先上传图片开始调整。'
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
