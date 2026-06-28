import {
  type PersonalSpaceState,
} from './personalSpaceModel'
import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'
import {
  applyAssetDeleteResult,
  deleteAssetWithOptionalResources,
  exportAllStoryboardCharacterAssetsToTarget,
  exportAllStoryboardVoiceAssetsToTarget,
  exportStoryboardAssetToTarget,
  exportStoryboardCharacterAssetsToTarget,
  exportStoryboardVoiceAssetsToTarget,
  type ProjectResourceReadOptions,
  type StoryboardExportResult,
} from './personalSpaceResourceActions'
import {
  createPersonalSpaceAssetUploadActions,
  type PersonalSpaceAssetMessageApi,
} from './personalSpaceAssetUploadActions'
import { createPersonalSpaceUploadProps } from './personalSpaceUploadProps'

export interface PersonalSpaceAssetActionsOptions {
  messageApi: PersonalSpaceAssetMessageApi
  getSpace: () => PersonalSpaceState
  setSpace: (updater: (current: PersonalSpaceState) => PersonalSpaceState) => void
  getDirectoryHandle: () => PersonalSpaceDirectoryHandle | null
  getProjectResourceReadOptions: () => ProjectResourceReadOptions
  setStoryboardExportingKey: (key: string) => void
  spriteUploadBatchKeyByCharacter: { current: Record<string, string> }
  imageSpriteUploadBatchKey: { current: string | null }
}

export function createPersonalSpaceAssetActions(options: PersonalSpaceAssetActionsOptions) {
  const exportStoryboardWithStatus = async (
    key: string,
    action: () => Promise<StoryboardExportResult>,
    directoryMessage: string,
    fileMessage: string,
    errorMessage: string,
  ) => {
    options.setStoryboardExportingKey(key)
    try {
      const result = await action()
      void options.messageApi.success(result.kind === 'directory'
        ? `${directoryMessage}：${result.path}`
        : `${fileMessage}：${result.path}`)
    } catch (error) {
      void options.messageApi.error(`${errorMessage}：${String(error)}`)
    } finally {
      options.setStoryboardExportingKey('')
    }
  }

  const exportStoryboardAsset = async (id: string) => {
    await exportStoryboardWithStatus(
      `group-legacy-${id}`,
      () => exportStoryboardAssetToTarget(
        options.getSpace(),
        id,
        options.getDirectoryHandle(),
        options.getProjectResourceReadOptions(),
      ),
      '已导出剧情编排 ZIP',
      '已保存剧情编排 ZIP',
      '导出剧情编排资产失败',
    )
  }

  const exportStoryboardVoiceAssets = async (id: string) => {
    await exportStoryboardWithStatus(
      `group-voices-${id}`,
      () => exportStoryboardVoiceAssetsToTarget(
        options.getSpace(),
        id,
        options.getDirectoryHandle(),
        options.getProjectResourceReadOptions(),
      ),
      '已导出分组配音资产 ZIP',
      '已保存分组配音资产 ZIP',
      '导出分组配音资产失败',
    )
  }

  const exportStoryboardCharacterAssets = async (id: string) => {
    await exportStoryboardWithStatus(
      `group-characters-${id}`,
      () => exportStoryboardCharacterAssetsToTarget(
        options.getSpace(),
        id,
        options.getDirectoryHandle(),
        options.getProjectResourceReadOptions(),
      ),
      '已导出分组关联角色资产 ZIP',
      '已保存分组关联角色资产 ZIP',
      '导出分组关联角色资产失败',
    )
  }

  const exportAllStoryboardVoiceAssets = async () => {
    await exportStoryboardWithStatus(
      'all-voices',
      () => exportAllStoryboardVoiceAssetsToTarget(
        options.getSpace(),
        options.getDirectoryHandle(),
        options.getProjectResourceReadOptions(),
      ),
      '已导出所有分组配音资产 ZIP',
      '已保存所有分组配音资产 ZIP',
      '导出所有分组配音资产失败',
    )
  }

  const exportAllStoryboardCharacterAssets = async () => {
    await exportStoryboardWithStatus(
      'all-characters',
      () => exportAllStoryboardCharacterAssetsToTarget(
        options.getSpace(),
        options.getDirectoryHandle(),
        options.getProjectResourceReadOptions(),
      ),
      '已导出所有分组关联角色资产 ZIP',
      '已保存所有分组关联角色资产 ZIP',
      '导出所有分组关联角色资产失败',
    )
  }

  const {
    uploadCharacterPortrait,
    uploadCharacterSprite,
    uploadCharacterVoice,
    uploadStoryboardVoice,
    uploadCommonResource,
    uploadImageSprite,
  } = createPersonalSpaceAssetUploadActions({
    messageApi: options.messageApi,
    getSpace: options.getSpace,
    setSpace: options.setSpace,
    getDirectoryHandle: options.getDirectoryHandle,
  })

  const deleteAsset = async (assetId: string) => {
    const result = await deleteAssetWithOptionalResources(options.getSpace(), assetId, options.getDirectoryHandle())
    options.setSpace((current) => applyAssetDeleteResult(current, assetId, result))
    if (result.attemptedResourceDeletion) {
      if (result.pendingDeletedPaths.length > 0) {
        void options.messageApi.warning('部分资源未能删除，可能已经不存在。')
      } else {
        void options.messageApi.success('已删除资源和存储目录文件。')
      }
    }
  }

  const {
    commonResourceUploadProps,
    imageSpriteUploadProps,
    portraitUploadProps,
    spriteUploadProps,
    storyboardVoiceUploadProps,
    voiceUploadProps,
  } = createPersonalSpaceUploadProps({
    spriteUploadBatchKeyByCharacter: options.spriteUploadBatchKeyByCharacter,
    imageSpriteUploadBatchKey: options.imageSpriteUploadBatchKey,
    uploadCharacterPortrait,
    uploadCharacterSprite,
    uploadCharacterVoice,
    uploadStoryboardVoice,
    uploadCommonResource,
    uploadImageSprite,
  })

  return {
    deleteAsset,
    exportStoryboardAsset,
    exportStoryboardVoiceAssets,
    exportStoryboardCharacterAssets,
    exportAllStoryboardVoiceAssets,
    exportAllStoryboardCharacterAssets,
    portraitUploadProps,
    spriteUploadProps,
    voiceUploadProps,
    storyboardVoiceUploadProps,
    commonResourceUploadProps,
    imageSpriteUploadProps,
  }
}
