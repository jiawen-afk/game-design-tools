import { useState } from 'react'
import { message } from 'antd'
import JSZip from 'jszip'

import { canvasToBlob, loadImage } from './imagePipeline'
import { buildMultiFrameSpriteIndex } from './model'
import { clampInt } from './numberUtils'
import type { PlaybackMode } from './playbackModel'
import type { FrameItem } from './types'

export interface UseSpriteExportParams {
  frames: FrameItem[]
  visibleFrames: FrameItem[]
  canvasWidth: number
  canvasHeight: number
  fps: number
  playbackMode: PlaybackMode
}

export function useSpriteExport({
  frames,
  visibleFrames,
  canvasWidth,
  canvasHeight,
  fps,
  playbackMode,
}: UseSpriteExportParams) {
  const [columns, setColumns] = useState(4)
  const [exporting, setExporting] = useState(false)

  const exportAll = async () => {
    if (frames.length === 0) {
      message.warning('请先上传图片')
      return
    }
    if (visibleFrames.length === 0) {
      message.warning('没有可导出的可见帧')
      return
    }
    const missing = visibleFrames.find((item) => !item.composedUrl)
    if (missing) {
      message.warning('仍有帧未处理完成，请稍后再导出')
      return
    }
    setExporting(true)
    try {
      const cols = clampInt(columns, 1, Math.max(1, visibleFrames.length))
      const index = buildMultiFrameSpriteIndex({
        canvasWidth,
        canvasHeight,
        columns: cols,
        fps,
        playbackMode,
        frames: visibleFrames.map((item) => ({ id: item.id, sourceName: item.sourceName })),
      })
      const sheet = document.createElement('canvas')
      sheet.width = index.sheet_size.w
      sheet.height = index.sheet_size.h
      const ctx = sheet.getContext('2d')
      if (!ctx) throw new Error('无法创建导出画布')
      ctx.clearRect(0, 0, sheet.width, sheet.height)
      const zip = new JSZip()
      for (let i = 0; i < visibleFrames.length; i += 1) {
        const item = visibleFrames[i]!
        const img = await loadImage(item.composedUrl!)
        const meta = index.frames[i]!
        ctx.drawImage(img, meta.x, meta.y, meta.w, meta.h)
      }
      const spriteBlob = await canvasToBlob(sheet)
      zip.file('sprite.png', spriteBlob)
      zip.file('index.json', JSON.stringify(index, null, 2))
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(zipBlob)
      a.download = 'sprite_export.zip'
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      message.success('已导出 ZIP')
    } catch (e) {
      message.error(`导出失败：${String(e)}`)
    } finally {
      setExporting(false)
    }
  }

  return { columns, setColumns, exporting, exportAll }
}
