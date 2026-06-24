import type { UploadProps } from 'antd'
import { useEffect, useState } from 'react'
import { Button, Empty, Input, Tag } from 'antd'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { AssetGroupKind, PersonalResourceSectionConfig, PersonalSpaceAsset } from './personalSpaceModel'
import { PersonalResourceAssetRecord } from './PersonalResourceAssetRecord'
import { PersonalResourceGroupBlock } from './PersonalResourceGroupBlock'
import { PersonalSpaceFilterControl } from './PersonalSpaceFilterControl'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'

interface PersonalResourceSectionProps {
  section: PersonalResourceSectionConfig
  voiceAssets: PersonalSpaceAsset[]
  characterOptions: Array<{ label: string; value: string }>
  storyboardOptions: Array<{ label: string; value: string }>
  commonResourceUploadProps: (kind: AssetGroupKind, groupName?: string) => UploadProps
  spriteResourceUploadProps: (groupName?: string) => UploadProps
  getAssetOptions: (assets: PersonalSpaceAsset[]) => Array<{ label: string; value: string }>
  getAssetKindLabel: (kind: AssetGroupKind) => string
  getStoryboardVoiceRefs: (assetId: string) => string[]
  onRenameAsset: (assetId: string, name: string) => void
  onChangeGroupName: (assetId: string, groupName: string) => void
  onChangeDialogueText: (assetId: string, dialogueText: string) => void
  onChangeEffectVoiceLinks: (assetId: string, voiceIds: string[]) => void
  onChangeVoiceCharacterLinks: (assetId: string, characterIds: string[]) => void
  onChangeVoiceStoryboardLinks: (assetId: string, storyboardIds: string[]) => void
  onAddGroup: (kind: AssetGroupKind, name: string) => void
  onRenameGroup: (kind: AssetGroupKind, fromName: string, toName: string) => void
  onToggleGroupStar: (kind: AssetGroupKind, name: string) => void
  onDeleteGroup: (kind: AssetGroupKind, name: string, options: { deleteAssets?: boolean; transferToGroup?: string }) => void
  onDeleteAsset: (assetId: string) => void
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

function EmptyBlock({ description }: { description: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
}

function PersonalAssetGroupControls({
  kind,
  onAddGroup,
}: {
  kind: AssetGroupKind
  onAddGroup: (kind: AssetGroupKind, name: string) => void
}) {
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  const confirmCreateGroup = () => {
    if (!newGroupName.trim()) return
    onAddGroup(kind, newGroupName)
    setNewGroupName('')
    setCreatingGroup(false)
  }

  const cancelCreateGroup = () => {
    setNewGroupName('')
    setCreatingGroup(false)
  }

  return (
    <div className="asset-group-controls">
      <PersonalSpaceTextPopover
        open={creatingGroup}
        onOpenChange={(open) => {
          if (open) setCreatingGroup(true)
          else cancelCreateGroup()
        }}
        className="group-create-popover"
        value={newGroupName}
        ariaLabel="新分组名称"
        placeholder="新分组名称"
        confirmDisabled={!newGroupName.trim()}
        onValueChange={setNewGroupName}
        onConfirm={confirmCreateGroup}
        onCancel={cancelCreateGroup}
      >
        <Button onClick={() => setCreatingGroup(true)}>创建分组</Button>
      </PersonalSpaceTextPopover>
    </div>
  )
}

export function PersonalResourceSection({
  section,
  voiceAssets,
  characterOptions,
  storyboardOptions,
  commonResourceUploadProps,
  spriteResourceUploadProps,
  getAssetOptions,
  getAssetKindLabel,
  getStoryboardVoiceRefs,
  onRenameAsset,
  onChangeGroupName,
  onChangeDialogueText,
  onChangeEffectVoiceLinks,
  onChangeVoiceCharacterLinks,
  onChangeVoiceStoryboardLinks,
  onAddGroup,
  onRenameGroup,
  onToggleGroupStar,
  onDeleteGroup,
  onDeleteAsset,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: PersonalResourceSectionProps) {
  const [selectedGroup, setSelectedGroup] = useState('全部分组')
  const [onlyStarredGroups, setOnlyStarredGroups] = useState(false)
  const [selectedAssetIdsByGroup, setSelectedAssetIdsByGroup] = useState<Record<string, string[]>>({})
  const [renameGroupDrafts, setRenameGroupDrafts] = useState<Record<string, string>>({})
  const [renamingGroupName, setRenamingGroupName] = useState('')
  const groupOptions = section.groupNames.map((group) => ({ label: group, value: group }))
  const isVoiceSection = section.kind === 'voice'
  const isGroupedResourceSection = section.kind === 'image' || section.kind === 'sprite' || isVoiceSection
  const groupAssets = section.assets.filter((item) => item.groupName === selectedGroup)
  const canDeleteGroup = section.groupNames.length > 1
  const voiceGroupNames = section.groupNames
    .map((groupName) => ({
      groupName,
      assets: section.assets.filter((item) => item.groupName === groupName),
    }))
  const starFilteredGroupNames = onlyStarredGroups
    ? voiceGroupNames.filter((group) => section.starredGroupNames.includes(group.groupName))
    : voiceGroupNames
  const recentVoiceGroupNames = starFilteredGroupNames.slice(-20).reverse()
  const visibleVoiceGroupNames = (selectedGroup === '全部分组'
    ? recentVoiceGroupNames
    : starFilteredGroupNames.filter((group) => group.groupName === selectedGroup))

  const groupSelectionKey = (groupName: string) => `${section.kind}:${groupName}`
  const selectedAssetIdsForGroup = (groupName: string) => selectedAssetIdsByGroup[groupSelectionKey(groupName)] ?? []
  const updateSelectedAssetIdsForGroup = (groupName: string, assetIds: string[]) => {
    const key = groupSelectionKey(groupName)
    setSelectedAssetIdsByGroup((current) => ({ ...current, [key]: assetIds }))
  }
  const toggleAssetSelected = (item: PersonalSpaceAsset, checked: boolean) => {
    const selectedAssetIds = selectedAssetIdsForGroup(item.groupName)
    updateSelectedAssetIdsForGroup(item.groupName, checked
      ? Array.from(new Set(selectedAssetIds.concat(item.id)))
      : selectedAssetIds.filter((assetId) => assetId !== item.id))
  }
  const toggleGroupSelected = (groupName: string, assets: PersonalSpaceAsset[]) => {
    const selectedAssetIds = selectedAssetIdsForGroup(groupName)
    const assetIds = assets.map((asset) => asset.id)
    const allSelected = assetIds.length > 0 && assetIds.every((assetId) => selectedAssetIds.includes(assetId))
    updateSelectedAssetIdsForGroup(groupName, allSelected ? [] : assetIds)
  }

  const renderAssetRecord = (item: PersonalSpaceAsset) => (
    <PersonalResourceAssetRecord
      key={item.id}
      sectionTitle={section.title}
      item={item}
      checked={selectedAssetIdsForGroup(item.groupName).includes(item.id)}
      voiceAssets={voiceAssets}
      characterOptions={characterOptions}
      storyboardOptions={storyboardOptions}
      getAssetOptions={getAssetOptions}
      getAssetKindLabel={getAssetKindLabel}
      getStoryboardVoiceRefs={getStoryboardVoiceRefs}
      onSelectedChange={(checked) => toggleAssetSelected(item, checked)}
      onRenameAsset={onRenameAsset}
      onChangeDialogueText={onChangeDialogueText}
      onChangeEffectVoiceLinks={onChangeEffectVoiceLinks}
      onChangeVoiceCharacterLinks={onChangeVoiceCharacterLinks}
      onChangeVoiceStoryboardLinks={onChangeVoiceStoryboardLinks}
      onDeleteAsset={onDeleteAsset}
      projectObjectStorage={projectObjectStorage}
      projectAssetManager={projectAssetManager}
      projectId={projectId}
      projectMode={projectMode}
    />
  )

  useEffect(() => {
    if (isGroupedResourceSection && selectedGroup === '全部分组') return
    if (!section.groupNames.includes(selectedGroup)) {
      setSelectedGroup('全部分组')
    }
  }, [isGroupedResourceSection, section.groupNames, selectedGroup])

  return (
    <section className={`space-panel${isGroupedResourceSection ? ' voice-resource-panel' : ''}`}>
      <section className={`resource-section${isGroupedResourceSection ? ' resource-section--voice' : ''}`} aria-label={section.title}>
        <div className="resource-section-head">
          <div>
            <p className="panel-copy">{section.description}</p>
          </div>
          <div className="resource-section-actions">
            <Tag>{section.assets.length} 个</Tag>
          </div>
        </div>
        {isGroupedResourceSection ? (
          <div className="voice-group-toolbar">
            <PersonalSpaceFilterControl
              className="voice-group-filter"
              value={selectedGroup}
              defaultValue="全部分组"
              options={[
                { label: '最近创建的20个分组', value: '全部分组' },
                ...groupOptions,
              ]}
              onlyStarred={onlyStarredGroups}
              onChange={setSelectedGroup}
              onOnlyStarredChange={setOnlyStarredGroups}
            />
            <PersonalAssetGroupControls
              kind={section.kind}
              onAddGroup={onAddGroup}
            />
          </div>
        ) : (
          <PersonalAssetGroupControls
            kind={section.kind}
            onAddGroup={onAddGroup}
          />
        )}

        {isGroupedResourceSection ? (
          <div className="voice-resource-list voice-group-list">
            {visibleVoiceGroupNames.map(({ groupName, assets }) => {
              const renameTo = renameGroupDrafts[groupName] ?? ''
              const selectedAssetIds = selectedAssetIdsForGroup(groupName).filter((assetId) => assets.some((asset) => asset.id === assetId))
              const allGroupAssetsSelected = assets.length > 0 && assets.every((asset) => selectedAssetIds.includes(asset.id))
              return (
                <PersonalResourceGroupBlock
                  key={groupName}
                  section={section}
                  groupName={groupName}
                  assets={assets}
                  selectedAssetIds={selectedAssetIds}
                  allGroupAssetsSelected={allGroupAssetsSelected}
                  canDeleteGroup={canDeleteGroup}
                  renameTo={renameTo}
                  renamingGroupName={renamingGroupName}
                  commonResourceUploadProps={commonResourceUploadProps}
                  spriteResourceUploadProps={spriteResourceUploadProps}
                  renderAssetRecord={renderAssetRecord}
                  onChangeGroupName={onChangeGroupName}
                  onRenameGroup={onRenameGroup}
                  onToggleGroupStar={onToggleGroupStar}
                  onDeleteGroup={onDeleteGroup}
                  onDeleteAsset={onDeleteAsset}
                  onToggleGroupSelected={toggleGroupSelected}
                  onRenameDraftChange={(draftGroupName, value) => setRenameGroupDrafts((drafts) => ({ ...drafts, [draftGroupName]: value }))}
                  onRenameDraftSet={(draftGroupName, value) => setRenameGroupDrafts((drafts) => ({ ...drafts, [draftGroupName]: value }))}
                  onRenamingGroupNameChange={setRenamingGroupName}
                  onClearSelectedAssetIds={(draftGroupName) => updateSelectedAssetIdsForGroup(draftGroupName, [])}
                />
              )
            })}
          </div>
        ) : (
          <div className={`resource-list${isVoiceSection ? ' voice-resource-list' : ''}`}>
            <section className="asset-group-block" key={selectedGroup} aria-label={`${section.title}-${selectedGroup}`}>
              <div className="asset-group-title">
                <strong>{selectedGroup}</strong>
                <Tag>{groupAssets.length} 个</Tag>
              </div>
              <div className="asset-group-records resource-asset-grid">
                {groupAssets.map(renderAssetRecord)}
              </div>
            </section>
          </div>
        )}
      </section>
    </section>
  )
}
