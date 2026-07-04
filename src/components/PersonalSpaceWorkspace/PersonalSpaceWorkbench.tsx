import type { ReactNode } from 'react'
import { Button, Tabs, Tag } from 'antd'
import { SwapOutlined } from '@ant-design/icons'

import { PersonalCharacterPanel } from './PersonalCharacterPanel'
import { PersonalMaterialsPanel } from './PersonalMaterialsPanel'
import { PersonalSettingsPanel } from './PersonalSettingsPanel'
import { PersonalStoryboardPanel } from './PersonalStoryboardPanel'
import { ProjectRemoteSyncStatusPanel } from './ProjectRemoteSyncStatusPanel'
import type { usePersonalSpaceWorkspace } from './usePersonalSpaceWorkspace'

type PersonalSpaceWorkspaceState = ReturnType<typeof usePersonalSpaceWorkspace>

interface PersonalSpaceWorkbenchProps {
  workspace: PersonalSpaceWorkspaceState
  contextHolder: ReactNode
}

export function PersonalSpaceWorkbench({ workspace, contextHolder }: PersonalSpaceWorkbenchProps) {
  const workbenchDisabled = !workspace.enabledProjectId || !workspace.directoryHandle

  return (
    <section className="personal-space" aria-labelledby="personal-space-title">
      {contextHolder}
      <div className="personal-hero">
        <div>
          <p className="kicker">项目空间</p>
          <h2 id="personal-space-title">项目资产与编排管理</h2>
          <p>按项目管理角色、素材、剧情组和资源目录。启用的项目会成为当前所有数据保存的目标。</p>
        </div>
        <div className="project-current-control">
          <span className="field-label">当前项目</span>
          <strong>{workspace.activeProject?.name ?? '未启用项目'}</strong>
          <div className="project-current-tags">
            <Tag color={workspace.activeProject?.mode === 'local' ? 'processing' : workspace.activeProject?.mode === 'remote' ? 'success' : undefined}>
              {workspace.activeProject?.mode === 'local' ? '本地模式' : workspace.activeProject?.mode === 'remote' ? '远程模式' : '未选择项目'}
            </Tag>
            <Tag color={workspace.directoryHandle ? 'success' : undefined}>
              {workspace.directoryHandle ? '已授权目录' : workspace.directoryHandleChecked ? '需要授权目录' : '检查授权目录'}
            </Tag>
          </div>
          <span className="project-current-path">{workspace.draftStorageDirectory || '未设置资源存储目录'}</span>
          <Button icon={<SwapOutlined />} onClick={workspace.openProjectManagement}>
            切换项目空间
          </Button>
        </div>
      </div>

      <section className="personal-overview" aria-label="项目空间总览">
        <div className="personal-stat">
          <span>项目</span>
          <strong>{workspace.projects.length}</strong>
        </div>
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
        onChange={workspace.changeActiveModuleAndRefresh}
        items={[
          {
            key: 'characters',
            label: '角色',
            disabled: workbenchDisabled,
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
                onRenameAsset={workspace.renameAsset}
                onAssignAsset={workspace.assignAsset}
                onUnassignAsset={workspace.unassignAsset}
                onMoveCharacterVoice={workspace.moveCharacterVoice}
                onRefreshProjectData={workspace.refreshActiveProjectData}
                projectObjectStorage={workspace.projectObjectStorage}
                projectAssetManager={workspace.projectAssetManager}
                projectId={workspace.activeProject?.id}
                projectMode={workspace.activeProject?.mode}
              />
            ),
          },
          {
            key: 'storyboards',
            label: '剧情编排',
            disabled: workbenchDisabled,
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
                onRefreshProjectData={workspace.refreshActiveProjectData}
                projectObjectStorage={workspace.projectObjectStorage}
                projectAssetManager={workspace.projectAssetManager}
                projectId={workspace.activeProject?.id}
                projectMode={workspace.activeProject?.mode}
              />
            ),
          },
          {
            key: 'materials',
            label: '素材',
            disabled: workbenchDisabled,
            children: (
              <PersonalMaterialsPanel
                resourceSections={workspace.resourceSections}
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
                onChangeSoundSpriteLinks={workspace.changeSoundSpriteLinks}
                onAddGroup={workspace.addAssetGroup}
                onRenameGroup={workspace.renameAssetGroup}
                onToggleGroupStar={workspace.toggleAssetGroupStar}
                onDeleteGroup={workspace.deleteAssetGroup}
                onDeleteAsset={workspace.deleteAsset}
                onRefreshProjectData={workspace.refreshActiveProjectData}
                projectObjectStorage={workspace.projectObjectStorage}
                projectAssetManager={workspace.projectAssetManager}
                projectId={workspace.activeProject?.id}
                projectMode={workspace.activeProject?.mode}
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
      <ProjectRemoteSyncStatusPanel
        status={workspace.syncStatus}
        activeProjectId={workspace.enabledProjectId}
        retryingProjectId={workspace.syncingProjectId}
        onRetryActiveProject={workspace.syncActiveProjectNow}
      />
    </section>
  )
}
