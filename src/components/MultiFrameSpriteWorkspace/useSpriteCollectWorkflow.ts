import { useState } from 'react'
import { message } from 'antd'

import { buildSpriteExportPackage } from './spriteExportPackage'
import { clampInt } from './numberUtils'
import type { PlaybackMode } from './playbackModel'
import type { FrameItem } from './types'
import type { SpriteUpscaleExportPlan, SpriteUpscaleResultMap } from './spriteUpscaleModel'
import type { UpscaleOptions } from '../ImageProcessingWorkspace/imageUpscaleModel'
import type { ImageExportEncodingSettings } from '../ImageProcessingWorkspace/imageProcessingModel'
import {
  assignAssetToCharacterColumn,
  collectPersonalSpaceAsset,
  createSpriteAssetFromExport,
  hashText,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { readCurrentProjectSpaceState } from '../PersonalSpaceWorkspace/projectSpaceState'
import { persistCurrentProjectSpaceState } from '../PersonalSpaceWorkspace/currentProjectSpacePersistence'
import { showCurrentProjectSpaceSyncWarning } from '../PersonalSpaceWorkspace/projectSpacePersistenceMessages'
import { getPersonalSpaceDirectoryHandle } from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { writeAssetResourcesWithGeneratedCoverToDirectory } from '../PersonalSpaceWorkspace/personalSpaceResourceActions'
import { personalSpaceDirectoryRequiredMessage } from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'
import { getDesktopApi } from '../../desktopApi'

interface UseSpriteCollectWorkflowParams {
  columns: number
  exportEncoding: ImageExportEncodingSettings
  fps: number
  playbackMode: PlaybackMode
  upscaleOptions?: UpscaleOptions
  upscaleResultsByFrameId: SpriteUpscaleResultMap
  validateExportableFrames: () => SpriteUpscaleExportPlan<FrameItem> | null
  visibleFrames: FrameItem[]
  setExporting: (exporting: boolean) => void
}

export function useSpriteCollectWorkflow({
  columns,
  exportEncoding,
  fps,
  playbackMode,
  upscaleOptions,
  upscaleResultsByFrameId,
  validateExportableFrames,
  visibleFrames,
  setExporting,
}: UseSpriteCollectWorkflowParams) {
  const [collectCharacterDialogOpen, setCollectCharacterDialogOpen] = useState(false)
  const [collectCharacterId, setCollectCharacterId] = useState<string | null>(null)
  const [collectCharacterOptions, setCollectCharacterOptions] = useState<Array<{ label: string; value: string }>>([])

  const spriteExportSourceKey = (exportPlan: SpriteUpscaleExportPlan<FrameItem>) => `sprite-export:${hashText(JSON.stringify({
    canvasWidth: exportPlan.canvasWidth,
      canvasHeight: exportPlan.canvasHeight,
      columns: clampInt(columns, 1, Math.max(1, visibleFrames.length)),
      exportEncoding,
      fps,
    playbackMode,
    upscale: exportPlan.usingUpscale ? {
      mode: exportPlan.upscaleMode,
      options: upscaleOptions ?? null,
      frames: visibleFrames.map((item) => {
        const result = upscaleResultsByFrameId[item.id]
        return {
          id: item.id,
          mode: result?.mode,
          scale: result?.scale,
          sourceMatteUrl: result?.sourceMatteUrl,
          matteRevision: result?.matteRevision,
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
      const { spriteBlob, indexJson, spriteFileName, spriteMimeType } = await buildSpriteExportPackage({
        columns,
        visibleFrames: exportPlan.visibleFrames,
        canvasWidth: exportPlan.canvasWidth,
        canvasHeight: exportPlan.canvasHeight,
        fps,
        playbackMode,
        exportEncoding,
        encoderApi: getDesktopApi(),
      })
      const spritePath = URL.createObjectURL(spriteBlob)
      const indexBlob = new Blob([indexJson], { type: 'application/json' })
      const indexPath = URL.createObjectURL(indexBlob)
      const space = readCurrentProjectSpaceState()
      const baseAsset = createSpriteAssetFromExport({
        name: spriteFileName,
        spritePath,
        indexPath,
        sourceKey: spriteExportSourceKey(exportPlan),
      })
      const spriteFile = new File([spriteBlob], spriteFileName, { type: spriteBlob.type || spriteMimeType })
      const asset = await writeAssetResourcesWithGeneratedCoverToDirectory(space, directoryHandle, baseAsset, spriteFile, [
        { name: spriteFileName, data: spriteFile },
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
