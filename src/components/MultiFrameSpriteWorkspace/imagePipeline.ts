import { buildSpriteSheetGridCells } from './model'
import { computeChromaKeyAlpha, normalizeHexColor, resolveSpillColor, type MatteDefaults } from './matteModel'
import type {
  ComposeStyle,
  FrameItem,
  FrameLayout,
  MatteImportGroupKind,
  MatteParams,
  SpriteSheetDraft,
  SpriteSlicePreview,
} from './types'

const DEFAULT_MATTE: MatteParams = {
  keyColor: [0, 255, 0],
  tolerance: 5,
  smoothness: 5,
  spill: 0,
  spillColorMode: 'key',
  customSpillHex: '#00ff00',
  erosion: 5,
}

export function createWorkspaceId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `mf-${Date.now()}-${Math.random()}`
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = normalizeHexColor(hex, '#00ff00').replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(clean)) return [0, 255, 0]
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('导出失败'))), 'image/png')
  })
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
    const alpha = computeChromaKeyAlpha(dist, matte.tolerance, matte.smoothness)

    if (spillStr > 0 && alpha > 0) {
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
    data.data[i + 3] = Math.round(alpha * 255)
  }

  ctx.putImageData(data, 0, 0)
  erodeAlpha(canvas, Math.min(5, Math.round((matte.erosion / 100) * 10)))
  return { url: URL.createObjectURL(await canvasToBlob(canvas)), width: canvas.width, height: canvas.height }
}

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

export interface FrameImportGroupInput {
  id: string
  name: string
  kind: MatteImportGroupKind
}

export async function makeFrameFromFile(file: File, defaults: MatteDefaults, group: FrameImportGroupInput): Promise<FrameItem> {
  const sourceUrl = URL.createObjectURL(file)
  const img = await loadImage(sourceUrl)
  return {
    id: createWorkspaceId(),
    file,
    sourceName: file.name,
    matteGroupId: group.id,
    matteGroupName: group.name,
    matteGroupKind: group.kind,
    sourceUrl,
    sourceWidth: img.naturalWidth,
    sourceHeight: img.naturalHeight,
    matte: {
      ...DEFAULT_MATTE,
      tolerance: defaults.tolerance,
      smoothness: defaults.smoothness,
      spill: defaults.spill,
      erosion: defaults.erosion,
      spillColorMode: defaults.spillColorMode,
      customSpillHex: defaults.customSpillHex,
    },
    matteUrl: null,
    matteWidth: img.naturalWidth,
    matteHeight: img.naturalHeight,
    matteRevision: 0,
    layout: {
      width: img.naturalWidth,
      height: img.naturalHeight,
      keepAspect: true,
      offsetX: 0,
      offsetY: 0,
    },
    composedUrl: null,
    composedRevision: 0,
    processing: false,
    hidden: false,
  }
}

export async function splitSpriteSheetToPreviews(
  draft: SpriteSheetDraft,
  rows: number,
  columns: number
): Promise<SpriteSlicePreview[]> {
  const img = await loadImage(draft.sourceUrl)
  const cells = buildSpriteSheetGridCells(draft.width, draft.height, rows, columns)
  const previews: SpriteSlicePreview[] = []
  for (const cell of cells) {
    const canvas = document.createElement('canvas')
    canvas.width = cell.width
    canvas.height = cell.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建切分预览画布')
    ctx.drawImage(img, cell.x, cell.y, cell.width, cell.height, 0, 0, cell.width, cell.height)
    const blob = await canvasToBlob(canvas)
    previews.push({
      index: cell.index,
      name: `${draft.sourceName.replace(/\.[^.]+$/, '')}_frame_${String(cell.index + 1).padStart(3, '0')}.png`,
      url: URL.createObjectURL(blob),
      blob,
      width: cell.width,
      height: cell.height,
    })
  }
  return previews
}

export function revokeFrameUrls(item: FrameItem) {
  URL.revokeObjectURL(item.sourceUrl)
  if (item.matteUrl) URL.revokeObjectURL(item.matteUrl)
  if (item.composedUrl) URL.revokeObjectURL(item.composedUrl)
}

export function revokeSpriteSlicePreviews(slices: SpriteSlicePreview[]) {
  slices.forEach((slice) => URL.revokeObjectURL(slice.url))
}
