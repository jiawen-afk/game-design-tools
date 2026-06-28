import { canvasToBlob, loadImage } from './browserImagePipeline'
import { buildSpriteSheetGridCells } from './spriteSheetModel'
import type { SpriteSheetDraft, SpriteSlicePreview } from './types'

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
