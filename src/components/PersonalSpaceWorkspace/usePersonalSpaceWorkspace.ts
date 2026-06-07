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
  toggleAssetGroupStar,
  toggleCharacterStar,
  toggleStoryboardStar,
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
  createVoiceAssetForUpload,
  deleteAssetWithOptionalResources,
  exportAllStoryboardCharacterAssetsToTarget,
  exportAllStoryboardVoiceAssetsToTarget,
  exportStoryboardAssetToTarget,
  exportStoryboardCharacterAssetsToTarget,
  exportStoryboardVoiceAssetsToTarget,
} from './personalSpaceResourceActions'
import { usePersonalSpaceSettingsWorkspace } from './usePersonalSpaceSettingsWorkspace'

interface PersonalSpaceMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

type PersonalSpaceActiveModule = 'characters' | 'storyboards' | 'materials' | 'settings'

function assetKindLabel(kind: string) {
  if (kind === 'sprite') return '精灵图'
  if (kind === 'voice') return '配音'
  return '图片'
}

export function usePersonalSpaceWorkspace(messageApi: PersonalSpaceMessageApi) {
  const [space, setSpace] = useState(() => readPersonalSpaceState())
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newStoryboardName, setNewStoryboardName] = useState('')
  const [activeModule, setActiveModule] = useState<PersonalSpaceActiveModule>('characters')
  const [storyboardExportingKey, setStoryboardExportingKey] = useState('')
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

  useEffect(() => {
    if (settingsWorkspace.directoryHandleChecked && !settingsWorkspace.directoryHandle) {
      setActiveModule('settings')
    }
  }, [settingsWorkspace.directoryHandleChecked, settingsWorkspace.directoryHandle])

  const changeActiveModule = (key: string) => {
    const nextModule = key as PersonalSpaceActiveModule
    if (!settingsWorkspace.directoryHandle && nextModule !== 'settings') {
      setActiveModule('settings')
      void messageApi.warning('请先选择授权目录')
      return
    }
    setActiveModule(nextModule)
  }

  const createCharacter = () => {
    setSpace((current) => addCharacterProfile(current, newCharacterName))
    setNewCharacterName('')
  }

  const createStoryboard = () => {
    setSpace((current) => addStoryboardGroup(current, newStoryboardName))
    setNewStoryboardName('')
  }

  const exportStoryboardWithStatus = async (
    key: string,
    action: () => Promise<{ kind: 'directory' | 'download'; path?: string }>,
    directoryMessage: string,
    downloadMessage: string,
    errorMessage: string,
  ) => {
    setStoryboardExportingKey(key)
    try {
      const result = await action()
      void messageApi.success(result.kind === 'directory'
        ? `${directoryMessage}：${result.path}`
        : downloadMessage)
    } catch (error) {
      void messageApi.error(`${errorMessage}：${String(error)}`)
    } finally {
      setStoryboardExportingKey('')
    }
  }

  const exportStoryboardAsset = async (id: string) => {
    await exportStoryboardWithStatus(
      `group-legacy-${id}`,
      () => exportStoryboardAssetToTarget(space, id, settingsWorkspace.directoryHandle),
      '已导出剧情编排 ZIP',
      '已下载剧情编排 ZIP',
      '导出剧情编排资产失败',
    )
  }

  const exportStoryboardVoiceAssets = async (id: string) => {
    await exportStoryboardWithStatus(
      `group-voices-${id}`,
      () => exportStoryboardVoiceAssetsToTarget(space, id, settingsWorkspace.directoryHandle),
      '已导出分组配音资产 ZIP',
      '已下载分组配音资产 ZIP',
      '导出分组配音资产失败',
    )
  }

  const exportStoryboardCharacterAssets = async (id: string) => {
    await exportStoryboardWithStatus(
      `group-characters-${id}`,
      () => exportStoryboardCharacterAssetsToTarget(space, id, settingsWorkspace.directoryHandle),
      '已导出分组关联角色资产 ZIP',
      '已下载分组关联角色资产 ZIP',
      '导出分组关联角色资产失败',
    )
  }

  const exportAllStoryboardVoiceAssets = async () => {
    await exportStoryboardWithStatus(
      'all-voices',
      () => exportAllStoryboardVoiceAssetsToTarget(space, settingsWorkspace.directoryHandle),
      '已导出所有分组配音资产 ZIP',
      '已下载所有分组配音资产 ZIP',
      '导出所有分组配音资产失败',
    )
  }

  const exportAllStoryboardCharacterAssets = async () => {
    await exportStoryboardWithStatus(
      'all-characters',
      () => exportAllStoryboardCharacterAssetsToTarget(space, settingsWorkspace.directoryHandle),
      '已导出所有分组关联角色资产 ZIP',
      '已下载所有分组关联角色资产 ZIP',
      '导出所有分组关联角色资产失败',
    )
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

  const uploadCharacterVoice = async (characterId: string, file: File) => {
    try {
      const storedAsset = await createVoiceAssetForUpload(space, file, settingsWorkspace.directoryHandle)
      setSpace((current) => {
        const withAsset = { ...current, assets: [storedAsset, ...current.assets] }
        return assignAssetToCharacterColumn(withAsset, characterId, storedAsset.id, 'voice', ['角色配音'])
      })
      void messageApi.success('已上传角色配音')
    } catch (error) {
      void messageApi.error(`上传配音失败：${String(error)}`)
    }
  }

  const uploadStoryboardVoice = async (groupId: string, file: File) => {
    try {
      const storedAsset = await createVoiceAssetForUpload(space, file, settingsWorkspace.directoryHandle)
      setSpace((current) => {
        const withAsset = { ...current, assets: [storedAsset, ...current.assets] }
        return assignVoiceToStoryboardGroup(withAsset, groupId, storedAsset.id)
      })
      void messageApi.success('已导入并关联配音')
    } catch (error) {
      void messageApi.error(`导入配音失败：${String(error)}`)
    }
  }

  const uploadCommonResource = async (kind: CommonAssetKind, file: File, groupName?: string) => {
    try {
      const storedAsset = await createCommonResourceAssetForUpload(space, kind, file, settingsWorkspace.directoryHandle, groupName)
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
        void messageApi.warning('部分资源未能删除，可能已经不存在。')
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
            const storedAsset = await createSpriteAssetForUpload(space, files, settingsWorkspace.directoryHandle, groupName)
            setSpace((current) => ({ ...current, assets: [storedAsset, ...current.assets] }))
            void messageApi.success('已导入精灵图')
          } catch (error) {
            void messageApi.error(`导入精灵图失败：${String(error)}`)
          }
        })()
      }
    },
  })

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
      starredGroupNames: space.starredAssetGroups.image,
      assets: imageAssets,
    },
    {
      kind: 'sprite' as const,
      title: '精灵图',
      description: '角色精灵图和特效精灵图，使用 PNG 与 index.json 成套管理。',
      importLabel: '导入精灵图',
      emptyDescription: '还没有精灵图。导入精灵图或从精灵图工作台收藏后会显示在这里。',
      groupNames: space.assetGroups.sprite,
      starredGroupNames: space.starredAssetGroups.sprite,
      assets: spriteAssets,
    },
    {
      kind: 'voice' as const,
      title: '配音',
      description: '从配音工作台收藏或手动导入的角色语音、旁白和音效配音。',
      importLabel: '导入配音',
      emptyDescription: '还没有配音素材。生成或导入配音后可关联角色和剧情组。',
      groupNames: space.assetGroups.voice,
      starredGroupNames: space.starredAssetGroups.voice,
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
    activeModule,
    newCharacterName,
    newStoryboardName,
    storyboardExportingKey,
    portraitAssets,
    spriteAssets,
    voiceAssets,
    characterOptions,
    resourceSections,
    assetCounts,
    setNewCharacterName,
    setNewStoryboardName,
    changeActiveModule,
    createCharacter,
    createStoryboard,
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
    assetOptions,
    assetKindLabel,
    storyboardVoiceRefs,
    renameCharacter: (characterId: string, name: string) => setSpace((current) => renameCharacterProfile(current, characterId, name)),
    toggleCharacterStar: (characterId: string) => setSpace((current) => toggleCharacterStar(current, characterId)),
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
    toggleStoryboardStar: (groupId: string) => setSpace((current) => toggleStoryboardStar(current, groupId)),
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
    moveStoryboardVoice: (groupId: string, draggedAssetId: string, targetAssetId: string, placement: 'before' | 'after' = 'after') => {
      setSpace((current) => moveStoryboardVoice(current, groupId, draggedAssetId, targetAssetId, placement))
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
    toggleAssetGroupStar: (kind: AssetGroupKind, name: string) => {
      setSpace((current) => toggleAssetGroupStar(current, kind, name))
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
