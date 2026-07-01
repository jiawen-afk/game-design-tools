import { canvasToBlob, loadImage } from './imagePipeline'
import { buildMultiFrameSpriteIndex } from './model'
import { clampInt } from './numberUtils'
import type { PlaybackMode } from './playbackModel'
import {
  defaultImageExportEncoding,
  getImageExportEncodingInfo,
  type ImageExportEncodingSettings,
} from '../ImageProcessingWorkspace/imageProcessingModel'
import { encodeImageExportBlob } from '../ImageProcessingWorkspace/imageProcessingPipeline'
import type { GameDesignToolsDesktopApi } from '../../desktopApi'

export type SpriteExportFrameSource = {
  id: string
  sourceName: string
  composedUrl: string
}

export interface BuildSpriteExportPackageInput {
  columns: number
  visibleFrames: SpriteExportFrameSource[]
  canvasWidth: number
  canvasHeight: number
  fps: number
  playbackMode: PlaybackMode
  exportEncoding?: ImageExportEncodingSettings
  encoderApi?: Partial<GameDesignToolsDesktopApi> | null
}

export async function buildSpriteExportPackage(input: BuildSpriteExportPackageInput) {
  const exportEncoding = input.exportEncoding ?? defaultImageExportEncoding
  const encodingInfo = getImageExportEncodingInfo(exportEncoding)
  const spriteFileName = `sprite.${encodingInfo.extension}`
  const cols = clampInt(input.columns, 1, Math.max(1, input.visibleFrames.length))
  const index = buildMultiFrameSpriteIndex({
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
    columns: cols,
    fps: input.fps,
    playbackMode: input.playbackMode,
    image: spriteFileName,
    format: encodingInfo.extension === 'webp' ? 'webp' : 'png',
    frames: input.visibleFrames.map((item) => ({ id: item.id, sourceName: item.sourceName })),
  })
  const sheet = document.createElement('canvas')
  sheet.width = index.sheet_size.w
  sheet.height = index.sheet_size.h
  const ctx = sheet.getContext('2d')
  if (!ctx) throw new Error('无法创建导出画布')
  ctx.clearRect(0, 0, sheet.width, sheet.height)
  for (let i = 0; i < input.visibleFrames.length; i += 1) {
    const item = input.visibleFrames[i]!
    const img = await loadImage(item.composedUrl)
    const meta = index.frames[i]!
    ctx.drawImage(img, meta.x, meta.y, meta.w, meta.h)
  }
  const pngBlob = await canvasToBlob(sheet)
  const encoded = await encodeImageExportBlob(spriteFileName, pngBlob, exportEncoding, input.encoderApi)
  const indexJson = JSON.stringify(index, null, 2)
  return {
    spriteBlob: encoded.blob,
    indexJson,
    spriteFileName: encoded.fileName,
    spriteMimeType: encoded.blob.type || encodingInfo.mimeType,
  }
}
