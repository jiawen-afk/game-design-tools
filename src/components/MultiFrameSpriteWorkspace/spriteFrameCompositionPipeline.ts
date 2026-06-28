import { canvasToBlob, loadImage } from './browserImagePipeline'
import type { ComposeStyle, FrameLayout } from './types'

function drawImageSilhouette(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string
) {
  const r = Math.max(0, Math.round(radius))
  if (r <= 0) return
  const mask = document.createElement('canvas')
  mask.width = ctx.canvas.width
  mask.height = ctx.canvas.height
  const maskCtx = mask.getContext('2d')
  if (!maskCtx) return
  for (let step = 1; step <= r; step += 1) {
    const offsets = [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
      [step, step],
      [step, -step],
      [-step, step],
      [-step, -step],
    ] as const
    offsets.forEach(([dx, dy]) => maskCtx.drawImage(img, x + dx, y + dy, width, height))
  }
  maskCtx.globalCompositeOperation = 'source-in'
  maskCtx.fillStyle = color
  maskCtx.fillRect(0, 0, mask.width, mask.height)
  ctx.drawImage(mask, 0, 0)
}

export async function composeFrame(
  matteUrl: string,
  canvasWidth: number,
  canvasHeight: number,
  layout: FrameLayout,
  style: ComposeStyle
): Promise<string> {
  const img = await loadImage(matteUrl)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(canvasWidth))
  canvas.height = Math.max(1, Math.round(canvasHeight))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const w = Math.max(1, Math.round(layout.width))
  const h = Math.max(1, Math.round(layout.height))
  const x = Math.round(canvas.width / 2 - w / 2 + layout.offsetX)
  const y = Math.round(canvas.height / 2 - h / 2 + layout.offsetY)
  const strokeWidth = Math.max(0, Math.round(style.strokeWidth))
  const outlineWidth = Math.max(0, Math.round(style.outlineWidth))
  if (outlineWidth > 0) {
    drawImageSilhouette(ctx, img, x, y, w, h, strokeWidth + outlineWidth, style.outlineColor)
  }
  drawImageSilhouette(ctx, img, x, y, w, h, strokeWidth, style.strokeColor)
  ctx.drawImage(img, x, y, w, h)
  return URL.createObjectURL(await canvasToBlob(canvas))
}
