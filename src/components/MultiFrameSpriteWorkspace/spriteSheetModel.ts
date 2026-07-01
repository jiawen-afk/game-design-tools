import { clampInt } from './numberUtils'
import type { PlaybackMode } from './playbackModel'

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
  image?: string
  format?: 'png' | 'webp'
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
  image: string
  format: 'png' | 'webp'
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
    image: input.image ?? 'sprite.png',
    format: input.format ?? 'png',
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
