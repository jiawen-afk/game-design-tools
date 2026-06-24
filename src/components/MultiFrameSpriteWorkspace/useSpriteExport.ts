import { useState } from 'react'
import { message } from 'antd'

import { canvasToBlob, loadImage } from './imagePipeline'
import { buildMultiFrameSpriteIndex } from './model'
import { clampInt } from './numberUtils'
import type { PlaybackMode } from './playbackModel'
import type { FrameItem } from './types'
import {
  assignAssetToCharacterColumn,
  collectPersonalSpaceAsset,
  createSpriteAssetFromExport,
  hashText,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import {
  readCurrentProjectSpaceState,
} from '../PersonalSpaceWorkspace/projectSpaceState'
import { persistCurrentProjectSpaceState } from '../PersonalSpaceWorkspace/currentProjectSpacePersistence'
import { showCurrentProjectSpaceSyncWarning } from '../PersonalSpaceWorkspace/projectSpacePersistenceMessages'
import {
  getPersonalSpaceDirectoryHandle,
  writeAssetResourcesToDirectory,
} from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { personalSpaceDirectoryRequiredMessage } from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'
import { getDesktopApi } from '../../desktopApi'

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

async function saveExportFile(fileName: string, blob: Blob) {
  const api = getDesktopApi()
  if (!api) throw new Error('当前环境缺少桌面文件保存能力')
  const saved = await api.saveFile(fileName, await blob.arrayBuffer())
  if (!saved) throw new Error('未选择保存位置')
  return saved
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
  const [collectCharacterDialogOpen, setCollectCharacterDialogOpen] = useState(false)
  const [collectCharacterId, setCollectCharacterId] = useState<string | null>(null)
  const [collectCharacterOptions, setCollectCharacterOptions] = useState<Array<{ label: string; value: string }>>([])

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
      await saveExportFile('sprite_export.zip', zipBlob)
      message.success('已导出 ZIP')
    } catch (e) {
      message.error(`导出失败：${String(e)}`)
    } finally {
      setExporting(false)
    }
  }

  const spriteExportSourceKey = () => `sprite-export:${hashText(JSON.stringify({
    canvasWidth,
    canvasHeight,
    columns: clampInt(columns, 1, Math.max(1, visibleFrames.length)),
    fps,
    playbackMode,
    frames: visibleFrames.map((item) => ({
      id: item.id,
      sourceName: item.sourceName,
      width: item.sourceWidth,
      height: item.sourceHeight,
    })),
  }))}`

  const collectToPersonalSpace = async (characterId?: string) => {
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
      const space = readCurrentProjectSpaceState()
      const baseAsset = createSpriteAssetFromExport({
        name: 'sprite.png',
        spritePath,
        indexPath,
        sourceKey: spriteExportSourceKey(),
      })
      const asset = await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [
        { name: 'sprite.png', data: spriteBlob },
        { name: 'index.json', data: new Blob([indexJson], { type: 'application/json' }) },
      ])
      let nextSpace = collectPersonalSpaceAsset(space, asset)
      if (characterId) {
        nextSpace = assignAssetToCharacterColumn(nextSpace, characterId, asset.id, 'sprite')
      }
      const persistence = await persistCurrentProjectSpaceState(nextSpace, {
        getDirectoryHandle: () => directoryHandle,
      })
      if (persistence.syncError) {
        showCurrentProjectSpaceSyncWarning(message, persistence.syncError)
      }
      message.success(characterId ? '已收藏到 项目空间-素材-精灵图，并关联角色' : '已收藏到 项目空间-素材-精灵图')
    } catch (e) {
      message.error(`收藏到项目空间失败：${String(e)}`)
    } finally {
      setExporting(false)
    }
  }

  const openCollectCharacterDialog = () => {
    const space = readCurrentProjectSpaceState()
    const options = space.characters.map((character) => ({ label: character.name, value: character.id }))
    setCollectCharacterOptions(options)
    setCollectCharacterId(options[0]?.value ?? null)
    setCollectCharacterDialogOpen(true)
  }

  const closeCollectCharacterDialog = () => {
    setCollectCharacterDialogOpen(false)
  }

  const collectToPersonalSpaceWithCharacter = async () => {
    if (!collectCharacterId) return
    setCollectCharacterDialogOpen(false)
    await collectToPersonalSpace(collectCharacterId)
  }

  return {
    columns,
    setColumns,
    exporting,
    exportAll,
    collectToPersonalSpace,
    collectToPersonalSpaceWithCharacter,
    openCollectCharacterDialog,
    closeCollectCharacterDialog,
    collectCharacterDialogOpen,
    collectCharacterId,
    setCollectCharacterId,
    collectCharacterOptions,
  }
}
