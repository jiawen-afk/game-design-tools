import { loadImage } from './imagePipeline'

export interface FrameSamplePointInput {
  clientX: number
  clientY: number
  previewRect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
  sourceWidth: number
  sourceHeight: number
}

export interface SampleFrameKeyColorInput {
  sourceUrl: string
  sourceWidth: number
  sourceHeight: number
  clientX: number
  clientY: number
  previewRect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
}

function clampSampleCoordinate(value: number, maxExclusive: number) {
  return Math.max(0, Math.min(Math.max(0, maxExclusive - 1), value))
}

export function computeFrameSamplePoint({
  clientX,
  clientY,
  previewRect,
  sourceWidth,
  sourceHeight,
}: FrameSamplePointInput) {
  const safePreviewWidth = Math.max(1, previewRect.width)
  const safePreviewHeight = Math.max(1, previewRect.height)
  const x = Math.floor(((clientX - previewRect.left) / safePreviewWidth) * sourceWidth)
  const y = Math.floor(((clientY - previewRect.top) / safePreviewHeight) * sourceHeight)

  return {
    x: clampSampleCoordinate(x, sourceWidth),
    y: clampSampleCoordinate(y, sourceHeight),
  }
}

export async function sampleFrameKeyColor({
  sourceUrl,
  sourceWidth,
  sourceHeight,
  clientX,
  clientY,
  previewRect,
}: SampleFrameKeyColorInput): Promise<[number, number, number]> {
  const point = computeFrameSamplePoint({
    clientX,
    clientY,
    previewRect,
    sourceWidth,
    sourceHeight,
  })
  const img = await loadImage(sourceUrl)
  const canvas = document.createElement('canvas')
  canvas.width = sourceWidth
  canvas.height = sourceHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建取色画布')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(point.x, point.y, 1, 1).data
  return [data[0]!, data[1]!, data[2]!]
}
