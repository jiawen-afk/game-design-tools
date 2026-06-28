import {
  assetKindLabel,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  type CommonAssetKind,
  type PersonalSpaceAsset,
  type PersonalSpaceState,
} from './personalSpaceModel'
import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'
import {
  createCommonResourceAssetForUpload as defaultCreateCommonResourceAssetForUpload,
  createPortraitAssetForUpload as defaultCreatePortraitAssetForUpload,
  createSpriteAssetForUpload as defaultCreateSpriteAssetForUpload,
  createVoiceAssetForUpload as defaultCreateVoiceAssetForUpload,
} from './personalSpaceResourceActions'

export interface PersonalSpaceAssetMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

export interface PersonalSpaceAssetUploadActionsOptions {
  messageApi: PersonalSpaceAssetMessageApi
  getSpace: () => PersonalSpaceState
  setSpace: (updater: (current: PersonalSpaceState) => PersonalSpaceState) => void
  getDirectoryHandle: () => PersonalSpaceDirectoryHandle | null
  createCommonResourceAssetForUpload?: typeof defaultCreateCommonResourceAssetForUpload
  createPortraitAssetForUpload?: typeof defaultCreatePortraitAssetForUpload
  createSpriteAssetForUpload?: typeof defaultCreateSpriteAssetForUpload
  createVoiceAssetForUpload?: typeof defaultCreateVoiceAssetForUpload
}

function prependAsset(state: PersonalSpaceState, asset: PersonalSpaceAsset) {
  return { ...state, assets: [asset, ...state.assets] }
}

export function createPersonalSpaceAssetUploadActions(options: PersonalSpaceAssetUploadActionsOptions) {
  const createCommonResourceAssetForUpload =
    options.createCommonResourceAssetForUpload ?? defaultCreateCommonResourceAssetForUpload
  const createPortraitAssetForUpload =
    options.createPortraitAssetForUpload ?? defaultCreatePortraitAssetForUpload
  const createSpriteAssetForUpload =
    options.createSpriteAssetForUpload ?? defaultCreateSpriteAssetForUpload
  const createVoiceAssetForUpload =
    options.createVoiceAssetForUpload ?? defaultCreateVoiceAssetForUpload

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

  return {
    uploadCharacterPortrait,
    uploadCharacterSprite,
    uploadCharacterVoice,
    uploadStoryboardVoice,
    uploadCommonResource,
    uploadImageSprite,
  }
}
