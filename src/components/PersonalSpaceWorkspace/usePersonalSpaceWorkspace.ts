import { useEffect, useState } from 'react'
import type { UploadProps } from 'antd'

import {
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  deleteCharacterProfile,
  deleteStoryboardGroup,
  exportStoryboardReference,
  linkEffectAssetToVoice,
  readPersonalSpaceState,
  renameCharacterProfile,
  renameStoryboardGroup,
  reorderCharacterProfile,
  reorderCharacterVoice,
  reorderStoryboardVoice,
  setStoryboardCharacters,
  type CommonAssetKind,
  updatePersonalSpaceAsset,
  updateStoryboardVoiceText,
  writePersonalSpaceState,
} from './personalSpaceModel'
import {
  applyAssetDeleteResult,
  createCommonResourceAssetForUpload,
  createPortraitAssetForUpload,
  deleteAssetWithOptionalResources,
  exportStoryboardAssetToTarget,
} from './personalSpaceResourceActions'
import { usePersonalSpaceSettingsWorkspace } from './usePersonalSpaceSettingsWorkspace'

interface PersonalSpaceMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

function assetKindLabel(kind: string) {
  if (kind === 'sprite') return '精灵图'
  if (kind === 'voice') return '配音'
  if (kind === 'effect') return '特效'
  return '地图'
}

export function usePersonalSpaceWorkspace(messageApi: PersonalSpaceMessageApi) {
  const [space, setSpace] = useState(() => readPersonalSpaceState())
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newStoryboardName, setNewStoryboardName] = useState('')
  const settingsWorkspace = usePersonalSpaceSettingsWorkspace({
    storageDirectory: space.settings.storageDirectory,
    setSpace,
    messageApi,
  })

  useEffect(() => {
    writePersonalSpaceState(space)
  }, [space])

  const createCharacter = () => {
    setSpace((current) => addCharacterProfile(current, newCharacterName))
    setNewCharacterName('')
  }

  const createStoryboard = () => {
    setSpace((current) => addStoryboardGroup(current, newStoryboardName))
    setNewStoryboardName('')
  }

  const copyStoryboardReference = (id: string) => {
    const exported = exportStoryboardReference(space, id)
    void navigator.clipboard?.writeText(JSON.stringify(exported, null, 2))
  }

  const exportStoryboardAsset = async (id: string) => {
    try {
      const result = await exportStoryboardAssetToTarget(space, id, settingsWorkspace.directoryHandle)
      void messageApi.success(result.kind === 'directory'
        ? `已导出剧情编排资产：${result.path}`
        : '已下载剧情编排资产')
    } catch (error) {
      void messageApi.error(`导出剧情编排资产失败：${String(error)}`)
    }
  }

  const uploadCharacterPortrait = async (characterId: string, file: File) => {
    try {
      const storedAsset = await createPortraitAssetForUpload(space, file, settingsWorkspace.directoryHandle)
      setSpace((current) => {
        const withAsset = { ...current, assets: [storedAsset, ...current.assets] }
        return assignAssetToCharacterColumn(withAsset, characterId, storedAsset.id, 'portrait', ['肖像'])
      })
      void messageApi.success('已上传角色肖像')
    } catch (error) {
      void messageApi.error(`上传肖像失败：${String(error)}`)
    }
  }

  const uploadCommonResource = async (kind: CommonAssetKind, file: File) => {
    try {
      const storedAsset = await createCommonResourceAssetForUpload(space, kind, file, settingsWorkspace.directoryHandle)
      setSpace((current) => ({ ...current, assets: [storedAsset, ...current.assets] }))
      void messageApi.success(`已导入${assetKindLabel(kind)}素材`)
    } catch (error) {
      void messageApi.error(`导入${assetKindLabel(kind)}素材失败：${String(error)}`)
    }
  }

  const deleteAsset = async (assetId: string) => {
    const result = await deleteAssetWithOptionalResources(space, assetId, settingsWorkspace.directoryHandle)
    setSpace((current) => applyAssetDeleteResult(current, assetId, result))
    if (result.attemptedResourceDeletion) {
      if (result.pendingDeletedPaths.length > 0) {
        void messageApi.warning('部分资源未能删除，已记录到待删除资源路径。')
      } else {
        void messageApi.success('已删除资源和存储目录文件。')
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

  const commonResourceUploadProps = (kind: CommonAssetKind): UploadProps => ({
    accept: kind === 'map' ? 'image/*' : kind === 'voice' ? 'audio/*' : '*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadCommonResource(kind, file as File)
      return false
    },
  })

  const portraitAssets = space.assets.filter((asset) => asset.kind === 'map' && (asset.groupName === '角色肖像' || asset.tags.includes('肖像')))
  const mapAssets = space.assets.filter((asset) => asset.kind === 'map' && asset.groupName !== '角色肖像' && !asset.tags.includes('肖像'))
  const effectAssets = space.assets.filter((asset) => asset.kind === 'effect')
  const spriteAssets = space.assets.filter((asset) => asset.kind === 'sprite')
  const voiceAssets = space.assets.filter((asset) => asset.kind === 'voice')
  const characterOptions = space.characters.map((character) => ({ label: character.name, value: character.id }))
  const assetOptions = (assets: typeof space.assets) => assets.map((asset) => ({ label: asset.name, value: asset.id }))
  const resourceSections = [
    {
      kind: 'map' as const,
      title: '地图素材',
      description: '地图、场景底图、地块参考和关卡背景。',
      importLabel: '导入地图素材',
      emptyDescription: '还没有地图素材。导入地图或从工作台收藏后会显示在这里。',
      assets: mapAssets,
    },
    {
      kind: 'effect' as const,
      title: '特效素材',
      description: '技能特效、命中特效、环境特效和可关联音效的表现资源。',
      importLabel: '导入特效素材',
      emptyDescription: '还没有特效素材。导入特效后可继续关联配音素材。',
      assets: effectAssets,
    },
    {
      kind: 'voice' as const,
      title: '配音素材',
      description: '从配音工作台收藏或手动导入的角色语音、旁白和音效配音。',
      importLabel: '导入配音素材',
      emptyDescription: '还没有配音素材。生成或导入配音后可关联角色和剧情组。',
      assets: voiceAssets,
    },
  ]
  const assetCounts = {
    sprite: spriteAssets.length,
    voice: voiceAssets.length,
    map: mapAssets.length,
    effect: effectAssets.length,
  }

  const storyboardVoiceRefs = (assetId: string) => space.storyboardGroups
    .flatMap((group) => group.voiceEntries
      .filter((entry) => entry.assetId === assetId)
      .map((entry) => `${group.name} #${entry.order + 1}`))

  return {
    space,
    ...settingsWorkspace,
    newCharacterName,
    newStoryboardName,
    portraitAssets,
    spriteAssets,
    voiceAssets,
    characterOptions,
    resourceSections,
    assetCounts,
    setNewCharacterName,
    setNewStoryboardName,
    createCharacter,
    createStoryboard,
    copyStoryboardReference,
    exportStoryboardAsset,
    portraitUploadProps,
    commonResourceUploadProps,
    assetOptions,
    assetKindLabel,
    storyboardVoiceRefs,
    renameCharacter: (characterId: string, name: string) => setSpace((current) => renameCharacterProfile(current, characterId, name)),
    reorderCharacter: (characterId: string, direction: 'up' | 'down') => setSpace((current) => reorderCharacterProfile(current, characterId, direction)),
    deleteCharacter: (characterId: string) => setSpace((current) => deleteCharacterProfile(current, characterId)),
    assignAsset: (characterId: string, assetId: string, column: 'portrait' | 'sprite' | 'voice', tags: string[]) => {
      setSpace((current) => assignAssetToCharacterColumn(current, characterId, assetId, column, tags))
    },
    reorderCharacterVoice: (characterId: string, assetId: string, direction: 'up' | 'down') => {
      setSpace((current) => reorderCharacterVoice(current, characterId, assetId, direction))
    },
    renameStoryboard: (groupId: string, name: string) => setSpace((current) => renameStoryboardGroup(current, groupId, name)),
    deleteStoryboard: (groupId: string) => setSpace((current) => deleteStoryboardGroup(current, groupId)),
    setStoryboardCharacterIds: (groupId: string, characterIds: string[]) => {
      setSpace((current) => setStoryboardCharacters(current, groupId, characterIds))
    },
    assignVoiceToStoryboard: (groupId: string, assetId: string) => {
      setSpace((current) => assignVoiceToStoryboardGroup(current, groupId, assetId, ''))
    },
    updateStoryboardVoice: (groupId: string, assetId: string, text: string) => {
      setSpace((current) => updateStoryboardVoiceText(current, groupId, assetId, text))
    },
    reorderStoryboardVoice: (groupId: string, assetId: string, direction: 'up' | 'down') => {
      setSpace((current) => reorderStoryboardVoice(current, groupId, assetId, direction))
    },
    renameAsset: (assetId: string, name: string) => setSpace((current) => updatePersonalSpaceAsset(current, assetId, { name })),
    changeAssetGroupName: (assetId: string, groupName: string) => {
      setSpace((current) => updatePersonalSpaceAsset(current, assetId, { groupName }))
    },
    changeAssetTags: (assetId: string, tags: string[]) => setSpace((current) => updatePersonalSpaceAsset(current, assetId, { tags })),
    changeEffectVoiceLinks: (assetId: string, voiceIds: string[]) => {
      setSpace((current) => voiceIds.reduce(
        (next, voiceId) => linkEffectAssetToVoice(next, assetId, voiceId),
        updatePersonalSpaceAsset(current, assetId, { linkedVoiceAssetIds: [] }),
      ))
    },
    changeVoiceCharacterLinks: (assetId: string, linkedCharacterIds: string[]) => {
      setSpace((current) => updatePersonalSpaceAsset(current, assetId, { linkedCharacterIds }))
    },
    changeVoiceStoryboardLinks: (assetId: string, linkedStoryboardIds: string[]) => {
      setSpace((current) => updatePersonalSpaceAsset(current, assetId, { linkedStoryboardIds }))
    },
    deleteAsset,
    setDeleteResourcesWithContent: (deleteResourcesWithContent: boolean) => {
      setSpace((current) => ({
        ...current,
        settings: { ...current.settings, deleteResourcesWithContent },
      }))
    },
  }
}
