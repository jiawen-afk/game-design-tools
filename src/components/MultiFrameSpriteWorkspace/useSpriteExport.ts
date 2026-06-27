import { useState } from 'react'
import { message } from 'antd'

import { canvasToBlob, loadImage } from './imagePipeline'
import { buildMultiFrameSpriteIndex } from './model'
import { clampInt } from './numberUtils'
import type { PlaybackMode } from './playbackModel'
import type { FrameItem } from './types'
import {
  buildSpriteUpscaleExportPlan,
  type SpriteUpscaleExportPlan,
  type SpriteUpscaleResultMap,
} from './spriteUpscaleModel'
import type { UpscaleOptions } from '../ImageProcessingWorkspace/imageUpscaleModel'
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
} from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { writeAssetResourcesWithGeneratedCoverToDirectory } from '../PersonalSpaceWorkspace/personalSpaceResourceActions'
import { personalSpaceDirectoryRequiredMessage } from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'
import { getDesktopApi } from '../../desktopApi'

export interface UseSpriteExportParams {
  frames: FrameItem[]
  visibleFrames: FrameItem[]
  canvasWidth: number
  canvasHeight: number
  fps: number
  playbackMode: PlaybackMode
  upscaleEnabled?: boolean
  upscaleResultsByFrameId?: SpriteUpscaleResultMap
  upscaleOptions?: UpscaleOptions
}

export type SpriteExportViewModel = ReturnType<typeof useSpriteExport>

type SpriteExportFrameSource = Pick<FrameItem, 'id' | 'sourceName'> & { composedUrl: string }

async function buildSpriteExportPackage(input: {
  columns: number
  visibleFrames: SpriteExportFrameSource[]
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
  upscaleEnabled = false,
  upscaleResultsByFrameId = {},
  upscaleOptions,
}: UseSpriteExportParams) {
  const [columns, setColumns] = useState(4)
  const [exporting, setExporting] = useState(false)
  const [collectCharacterDialogOpen, setCollectCharacterDialogOpen] = useState(false)
  const [collectCharacterId, setCollectCharacterId] = useState<string | null>(null)
  const [collectCharacterOptions, setCollectCharacterOptions] = useState<Array<{ label: string; value: string }>>([])

  const buildExportPlan = (): SpriteUpscaleExportPlan<FrameItem> => buildSpriteUpscaleExportPlan(
    visibleFrames,
    upscaleResultsByFrameId,
    upscaleEnabled,
    canvasWidth,
    canvasHeight,
    upscaleOptions?.scale ?? 1
  )

  const validateExportableFrames = () => {
    if (frames.length === 0) {
      message.warning('请先上传图片')
      return null
    }
    if (visibleFrames.length === 0) {
      message.warning('没有可导出的可见帧')
      return null
    }
    const missing = visibleFrames.find((item) => !item.composedUrl)
    if (missing) {
      message.warning('仍有帧未处理完成，请稍后再导出')
      return null
    }
    const exportPlan = buildExportPlan()
    if (exportPlan.usingUpscale && exportPlan.missingFrameNames.length > 0) {
      message.warning('高清化已开启，请先批量高清化所有可见帧后再导出')
      return null
    }
    return exportPlan
  }

  const exportAll = async () => {
    const exportPlan = validateExportableFrames()
    if (!exportPlan) return
    setExporting(true)
    try {
      const { default: JSZip } = await import('jszip')
      const { spriteBlob, indexJson } = await buildSpriteExportPackage({
        columns,
        visibleFrames: exportPlan.visibleFrames,
        canvasWidth: exportPlan.canvasWidth,
        canvasHeight: exportPlan.canvasHeight,
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

  const spriteExportSourceKey = (exportPlan: SpriteUpscaleExportPlan<FrameItem>) => `sprite-export:${hashText(JSON.stringify({
    canvasWidth: exportPlan.canvasWidth,
    canvasHeight: exportPlan.canvasHeight,
    columns: clampInt(columns, 1, Math.max(1, visibleFrames.length)),
    fps,
    playbackMode,
    upscale: exportPlan.usingUpscale ? {
      options: upscaleOptions ?? null,
      frames: visibleFrames.map((item) => {
        const result = upscaleResultsByFrameId[item.id]
        return {
          id: item.id,
          sourceComposedUrl: result?.sourceComposedUrl,
          composedRevision: result?.composedRevision,
          width: result?.width,
          height: result?.height,
        }
      }),
    } : false,
    frames: visibleFrames.map((item) => ({
      id: item.id,
      sourceName: item.sourceName,
      width: item.sourceWidth,
      height: item.sourceHeight,
    })),
  }))}`

  const collectToPersonalSpace = async (characterId?: string) => {
    const exportPlan = validateExportableFrames()
    if (!exportPlan) return
    const directoryHandle = getPersonalSpaceDirectoryHandle()
    if (!directoryHandle) {
      message.warning(personalSpaceDirectoryRequiredMessage)
      return
    }
    setExporting(true)
    try {
      const { spriteBlob, indexJson } = await buildSpriteExportPackage({
        columns,
        visibleFrames: exportPlan.visibleFrames,
        canvasWidth: exportPlan.canvasWidth,
        canvasHeight: exportPlan.canvasHeight,
        fps,
        playbackMode,
      })
      const spritePath = URL.createObjectURL(spriteBlob)
      const indexBlob = new Blob([indexJson], { type: 'application/json' })
      const indexPath = URL.createObjectURL(indexBlob)
      const space = readCurrentProjectSpaceState()
      const baseAsset = createSpriteAssetFromExport({
        name: 'sprite.png',
        spritePath,
        indexPath,
        sourceKey: spriteExportSourceKey(exportPlan),
      })
      const spriteFile = new File([spriteBlob], 'sprite.png', { type: spriteBlob.type || 'image/png' })
      const asset = await writeAssetResourcesWithGeneratedCoverToDirectory(space, directoryHandle, baseAsset, spriteFile, [
        { name: 'sprite.png', data: spriteFile },
        { name: 'index.json', data: indexBlob },
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
