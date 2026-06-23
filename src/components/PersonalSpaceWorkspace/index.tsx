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

  const materialSection = (section: (typeof workspace.resourceSections)[number]) => (
    <PersonalResourceSection
      key={`material-${section.kind}`}
      section={section}
      voiceAssets={workspace.voiceAssets}
      characterOptions={workspace.characterOptions}
      storyboardOptions={workspace.space.storyboardGroups.map((group) => ({ label: group.name, value: group.id }))}
      commonResourceUploadProps={workspace.commonResourceUploadProps}
      spriteResourceUploadProps={workspace.imageSpriteUploadProps}
      getAssetOptions={workspace.assetOptions}
      getAssetKindLabel={workspace.assetKindLabel}
      getStoryboardVoiceRefs={workspace.storyboardVoiceRefs}
      onRenameAsset={workspace.renameAsset}
      onChangeGroupName={workspace.changeAssetGroupName}
      onChangeDialogueText={workspace.changeVoiceDialogueText}
      onChangeEffectVoiceLinks={workspace.changeEffectVoiceLinks}
      onChangeVoiceCharacterLinks={workspace.changeVoiceCharacterLinks}
      onChangeVoiceStoryboardLinks={workspace.changeVoiceStoryboardLinks}
      onAddGroup={workspace.addAssetGroup}
      onRenameGroup={workspace.renameAssetGroup}
      onToggleGroupStar={workspace.toggleAssetGroupStar}
      onTransferGroup={workspace.transferAssetGroup}
      onDeleteGroup={workspace.deleteAssetGroup}
      onDeleteAsset={(assetId) => void workspace.deleteAsset(assetId)}
    />
  )

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
          <Tag color={workspace.directoryHandle ? 'success' : undefined}>
            {workspace.directoryHandle ? '已授权目录' : workspace.directoryHandleChecked ? '需要授权目录' : '检查授权目录'}
          </Tag>
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
          <span>公共图片</span>
          <strong>{workspace.assetCounts.image}</strong>
        </div>
        <div className="personal-stat">
          <span>精灵图</span>
          <strong>{workspace.assetCounts.sprite}</strong>
        </div>
        <div className="personal-stat">
          <span>配音</span>
          <strong>{workspace.assetCounts.voice}</strong>
        </div>
      </section>

      <Tabs
        className="personal-tabs"
        activeKey={workspace.activeModule}
        onChange={workspace.changeActiveModule}
        items={[
          {
            key: 'characters',
            label: '角色',
            disabled: !workspace.directoryHandle,
            children: (
              <PersonalCharacterPanel
                characters={workspace.space.characters}
                newCharacterName={workspace.newCharacterName}
                portraitAssets={workspace.portraitAssets}
                spriteAssets={workspace.spriteAssets}
                voiceAssets={workspace.voiceAssets}
                allAssets={workspace.space.assets}
                getStoryboardVoiceRefs={workspace.storyboardVoiceRefs}
                getPortraitUploadProps={workspace.portraitUploadProps}
                getSpriteUploadProps={workspace.spriteUploadProps}
                getVoiceUploadProps={workspace.voiceUploadProps}
                onNewCharacterNameChange={workspace.setNewCharacterName}
                onCreateCharacter={workspace.createCharacter}
                onRenameCharacter={workspace.renameCharacter}
                onToggleCharacterStar={workspace.toggleCharacterStar}
                onReorderCharacter={workspace.reorderCharacter}
                onDeleteCharacter={workspace.deleteCharacter}
                onAssignAsset={workspace.assignAsset}
                onUnassignAsset={workspace.unassignAsset}
                onMoveCharacterVoice={workspace.moveCharacterVoice}
              />
            ),
          },
          {
            key: 'storyboards',
            label: '剧情编排',
            disabled: !workspace.directoryHandle,
            children: (
              <PersonalStoryboardPanel
                storyboardGroups={workspace.space.storyboardGroups}
                newStoryboardName={workspace.newStoryboardName}
                characters={workspace.space.characters}
                voiceAssets={workspace.voiceAssets}
                allAssets={workspace.space.assets}
                getStoryboardLinkedCharacterIds={workspace.getStoryboardLinkedCharacterIds}
                getStoryboardVoiceUploadProps={workspace.storyboardVoiceUploadProps}
                onNewStoryboardNameChange={workspace.setNewStoryboardName}
                onCreateStoryboard={workspace.createStoryboard}
                onRenameStoryboard={workspace.renameStoryboard}
                onToggleStoryboardStar={workspace.toggleStoryboardStar}
                storyboardExportingKey={workspace.storyboardExportingKey}
                onExportStoryboardVoiceAssets={(groupId) => void workspace.exportStoryboardVoiceAssets(groupId)}
                onExportStoryboardCharacterAssets={(groupId) => void workspace.exportStoryboardCharacterAssets(groupId)}
                onExportAllStoryboardVoiceAssets={() => void workspace.exportAllStoryboardVoiceAssets()}
                onExportAllStoryboardCharacterAssets={() => void workspace.exportAllStoryboardCharacterAssets()}
                onDeleteStoryboard={workspace.deleteStoryboard}
                onAssignVoiceToStoryboard={workspace.assignVoiceToStoryboard}
                onUnassignStoryboardVoice={workspace.unassignStoryboardVoice}
                onAssignStoryboardVoiceCharacter={workspace.assignStoryboardVoiceCharacter}
                onUpdateStoryboardVoiceText={workspace.updateStoryboardVoice}
                onMoveStoryboardVoice={workspace.moveStoryboardVoice}
              />
            ),
          },
          {
            key: 'materials',
            label: '素材',
            disabled: !workspace.directoryHandle,
            children: (
              <Tabs
                className="personal-inner-tabs"
                items={[
                  {
                    key: 'images',
                    label: '公共图片',
                    children: workspace.resourceSections.filter((section) => section.kind === 'image').map(materialSection),
                  },
                  {
                    key: 'sprites',
                    label: '精灵图',
                    children: workspace.resourceSections.filter((section) => section.kind === 'sprite').map(materialSection),
                  },
                  {
                    key: 'voices',
                    label: '配音',
                    children: workspace.resourceSections.filter((section) => section.kind === 'voice').map(materialSection),
                  },
                ]}
              />
            ),
          },
          {
            key: 'settings',
            label: '设置',
            children: (
              <PersonalSettingsPanel
                storageDirectory={workspace.draftStorageDirectory}
                deleteResourcesWithContent={workspace.space.settings.deleteResourcesWithContent}
                savedSettings={workspace.savedSettings}
                directoryHandle={workspace.directoryHandle}
                onStorageDirectoryChange={workspace.setDraftStorageDirectory}
                onChooseStorageDirectory={() => void workspace.chooseStorageDirectory()}
                onOpenStorageDirectory={workspace.openStorageDirectory}
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
