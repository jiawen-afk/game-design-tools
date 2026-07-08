import { canvasToBlob, loadImage } from './browserImagePipeline'
import { composeChromaKeyOutputAlpha, computeChromaKeyAlpha, resolveSpillColor } from './matteModel'
import type { MatteParams } from './types'

export const DEFAULT_MATTE: MatteParams = {
  keyColor: [0, 255, 0],
  tolerance: 5,
  smoothness: 5,
  spill: 0,
  spillColorMode: 'key',
  customSpillHex: '#00ff00',
  erosion: 5,
}

function erodeAlpha(canvas: HTMLCanvasElement, passes: number): HTMLCanvasElement {
  if (passes <= 0) return canvas
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const w = canvas.width
  const h = canvas.height
  let read = ctx.getImageData(0, 0, w, h)
  let write = new ImageData(new Uint8ClampedArray(read.data), w, h)
  const dx = [-1, -1, -1, 0, 0, 1, 1, 1]
  const dy = [-1, 0, 1, -1, 1, -1, 0, 1]
  for (let p = 0; p < passes; p += 1) {
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4
        write.data[i] = read.data[i]!
        write.data[i + 1] = read.data[i + 1]!
        write.data[i + 2] = read.data[i + 2]!
        let minA = read.data[i + 3]!
        for (let k = 0; k < 8; k += 1) {
          const nx = x + dx[k]!
          const ny = y + dy[k]!
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            minA = Math.min(minA, read.data[(ny * w + nx) * 4 + 3]!)
          }
        }
        write.data[i + 3] = minA
      }
    }
    ;[read, write] = [write, read]
  }
  ctx.putImageData(read, 0, 0)
  return canvas
}

export async function chromaKey(sourceUrl: string, matte: MatteParams): Promise<{ url: string; width: number; height: number }> {
  const img = await loadImage(sourceUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const [kr, kg, kb] = matte.keyColor
  const spillStr = matte.spill / 100
  const spillColor = resolveSpillColor(matte.spillColorMode, matte.customSpillHex, matte.keyColor)
  const maxSpill = Math.max(...spillColor)
  const spillChannels = spillColor
    .map((v, idx) => (maxSpill > 0 && v === maxSpill ? idx : -1))
    .filter((idx) => idx >= 0)

  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i]!
    const g = data.data[i + 1]!
    const b = data.data[i + 2]!
    const dr = r - kr
    const dg = g - kg
    const db = b - kb
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    const sourceAlpha = data.data[i + 3]! / 255
    const keyAlpha = computeChromaKeyAlpha(dist, matte.tolerance, matte.smoothness)
    const outputAlpha = composeChromaKeyOutputAlpha(sourceAlpha, keyAlpha)

    if (spillStr > 0 && outputAlpha > 0) {
      const baseMask = Math.max(0, dist - matte.tolerance)
      const spillVal = Math.pow(Math.min(1, baseMask / Math.max(1, spillStr * 120)), 1.5)
      const gray = r * 0.2126 + g * 0.7152 + b * 0.0722
      let rr = gray * (1 - spillVal) + r * spillVal
      let gg = gray * (1 - spillVal) + g * spillVal
      let bb = gray * (1 - spillVal) + b * spillVal
      const strength = Math.min(1, spillStr * (1.2 - spillVal * 0.4))
      const channels = [rr, gg, bb]
      const otherChannels = [0, 1, 2].filter((idx) => !spillChannels.includes(idx))
      const otherAvg = otherChannels.length
        ? otherChannels.reduce((sum, idx) => sum + channels[idx]!, 0) / otherChannels.length
        : gray
      for (const idx of spillChannels) {
        if (channels[idx]! > otherAvg) {
          channels[idx] = channels[idx]! - strength * (channels[idx]! - otherAvg)
        }
      }
      ;[rr, gg, bb] = channels
      data.data[i] = Math.round(Math.max(0, Math.min(255, rr)))
      data.data[i + 1] = Math.round(Math.max(0, Math.min(255, gg)))
      data.data[i + 2] = Math.round(Math.max(0, Math.min(255, bb)))
    }
    data.data[i + 3] = Math.round(outputAlpha * 255)
  }

  ctx.putImageData(data, 0, 0)
  erodeAlpha(canvas, Math.min(5, Math.round((matte.erosion / 100) * 10)))
  return { url: URL.createObjectURL(await canvasToBlob(canvas)), width: canvas.width, height: canvas.height }
}
