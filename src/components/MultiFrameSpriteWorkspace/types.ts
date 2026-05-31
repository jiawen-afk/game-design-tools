import type { UniformCrop } from './cropModel'
import type { ResizeHandle } from './layoutModel'
import type { SpillColorMode } from './matteModel'

export type MatteParams = {
  keyColor: [number, number, number]
  tolerance: number
  smoothness: number
  spill: number
  spillColorMode: SpillColorMode
  customSpillHex: string
  erosion: number
}

export type FrameLayout = {
  width: number
  height: number
  keepAspect: boolean
  offsetX: number
  offsetY: number
}

export type ComposeStyle = {
  strokeColor: string
  strokeWidth: number
  outlineColor: string
  outlineWidth: number
}

export type FrameItem = {
  id: string
  file: File
  sourceName: string
  sourceUrl: string
  sourceWidth: number
  sourceHeight: number
  matte: MatteParams
  matteUrl: string | null
  matteWidth: number
  matteHeight: number
  matteRevision: number
  layout: FrameLayout
  composedUrl: string | null
  composedRevision: number
  processing: boolean
  hidden: boolean
}

export type SpriteSheetDraft = {
  file: File
  sourceUrl: string
  sourceName: string
  width: number
  height: number
}

export type SpriteSlicePreview = {
  index: number
  name: string
  url: string
  blob: Blob
  width: number
  height: number
}

export type VideoDraft = {
  file: File
  sourceUrl: string
  sourceName: string
  duration: number
  width: number
  height: number
}

export type ExtractedVideoFrame = {
  index: number
  name: string
  url: string
  blob: Blob
  width: number
  height: number
  time: number
}

export type VideoCropHandle = 'top' | 'bottom' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br' | 'move'

export type VideoCropDragState = {
  handle: VideoCropHandle
  startX: number
  startY: number
  startCrop: UniformCrop
  width: number
  height: number
  scale: number
}

export type DragState =
  | { kind: 'move'; id: string; startX: number; startY: number; startOffsetX: number; startOffsetY: number }
  | {
      kind: 'resize'
      id: string
      handle: ResizeHandle
      startX: number
      startY: number
      startWidth: number
      startHeight: number
    }
  | null

export type GuideAxis = 'x' | 'y'

export type GuideLine = {
  id: string
  axis: GuideAxis
  position: number
}

export type GuideDragState = {
  id: string
  axis: GuideAxis
}

export type ContainedImageRect = {
  left: number
  top: number
  width: number
  height: number
  scale: number
}

export type CropBoxRect = {
  left: number
  top: number
  width: number
  height: number
}
