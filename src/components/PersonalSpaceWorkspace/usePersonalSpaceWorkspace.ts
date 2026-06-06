import { useEffect, useRef, useState } from 'react'
import type { UploadProps } from 'antd'

import {
  addAssetGroup,
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  deleteCharacterProfile,
  deleteAssetGroup,
  deleteStoryboardGroup,
  getStoryboardLinkedCharacterIds,
  linkEffectAssetToVoice,
  moveCharacterVoice,
  moveStoryboardVoice,
  readPersonalSpaceState,
  renameAssetGroup,
  renameCharacterProfile,
  renameStoryboardGroup,
  reorderCharacterProfile,
  reorderCharacterVoice,
  reorderStoryboardVoice,
  transferAssetGroup,
  type AssetGroupKind,
  type CommonAssetKind,
  updateCharacterAssetNote,
  unassignAssetFromCharacterColumn,
  unassignVoiceFromStoryboardGroup,
  updatePersonalSpaceAsset,
  updateStoryboardVoiceNote,
  updateStoryboardVoiceText,
  writePersonalSpaceState,
} from './personalSpaceModel'
import {
  applyAssetDeleteResult,
  createCommonResourceAssetForUpload,
  createPortraitAssetForUpload,
  createSpriteAssetForUpload,
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
  return '图片'
}

export function usePersonalSpaceWorkspace(messageApi: PersonalSpaceMessageApi) {
  const [space, setSpace] = useState(() => readPersonalSpaceState())
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newStoryboardName, setNewStoryboardName] = useState('')
  const spriteUploadBatchKeyByCharacter = useRef<Record<string, string>>({})
  const imageSpriteUploadBatchKey = useRef<string | null>(null)
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

  const exportStoryboardAsset = async (id: string) => {
    try {
      const result = await exportStoryboardAssetToTarget(space, id, settingsWorkspace.directoryHandle)
      void messageApi.success(result.kind === 'directory'
        ? `已导出剧情编排 ZIP：${result.path}`
        : '已下载剧情编排 ZIP')
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

  const uploadCharacterSprite = async (characterId: string, files: File[]) => {
    try {
      const storedAsset = await createSpriteAssetForUpload(space, files, settingsWorkspace.directoryHandle)
      setSpace((current) => {
        const withAsset = { ...current, assets: [storedAsset, ...current.assets] }
        return assignAssetToCharacterColumn(withAsset, characterId, storedAsset.id, 'sprite', ['角色精灵图'])
      })
      void messageApi.success('已上传角色精灵图')
    } catch (error) {
      void messageApi.error(`上传精灵图失败：${String(error)}`)
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

  const spriteUploadProps = (characterId: string): UploadProps => ({
    accept: '.png,.json',
    multiple: true,
    maxCount: 2,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: ({ fileList }) => {
      const files = fileList.flatMap((item) => item.originFileObj ? [item.originFileObj] : [])
      if (
        files.some((file) => file.name.toLowerCase().endsWith('.png')) &&
        files.some((file) => file.name.toLowerCase() === 'index.json')
      ) {
        const batchKey = files.map((file) => `${file.name}:${file.size}`).sort().join('|')
        if (spriteUploadBatchKeyByCharacter.current[characterId] === batchKey) return
        spriteUploadBatchKeyByCharacter.current[characterId] = batchKey
        window.setTimeout(() => {
          if (spriteUploadBatchKeyByCharacter.current[characterId] === batchKey) {
            delete spriteUploadBatchKeyByCharacter.current[characterId]
          }
        }, 1000)
        void uploadCharacterSprite(characterId, files)
      }
    },
  })

  const commonResourceUploadProps = (kind: CommonAssetKind): UploadProps => ({
    accept: kind === 'map' || kind === 'image' ? 'image/*' : kind === 'voice' ? 'audio/*' : '*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadCommonResource(kind, file as File)
      return false
    },
  })

  const imageSpriteUploadProps: UploadProps = {
    accept: '.png,.json',
    multiple: true,
    maxCount: 2,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: ({ fileList }) => {
      const files = fileList.flatMap((item) => item.originFileObj ? [item.originFileObj] : [])
      if (
        files.some((file) => file.name.toLowerCase().endsWith('.png')) &&
        files.some((file) => file.name.toLowerCase() === 'index.json')
      ) {
        const batchKey = files.map((file) => `${file.name}:${file.size}`).sort().join('|')
        if (imageSpriteUploadBatchKey.current === batchKey) return
        imageSpriteUploadBatchKey.current = batchKey
        window.setTimeout(() => {
          if (imageSpriteUploadBatchKey.current === batchKey) imageSpriteUploadBatchKey.current = null
        }, 1000)
        void (async () => {
          try {
            const storedAsset = await createSpriteAssetForUpload(space, files, settingsWorkspace.directoryHandle)
            setSpace((current) => ({ ...current, assets: [storedAsset, ...current.assets] }))
            void messageApi.success('已导入精灵图')
          } catch (error) {
            void messageApi.error(`导入精灵图失败：${String(error)}`)
          }
        })()
      }
    },
  }

  const imageAssets = space.assets.filter((asset) => asset.kind === 'image' && asset.groupName !== '角色肖像' && !asset.tags.includes('肖像'))
  const portraitAssets = imageAssets
  const spriteAssets = space.assets.filter((asset) => asset.kind === 'sprite')
  const voiceAssets = space.assets.filter((asset) => asset.kind === 'voice')
  const characterOptions = space.characters.map((character) => ({ label: character.name, value: character.id }))
  const assetOptions = (assets: typeof space.assets) => assets.map((asset) => ({ label: asset.name, value: asset.id }))
  const resourceSections = [
    {
      kind: 'image' as const,
      title: '公共图片',
      description: '单张图片、地图、场景图、抠图结果和特效参考图。',
      importLabel: '导入公共图片',
      emptyDescription: '还没有公共图片。导入图片或从工作台批量导入后会显示在这里。',
      groupNames: space.assetGroups.image,
      assets: imageAssets,
    },
    {
      kind: 'sprite' as const,
      title: '精灵图',
      description: '角色精灵图和特效精灵图，使用 PNG 与 index.json 成套管理。',
      importLabel: '导入精灵图',
      emptyDescription: '还没有精灵图。导入精灵图或从精灵图工作台收藏后会显示在这里。',
      groupNames: space.assetGroups.sprite,
      assets: spriteAssets,
    },
    {
      kind: 'voice' as const,
      title: '配音',
      description: '从配音工作台收藏或手动导入的角色语音、旁白和音效配音。',
      importLabel: '导入配音',
      emptyDescription: '还没有配音素材。生成或导入配音后可关联角色和剧情组。',
      groupNames: space.assetGroups.voice,
      assets: voiceAssets,
    },
  ]
  const assetCounts = {
    image: imageAssets.length,
    sprite: spriteAssets.length,
    voice: voiceAssets.length,
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
    exportStoryboardAsset,
    portraitUploadProps,
    spriteUploadProps,
    commonResourceUploadProps,
    imageSpriteUploadProps,
    assetOptions,
    assetKindLabel,
    storyboardVoiceRefs,
    renameCharacter: (characterId: string, name: string) => setSpace((current) => renameCharacterProfile(current, characterId, name)),
    reorderCharacter: (characterId: string, direction: 'up' | 'down') => setSpace((current) => reorderCharacterProfile(current, characterId, direction)),
    deleteCharacter: (characterId: string) => setSpace((current) => deleteCharacterProfile(current, characterId)),
    assignAsset: (characterId: string, assetId: string, column: 'portrait' | 'sprite' | 'voice', tags: string[]) => {
      setSpace((current) => assignAssetToCharacterColumn(current, characterId, assetId, column, tags))
    },
    unassignAsset: (characterId: string, assetId: string, column: 'portrait' | 'sprite' | 'voice') => {
      setSpace((current) => unassignAssetFromCharacterColumn(current, characterId, assetId, column))
    },
    updateCharacterAssetNote: (characterId: string, assetId: string, column: 'portrait' | 'sprite' | 'voice', noteName: string) => {
      setSpace((current) => updateCharacterAssetNote(current, characterId, assetId, column, noteName))
    },
    reorderCharacterVoice: (characterId: string, assetId: string, direction: 'up' | 'down') => {
      setSpace((current) => reorderCharacterVoice(current, characterId, assetId, direction))
    },
    moveCharacterVoice: (characterId: string, draggedAssetId: string, targetAssetId: string) => {
      setSpace((current) => moveCharacterVoice(current, characterId, draggedAssetId, targetAssetId))
    },
    renameStoryboard: (groupId: string, name: string) => setSpace((current) => renameStoryboardGroup(current, groupId, name)),
    deleteStoryboard: (groupId: string) => setSpace((current) => deleteStoryboardGroup(current, groupId)),
    getStoryboardLinkedCharacterIds: (groupId: string) => getStoryboardLinkedCharacterIds(space, groupId),
    assignVoiceToStoryboard: (groupId: string, assetId: string) => {
      setSpace((current) => assignVoiceToStoryboardGroup(current, groupId, assetId, ''))
    },
    unassignStoryboardVoice: (groupId: string, assetId: string) => {
      setSpace((current) => unassignVoiceFromStoryboardGroup(current, groupId, assetId))
    },
    assignStoryboardVoiceCharacter: (groupId: string, assetId: string, characterId: string) => {
      setSpace((current) => {
        const withVoiceLink = updatePersonalSpaceAsset(current, assetId, { linkedCharacterIds: [characterId] })
        return {
          ...withVoiceLink,
          storyboardGroups: withVoiceLink.storyboardGroups.map((group) => (
            group.id === groupId ? { ...group, characterIds: getStoryboardLinkedCharacterIds(withVoiceLink, groupId) } : group
          )),
        }
      })
    },
    updateStoryboardVoice: (groupId: string, assetId: string, text: string) => {
      setSpace((current) => updateStoryboardVoiceText(current, groupId, assetId, text))
    },
    updateStoryboardVoiceNote: (groupId: string, assetId: string, noteName: string) => {
      setSpace((current) => updateStoryboardVoiceNote(current, groupId, assetId, noteName))
    },
    reorderStoryboardVoice: (groupId: string, assetId: string, direction: 'up' | 'down') => {
      setSpace((current) => reorderStoryboardVoice(current, groupId, assetId, direction))
    },
    moveStoryboardVoice: (groupId: string, draggedAssetId: string, targetAssetId: string) => {
      setSpace((current) => moveStoryboardVoice(current, groupId, draggedAssetId, targetAssetId))
    },
    renameAsset: (assetId: string, name: string) => setSpace((current) => updatePersonalSpaceAsset(current, assetId, { name })),
    changeAssetGroupName: (assetId: string, groupName: string) => {
      setSpace((current) => updatePersonalSpaceAsset(current, assetId, { groupName }))
    },
    changeAssetTags: (assetId: string, tags: string[]) => setSpace((current) => updatePersonalSpaceAsset(current, assetId, { tags })),
    changeVoiceDialogueText: (assetId: string, dialogueText: string) => {
      setSpace((current) => updatePersonalSpaceAsset(current, assetId, { dialogueText }))
    },
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
    addAssetGroup: (kind: AssetGroupKind, name: string) => {
      setSpace((current) => addAssetGroup(current, kind, name))
    },
    renameAssetGroup: (kind: AssetGroupKind, fromName: string, toName: string) => {
      setSpace((current) => renameAssetGroup(current, kind, fromName, toName))
    },
    transferAssetGroup: (kind: AssetGroupKind, fromName: string, toName: string) => {
      setSpace((current) => transferAssetGroup(current, kind, fromName, toName))
    },
    deleteAssetGroup: (kind: AssetGroupKind, name: string, options: { deleteAssets?: boolean; transferToGroup?: string }) => {
      try {
        setSpace((current) => deleteAssetGroup(current, kind, name, options))
      } catch (error) {
        void messageApi.error(String(error).replace(/^Error: /, ''))
      }
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
