import { useState } from 'react'
import { message } from 'antd'

import { canvasToBlob, loadImage } from './imagePipeline'
import { buildMultiFrameSpriteIndex } from './model'
import { clampInt } from './numberUtils'
import type { PlaybackMode } from './playbackModel'
import type { FrameItem } from './types'
import {
  createSpriteAssetFromExport,
  readPersonalSpaceState,
  writePersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import {
  getPersonalSpaceDirectoryHandle,
  writeAssetResourcesToDirectory,
} from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { personalSpaceDirectoryRequiredMessage } from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'

export interface UseSpriteExportParams {
  frames: FrameItem[]
  visibleFrames: FrameItem[]
  canvasWidth: number
  canvasHeight: number
  fps: number
  playbackMode: PlaybackMode
}

export type SpriteExportViewModel = ReturnType<typeof useSpriteExport>

async function buildSpriteExportPackage(input: {
  columns: number
  visibleFrames: FrameItem[]
  canvasWidth: number
  canvasHeight: number
  fps: number
  playbackMode: PlaybackMode
}) {
  const cols = clampInt(input.columns, 1, Math.max(1, input.visibleFrames.length))
  const index = buildMultiFrameSpriteIndex({
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
    columns: cols,
    fps: input.fps,
    playbackMode: input.playbackMode,
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
    const img = await loadImage(item.composedUrl!)
    const meta = index.frames[i]!
    ctx.drawImage(img, meta.x, meta.y, meta.w, meta.h)
  }
  const spriteBlob = await canvasToBlob(sheet)
  const indexJson = JSON.stringify(index, null, 2)
  return { spriteBlob, indexJson }
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

  const validateExportableFrames = () => {
    if (frames.length === 0) {
      message.warning('请先上传图片')
      return false
    }
    if (visibleFrames.length === 0) {
      message.warning('没有可导出的可见帧')
      return false
    }
    const missing = visibleFrames.find((item) => !item.composedUrl)
    if (missing) {
      message.warning('仍有帧未处理完成，请稍后再导出')
      return false
    }
    return true
  }

  const exportAll = async () => {
    if (!validateExportableFrames()) return
    setExporting(true)
    try {
      const { default: JSZip } = await import('jszip')
      const { spriteBlob, indexJson } = await buildSpriteExportPackage({
        columns,
        visibleFrames,
        canvasWidth,
        canvasHeight,
        fps,
        playbackMode,
      })
      const zip = new JSZip()
      zip.file('sprite.png', spriteBlob)
      zip.file('index.json', indexJson)
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

  const collectToPersonalSpace = async () => {
    if (!validateExportableFrames()) return
    const directoryHandle = getPersonalSpaceDirectoryHandle()
    if (!directoryHandle) {
      message.warning(personalSpaceDirectoryRequiredMessage)
      return
    }
    setExporting(true)
    try {
      const { spriteBlob, indexJson } = await buildSpriteExportPackage({
        columns,
        visibleFrames,
        canvasWidth,
        canvasHeight,
        fps,
        playbackMode,
      })
      const spritePath = URL.createObjectURL(spriteBlob)
      const indexPath = URL.createObjectURL(new Blob([indexJson], { type: 'application/json' }))
      const space = readPersonalSpaceState()
      const baseAsset = createSpriteAssetFromExport({
        name: 'sprite.png',
        spritePath,
        indexPath,
      })
      const asset = await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [
        { name: 'sprite.png', data: spriteBlob },
        { name: 'index.json', data: new Blob([indexJson], { type: 'application/json' }) },
      ])
      writePersonalSpaceState({
        ...space,
        assets: [asset, ...space.assets],
      })
      message.success('已收藏到 个人空间-素材-精灵图')
    } catch (e) {
      message.error(`收藏到个人空间失败：${String(e)}`)
    } finally {
      setExporting(false)
    }
  }

  return { columns, setColumns, exporting, exportAll, collectToPersonalSpace }
}
