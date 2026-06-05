import { useEffect, useState } from 'react'
import type { UploadProps } from 'antd'
import { message, Tabs, Tag } from 'antd'
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
  type PersonalSpaceState,
  updatePersonalSpaceAsset,
  updateStoryboardVoiceText,
  writePersonalSpaceState,
} from './personalSpaceModel'
import {
  type PersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  persistPersonalSpaceDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
} from './personalSpaceFileStorage'
import {
  applyAssetDeleteResult,
  createCommonResourceAssetForUpload,
  createPortraitAssetForUpload,
  deleteAssetWithOptionalResources,
  exportStoryboardAssetToTarget,
  pickPersonalSpaceDirectory,
} from './personalSpaceResourceActions'
import { PersonalCharacterPanel } from './PersonalCharacterPanel'
import { PersonalResourceSection } from './PersonalResourceSections'
import { PersonalSettingsPanel } from './PersonalSettingsPanel'
import { PersonalStoryboardPanel } from './PersonalStoryboardPanel'

import '../VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css'
import './personalSpace.css'

function assetKindLabel(kind: string) {
  if (kind === 'sprite') return '精灵图'
  if (kind === 'voice') return '配音'
  if (kind === 'effect') return '特效'
  return '地图'
}

export default function PersonalSpaceWorkspace() {
  const [space, setSpace] = useState<PersonalSpaceState>(() => readPersonalSpaceState())
  const [draftStorageDirectory, setDraftStorageDirectory] = useState(space.settings.storageDirectory)
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newStoryboardName, setNewStoryboardName] = useState('')
  const [directoryHandle, setDirectoryHandle] = useState<PersonalSpaceDirectoryHandle | null>(null)
  const [savedSettings, setSavedSettings] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    writePersonalSpaceState(space)
  }, [space])

  useEffect(() => {
    let mounted = true
    loadPersistedPersonalSpaceDirectoryHandle()
      .then((handle) => {
        if (!mounted || !handle) return
        setDirectoryHandle(handle)
        setPersonalSpaceDirectoryHandle(handle)
        if (!space.settings.storageDirectory) {
          setDraftStorageDirectory(handle.name)
          setSpace((current) => ({
            ...current,
            settings: { ...current.settings, storageDirectory: handle.name },
          }))
        }
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [space.settings.storageDirectory])

  const saveSettings = () => {
    setSpace((current) => ({
      ...current,
      settings: {
        ...current.settings,
        storageDirectory: draftStorageDirectory.trim(),
      },
    }))
    setSavedSettings(true)
    window.setTimeout(() => setSavedSettings(false), 1600)
    void messageApi.success('已保存个人空间设置')
  }

  const chooseStorageDirectory = async () => {
    try {
      const handle = await pickPersonalSpaceDirectory()
      if (!handle) {
        void messageApi.warning('当前浏览器不支持授权本地目录，请继续使用路径记录模式。')
        return
      }
      setDirectoryHandle(handle)
      setPersonalSpaceDirectoryHandle(handle)
      await persistPersonalSpaceDirectoryHandle(handle)
      setDraftStorageDirectory(handle.name)
      setSpace((current) => ({
        ...current,
        settings: { ...current.settings, storageDirectory: handle.name },
      }))
      void messageApi.success('已授权资源存储目录')
    } catch {
      void messageApi.warning('未选择资源存储目录')
    }
  }

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
      const result = await exportStoryboardAssetToTarget(space, id, directoryHandle)
      void messageApi.success(result.kind === 'directory'
        ? `已导出剧情编排资产：${result.path}`
        : '已下载剧情编排资产')
    } catch (error) {
      void messageApi.error(`导出剧情编排资产失败：${String(error)}`)
    }
  }

  const uploadCharacterPortrait = async (characterId: string, file: File) => {
    try {
      const storedAsset = await createPortraitAssetForUpload(space, file, directoryHandle)
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
      const storedAsset = await createCommonResourceAssetForUpload(space, kind, file, directoryHandle)
      setSpace((current) => ({ ...current, assets: [storedAsset, ...current.assets] }))
      void messageApi.success(`已导入${assetKindLabel(kind)}素材`)
    } catch (error) {
      void messageApi.error(`导入${assetKindLabel(kind)}素材失败：${String(error)}`)
    }
  }

  const deleteAsset = async (assetId: string) => {
    const result = await deleteAssetWithOptionalResources(space, assetId, directoryHandle)
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

  return (
    <section className="personal-space" aria-labelledby="personal-space-title">
      {contextHolder}
      <div className="personal-hero">
        <div>
          <p className="kicker">个人空间</p>
          <h2 id="personal-space-title">素材与编排管理</h2>
          <p>承接精灵图工作台和配音工作台产出的资源，把角色、素材、剧情组和本地目录串成同一个资产关系表。</p>
        </div>
        <div className="storage-status">
          <Tag color={directoryHandle ? 'success' : undefined}>{directoryHandle ? '已授权目录' : '路径记录模式'}</Tag>
          <span>{draftStorageDirectory || '未设置资源存储目录'}</span>
        </div>
      </div>

      <section className="personal-overview" aria-label="个人空间总览">
        <div className="personal-stat">
          <span>角色</span>
          <strong>{space.characters.length}</strong>
        </div>
        <div className="personal-stat">
          <span>剧情组</span>
          <strong>{space.storyboardGroups.length}</strong>
        </div>
        <div className="personal-stat">
          <span>精灵图</span>
          <strong>{assetCounts.sprite}</strong>
        </div>
        <div className="personal-stat">
          <span>地图</span>
          <strong>{assetCounts.map}</strong>
        </div>
        <div className="personal-stat">
          <span>特效</span>
          <strong>{assetCounts.effect}</strong>
        </div>
        <div className="personal-stat">
          <span>配音</span>
          <strong>{assetCounts.voice}</strong>
        </div>
      </section>

      <Tabs
        className="personal-tabs"
        items={[
          {
            key: 'characters',
            label: '角色',
            children: (
              <PersonalCharacterPanel
                characters={space.characters}
                newCharacterName={newCharacterName}
                portraitAssets={portraitAssets}
                spriteAssets={spriteAssets}
                voiceAssets={voiceAssets}
                allAssets={space.assets}
                getAssetOptions={assetOptions}
                getStoryboardVoiceRefs={storyboardVoiceRefs}
                getPortraitUploadProps={portraitUploadProps}
                onNewCharacterNameChange={setNewCharacterName}
                onCreateCharacter={createCharacter}
                onRenameCharacter={(characterId, name) => setSpace((current) => renameCharacterProfile(current, characterId, name))}
                onReorderCharacter={(characterId, direction) => setSpace((current) => reorderCharacterProfile(current, characterId, direction))}
                onDeleteCharacter={(characterId) => setSpace((current) => deleteCharacterProfile(current, characterId))}
                onAssignAsset={(characterId, assetId, column, tags) => setSpace((current) => assignAssetToCharacterColumn(current, characterId, assetId, column, tags))}
                onReorderCharacterVoice={(characterId, assetId, direction) => setSpace((current) => reorderCharacterVoice(current, characterId, assetId, direction))}
              />
            ),
          },
          {
            key: 'storyboards',
            label: '剧情编排',
            children: (
              <PersonalStoryboardPanel
                storyboardGroups={space.storyboardGroups}
                newStoryboardName={newStoryboardName}
                characterOptions={characterOptions}
                voiceAssets={voiceAssets}
                allAssets={space.assets}
                getAssetOptions={assetOptions}
                onNewStoryboardNameChange={setNewStoryboardName}
                onCreateStoryboard={createStoryboard}
                onRenameStoryboard={(groupId, name) => setSpace((current) => renameStoryboardGroup(current, groupId, name))}
                onCopyStoryboardReference={copyStoryboardReference}
                onExportStoryboardAsset={(groupId) => void exportStoryboardAsset(groupId)}
                onDeleteStoryboard={(groupId) => setSpace((current) => deleteStoryboardGroup(current, groupId))}
                onSetStoryboardCharacters={(groupId, characterIds) => setSpace((current) => setStoryboardCharacters(current, groupId, characterIds))}
                onAssignVoiceToStoryboard={(groupId, assetId) => setSpace((current) => assignVoiceToStoryboardGroup(current, groupId, assetId, ''))}
                onUpdateStoryboardVoiceText={(groupId, assetId, text) => setSpace((current) => updateStoryboardVoiceText(current, groupId, assetId, text))}
                onReorderStoryboardVoice={(groupId, assetId, direction) => setSpace((current) => reorderStoryboardVoice(current, groupId, assetId, direction))}
              />
            ),
          },
          ...resourceSections.map((section) => ({
            key: `resource-${section.kind}`,
            label: section.title,
            children: (
              <PersonalResourceSection
                section={section}
                voiceAssets={voiceAssets}
                characterOptions={characterOptions}
                storyboardOptions={space.storyboardGroups.map((group) => ({ label: group.name, value: group.id }))}
                uploadProps={commonResourceUploadProps(section.kind)}
                getAssetOptions={assetOptions}
                getAssetKindLabel={assetKindLabel}
                getStoryboardVoiceRefs={storyboardVoiceRefs}
                onRenameAsset={(assetId, name) => setSpace((current) => updatePersonalSpaceAsset(current, assetId, { name }))}
                onChangeGroupName={(assetId, groupName) => setSpace((current) => updatePersonalSpaceAsset(current, assetId, { groupName }))}
                onChangeTags={(assetId, tags) => setSpace((current) => updatePersonalSpaceAsset(current, assetId, { tags }))}
                onChangeEffectVoiceLinks={(assetId, voiceIds) => setSpace((current) => voiceIds.reduce((next, voiceId) => linkEffectAssetToVoice(next, assetId, voiceId), updatePersonalSpaceAsset(current, assetId, { linkedVoiceAssetIds: [] })))}
                onChangeVoiceCharacterLinks={(assetId, linkedCharacterIds) => setSpace((current) => updatePersonalSpaceAsset(current, assetId, { linkedCharacterIds }))}
                onChangeVoiceStoryboardLinks={(assetId, linkedStoryboardIds) => setSpace((current) => updatePersonalSpaceAsset(current, assetId, { linkedStoryboardIds }))}
                onDeleteAsset={(assetId) => void deleteAsset(assetId)}
              />
            ),
          })),
          {
            key: 'settings',
            label: '设置',
            children: (
              <PersonalSettingsPanel
                storageDirectory={draftStorageDirectory}
                deleteResourcesWithContent={space.settings.deleteResourcesWithContent}
                savedSettings={savedSettings}
                directoryHandle={directoryHandle}
                pendingDeletedResourcePaths={space.pendingDeletedResourcePaths}
                onStorageDirectoryChange={setDraftStorageDirectory}
                onChooseStorageDirectory={() => void chooseStorageDirectory()}
                onDeleteResourcesWithContentChange={(deleteResourcesWithContent) => setSpace((current) => ({
                  ...current,
                  settings: { ...current.settings, deleteResourcesWithContent },
                }))}
                onSaveSettings={saveSettings}
              />
            ),
          },
        ]}
      />

    </section>
  )
}
