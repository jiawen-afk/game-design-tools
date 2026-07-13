import {
  computeAdditiveBlackToAlphaPixel,
  type AdditivePixelOutput,
} from './additiveBlendModel'
import { canvasToBlob, loadImage } from './imagePipeline'

export interface AdditiveBlendMaskRect {
  x: number
  y: number
  width: number
  height: number
}

export interface AdditiveBlendImageOptions {
  threshold: number
  strength: number
  maskRects: AdditiveBlendMaskRect[]
}

export interface AdditiveBlendImageResult {
  url: string
  width: number
  height: number
}

interface PixelRect {
  left: number
  top: number
  right: number
  bottom: number
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function normalizeMaskRects(maskRects: AdditiveBlendMaskRect[], width: number, height: number): PixelRect[] {
  return maskRects
    .map((rect) => {
      const x = clampUnit(rect.x)
      const y = clampUnit(rect.y)
      const right = clampUnit(rect.x + rect.width)
      const bottom = clampUnit(rect.y + rect.height)
      return {
        left: Math.floor(Math.min(x, right) * width),
        top: Math.floor(Math.min(y, bottom) * height),
        right: Math.ceil(Math.max(x, right) * width),
        bottom: Math.ceil(Math.max(y, bottom) * height),
      }
    })
    .filter((rect) => rect.right > rect.left && rect.bottom > rect.top)
}

function isPointInMask(x: number, y: number, maskRects: PixelRect[]): boolean {
  return maskRects.some((rect) => x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom)
}

function writePixel(data: Uint8ClampedArray, offset: number, pixel: AdditivePixelOutput) {
  data[offset] = pixel.r
  data[offset + 1] = pixel.g
  data[offset + 2] = pixel.b
  data[offset + 3] = pixel.a
}

export async function applyAdditiveBlendToImage(
  sourceUrl: string,
  options: AdditiveBlendImageOptions
): Promise<AdditiveBlendImageResult> {
  const image = await loadImage(sourceUrl)
  const width = Math.max(1, image.naturalWidth || image.width)
  const height = Math.max(1, image.naturalHeight || image.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建加色去黑画布')

  context.drawImage(image, 0, 0, width, height)
  const imageData = context.getImageData(0, 0, width, height)
  const maskRects = normalizeMaskRects(options.maskRects, width, height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isPointInMask(x, y, maskRects)) continue
      const offset = (y * width + x) * 4
      writePixel(imageData.data, offset, computeAdditiveBlackToAlphaPixel({
        r: imageData.data[offset] ?? 0,
        g: imageData.data[offset + 1] ?? 0,
        b: imageData.data[offset + 2] ?? 0,
        a: imageData.data[offset + 3] ?? 0,
        masked: true,
        threshold: options.threshold,
        strength: options.strength,
      }))
    }
  }

  context.putImageData(imageData, 0, 0)
  const blob = await canvasToBlob(canvas)
  return {
    url: URL.createObjectURL(blob),
    width,
    height,
  }
}
