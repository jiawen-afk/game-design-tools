export interface SpriteFrameRect {
  x: number
  y: number
  w: number
  h: number
}

export interface SpriteSheetSize {
  w: number
  h: number
}

export function spriteFrameModalStyle(frame: SpriteFrameRect, sheetSize?: SpriteSheetSize) {
  return {
    width: `${frame.w}px`,
    height: `${frame.h}px`,
    backgroundPosition: `${-frame.x}px ${-frame.y}px`,
    backgroundSize: sheetSize ? `${sheetSize.w}px ${sheetSize.h}px` : undefined,
  }
}
