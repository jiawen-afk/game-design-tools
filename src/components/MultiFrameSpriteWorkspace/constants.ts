import type { UniformCrop } from './cropModel'
import type { ResizeHandle } from './layoutModel'

export const IMAGE_ACCEPT = ['.png', '.jpg', '.jpeg', '.webp']
export const VIDEO_ACCEPT = ['.mp4', '.mov', '.webm', '.avi', '.mkv']
export const VIDEO_EXTRACTION_FRAME_LIMIT = 300
export const HANDLE_SIZE = 12
export const MIN_VIDEO_CROP_SIZE = 4
export const EMPTY_UNIFORM_CROP: UniformCrop = { top: 0, bottom: 0, left: 0, right: 0 }

export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
}
