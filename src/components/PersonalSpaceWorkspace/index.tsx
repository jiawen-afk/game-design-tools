import { message, Tabs, Tag } from 'antd'
import { PersonalCharacterPanel } from './PersonalCharacterPanel'
import { PersonalResourceSection } from './PersonalResourceSections'
import { PersonalSettingsPanel } from './PersonalSettingsPanel'
import { PersonalStoryboardPanel } from './PersonalStoryboardPanel'
import { usePersonalSpaceWorkspace } from './usePersonalSpaceWorkspace'

import '../VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css'
import './personalSpace.css'

export default function PersonalSpaceWorkspace() {
  const [messageApi, contextHolder] = message.useMessage()
  const workspace = usePersonalSpaceWorkspace(messageApi)

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
          <Tag color={workspace.directoryHandle ? 'success' : undefined}>{workspace.directoryHandle ? '已授权目录' : '路径记录模式'}</Tag>
          <span>{workspace.draftStorageDirectory || '未设置资源存储目录'}</span>
        </div>
      </div>

      <section className="personal-overview" aria-label="个人空间总览">
        <div className="personal-stat">
          <span>角色</span>
          <strong>{workspace.space.characters.length}</strong>
        </div>
        <div className="personal-stat">
          <span>剧情组</span>
          <strong>{workspace.space.storyboardGroups.length}</strong>
        </div>
        <div className="personal-stat">
          <span>精灵图</span>
          <strong>{workspace.assetCounts.sprite}</strong>
        </div>
        <div className="personal-stat">
          <span>地图</span>
          <strong>{workspace.assetCounts.map}</strong>
        </div>
        <div className="personal-stat">
          <span>特效</span>
          <strong>{workspace.assetCounts.effect}</strong>
        </div>
        <div className="personal-stat">
          <span>配音</span>
          <strong>{workspace.assetCounts.voice}</strong>
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
                characters={workspace.space.characters}
                newCharacterName={workspace.newCharacterName}
                portraitAssets={workspace.portraitAssets}
                spriteAssets={workspace.spriteAssets}
                voiceAssets={workspace.voiceAssets}
                allAssets={workspace.space.assets}
                getAssetOptions={workspace.assetOptions}
                getStoryboardVoiceRefs={workspace.storyboardVoiceRefs}
                getPortraitUploadProps={workspace.portraitUploadProps}
                onNewCharacterNameChange={workspace.setNewCharacterName}
                onCreateCharacter={workspace.createCharacter}
                onRenameCharacter={workspace.renameCharacter}
                onReorderCharacter={workspace.reorderCharacter}
                onDeleteCharacter={workspace.deleteCharacter}
                onAssignAsset={workspace.assignAsset}
                onReorderCharacterVoice={workspace.reorderCharacterVoice}
              />
            ),
          },
          {
            key: 'storyboards',
            label: '剧情编排',
            children: (
              <PersonalStoryboardPanel
                storyboardGroups={workspace.space.storyboardGroups}
                newStoryboardName={workspace.newStoryboardName}
                characterOptions={workspace.characterOptions}
                voiceAssets={workspace.voiceAssets}
                allAssets={workspace.space.assets}
                getAssetOptions={workspace.assetOptions}
                onNewStoryboardNameChange={workspace.setNewStoryboardName}
                onCreateStoryboard={workspace.createStoryboard}
                onRenameStoryboard={workspace.renameStoryboard}
                onCopyStoryboardReference={workspace.copyStoryboardReference}
                onExportStoryboardAsset={(groupId) => void workspace.exportStoryboardAsset(groupId)}
                onDeleteStoryboard={workspace.deleteStoryboard}
                onSetStoryboardCharacters={workspace.setStoryboardCharacterIds}
                onAssignVoiceToStoryboard={workspace.assignVoiceToStoryboard}
                onUpdateStoryboardVoiceText={workspace.updateStoryboardVoice}
                onReorderStoryboardVoice={workspace.reorderStoryboardVoice}
              />
            ),
          },
          ...workspace.resourceSections.map((section) => ({
            key: `resource-${section.kind}`,
            label: section.title,
            children: (
              <PersonalResourceSection
                section={section}
                voiceAssets={workspace.voiceAssets}
                characterOptions={workspace.characterOptions}
                storyboardOptions={workspace.space.storyboardGroups.map((group) => ({ label: group.name, value: group.id }))}
                uploadProps={workspace.commonResourceUploadProps(section.kind)}
                getAssetOptions={workspace.assetOptions}
                getAssetKindLabel={workspace.assetKindLabel}
                getStoryboardVoiceRefs={workspace.storyboardVoiceRefs}
                onRenameAsset={workspace.renameAsset}
                onChangeGroupName={workspace.changeAssetGroupName}
                onChangeTags={workspace.changeAssetTags}
                onChangeEffectVoiceLinks={workspace.changeEffectVoiceLinks}
                onChangeVoiceCharacterLinks={workspace.changeVoiceCharacterLinks}
                onChangeVoiceStoryboardLinks={workspace.changeVoiceStoryboardLinks}
                onDeleteAsset={(assetId) => void workspace.deleteAsset(assetId)}
              />
            ),
          })),
          {
            key: 'settings',
            label: '设置',
            children: (
              <PersonalSettingsPanel
                storageDirectory={workspace.draftStorageDirectory}
                deleteResourcesWithContent={workspace.space.settings.deleteResourcesWithContent}
                savedSettings={workspace.savedSettings}
                directoryHandle={workspace.directoryHandle}
                pendingDeletedResourcePaths={workspace.space.pendingDeletedResourcePaths}
                onStorageDirectoryChange={workspace.setDraftStorageDirectory}
                onChooseStorageDirectory={() => void workspace.chooseStorageDirectory()}
                onDeleteResourcesWithContentChange={workspace.setDeleteResourcesWithContent}
                onSaveSettings={workspace.saveSettings}
              />
            ),
          },
        ]}
      />

    </section>
  )
}
