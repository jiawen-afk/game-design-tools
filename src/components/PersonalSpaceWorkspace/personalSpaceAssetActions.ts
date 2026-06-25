import type { UploadProps } from 'antd'

import {
  assetKindLabel,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  type CommonAssetKind,
  type PersonalSpaceState,
} from './personalSpaceModel'
import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'
import {
  applyAssetDeleteResult,
  createCommonResourceAssetForUpload,
  createPortraitAssetForUpload,
  createSpriteAssetForUpload,
  createVoiceAssetForUpload,
  deleteAssetWithOptionalResources,
  exportAllStoryboardCharacterAssetsToTarget,
  exportAllStoryboardVoiceAssetsToTarget,
  exportStoryboardAssetToTarget,
  exportStoryboardCharacterAssetsToTarget,
  exportStoryboardVoiceAssetsToTarget,
  type ProjectResourceReadOptions,
  type StoryboardExportResult,
} from './personalSpaceResourceActions'
import { createSpriteUploadBatch } from './personalSpaceUploadModel'

interface PersonalSpaceAssetMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

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

function prependAsset(state: PersonalSpaceState, asset: PersonalSpaceState['assets'][number]) {
  return { ...state, assets: [asset, ...state.assets] }
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

  const uploadCharacterPortrait = async (characterId: string, file: File) => {
    try {
      const storedAsset = await createPortraitAssetForUpload(options.getSpace(), file, options.getDirectoryHandle())
      options.setSpace((current) => assignAssetToCharacterColumn(
        prependAsset(current, storedAsset),
        characterId,
        storedAsset.id,
        'portrait',
      ))
      void options.messageApi.success('已上传角色肖像')
    } catch (error) {
      void options.messageApi.error(`上传肖像失败：${String(error)}`)
    }
  }

  const uploadCharacterSprite = async (characterId: string, files: File[]) => {
    try {
      const storedAsset = await createSpriteAssetForUpload(options.getSpace(), files, options.getDirectoryHandle())
      options.setSpace((current) => assignAssetToCharacterColumn(
        prependAsset(current, storedAsset),
        characterId,
        storedAsset.id,
        'sprite',
      ))
      void options.messageApi.success('已上传角色精灵图')
    } catch (error) {
      void options.messageApi.error(`上传精灵图失败：${String(error)}`)
    }
  }

  const uploadCharacterVoice = async (characterId: string, file: File) => {
    try {
      const storedAsset = await createVoiceAssetForUpload(options.getSpace(), file, options.getDirectoryHandle())
      options.setSpace((current) => assignAssetToCharacterColumn(
        prependAsset(current, storedAsset),
        characterId,
        storedAsset.id,
        'voice',
      ))
      void options.messageApi.success('已上传角色配音')
    } catch (error) {
      void options.messageApi.error(`上传配音失败：${String(error)}`)
    }
  }

  const uploadStoryboardVoice = async (groupId: string, file: File) => {
    try {
      const storedAsset = await createVoiceAssetForUpload(options.getSpace(), file, options.getDirectoryHandle())
      options.setSpace((current) => assignVoiceToStoryboardGroup(
        prependAsset(current, storedAsset),
        groupId,
        storedAsset.id,
      ))
      void options.messageApi.success('已导入并关联配音')
    } catch (error) {
      void options.messageApi.error(`导入配音失败：${String(error)}`)
    }
  }

  const uploadCommonResource = async (kind: CommonAssetKind, file: File, groupName?: string) => {
    try {
      const storedAsset = await createCommonResourceAssetForUpload(
        options.getSpace(),
        kind,
        file,
        options.getDirectoryHandle(),
        groupName,
      )
      options.setSpace((current) => prependAsset(current, storedAsset))
      void options.messageApi.success(`已导入${assetKindLabel(kind)}素材`)
    } catch (error) {
      void options.messageApi.error(`导入${assetKindLabel(kind)}素材失败：${String(error)}`)
    }
  }

  const uploadImageSprite = async (files: File[], groupName?: string) => {
    try {
      const storedAsset = await createSpriteAssetForUpload(options.getSpace(), files, options.getDirectoryHandle(), groupName)
      options.setSpace((current) => prependAsset(current, storedAsset))
      void options.messageApi.success('已导入精灵图')
    } catch (error) {
      void options.messageApi.error(`导入精灵图失败：${String(error)}`)
    }
  }

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

  const portraitUploadProps = (characterId: string): UploadProps => ({
    accept: 'image/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadCharacterPortrait(characterId, file as File)
      return false
    },
  })

  const spriteUploadProps = (characterId: string): UploadProps => ({
    accept: '.png,.json',
    multiple: true,
    maxCount: 2,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: ({ fileList }) => {
      const batch = createSpriteUploadBatch(fileList)
      if (batch) {
        if (options.spriteUploadBatchKeyByCharacter.current[characterId] === batch.batchKey) return
        options.spriteUploadBatchKeyByCharacter.current[characterId] = batch.batchKey
        window.setTimeout(() => {
          if (options.spriteUploadBatchKeyByCharacter.current[characterId] === batch.batchKey) {
            delete options.spriteUploadBatchKeyByCharacter.current[characterId]
          }
        }, 1000)
        void uploadCharacterSprite(characterId, batch.files)
      }
    },
  })

  const voiceUploadProps = (characterId: string): UploadProps => ({
    accept: 'audio/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadCharacterVoice(characterId, file as File)
      return false
    },
  })

  const storyboardVoiceUploadProps = (groupId: string): UploadProps => ({
    accept: 'audio/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadStoryboardVoice(groupId, file as File)
      return false
    },
  })

  const commonResourceUploadProps = (kind: CommonAssetKind, groupName?: string): UploadProps => ({
    accept: kind === 'map' || kind === 'image' ? 'image/*' : kind === 'voice' ? 'audio/*' : '*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadCommonResource(kind, file as File, groupName)
      return false
    },
  })

  const imageSpriteUploadProps = (groupName?: string): UploadProps => ({
    accept: '.png,.json',
    multiple: true,
    maxCount: 2,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: ({ fileList }) => {
      const batch = createSpriteUploadBatch(fileList)
      if (batch) {
        if (options.imageSpriteUploadBatchKey.current === batch.batchKey) return
        options.imageSpriteUploadBatchKey.current = batch.batchKey
        window.setTimeout(() => {
          if (options.imageSpriteUploadBatchKey.current === batch.batchKey) {
            options.imageSpriteUploadBatchKey.current = null
          }
        }, 1000)
        void uploadImageSprite(batch.files, groupName)
      }
    },
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
