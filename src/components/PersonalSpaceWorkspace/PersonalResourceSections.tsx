import type { UploadProps } from 'antd'
import { Empty, Tag } from 'antd'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { AssetGroupKind, PersonalResourceSectionConfig, PersonalSpaceAsset } from './personalSpaceModel'
import { PersonalResourceAssetRecord } from './PersonalResourceAssetRecord'
import { PersonalResourceGroupBlock } from './PersonalResourceGroupBlock'
import { PersonalAssetGroupControls } from './PersonalAssetGroupControls'
import { PersonalSpaceFilterControl } from './PersonalSpaceFilterControl'
import { usePersonalResourceGroups } from './usePersonalResourceGroups'
import { useRenameDrafts } from './useRenameDrafts'

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
  onRefreshProjectData?: () => void | Promise<void>
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

function EmptyBlock({ description }: { description: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
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
  onRefreshProjectData,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: PersonalResourceSectionProps) {
  const groupRename = useRenameDrafts<{ id: string; name: string }>((fromName, toName) => {
    onRenameGroup(section.kind, fromName, toName)
  })
  const resourceGroups = usePersonalResourceGroups(section)

  const renderAssetRecord = (item: PersonalSpaceAsset) => (
    <PersonalResourceAssetRecord
      key={item.id}
      sectionTitle={section.title}
      item={item}
      checked={resourceGroups.selectedAssetIdsForGroup(item.groupName).includes(item.id)}
      voiceAssets={voiceAssets}
      characterOptions={characterOptions}
      storyboardOptions={storyboardOptions}
      getAssetOptions={getAssetOptions}
      getAssetKindLabel={getAssetKindLabel}
      getStoryboardVoiceRefs={getStoryboardVoiceRefs}
      onSelectedChange={(checked) => resourceGroups.toggleAssetSelected(item, checked)}
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

  return (
    <section className={`space-panel${resourceGroups.isGroupedResourceSection ? ' voice-resource-panel' : ''}`}>
      <section className={`resource-section${resourceGroups.isGroupedResourceSection ? ' resource-section--voice' : ''}`} aria-label={section.title}>
        <div className="resource-section-head">
          <div>
            <p className="panel-copy">{section.description}</p>
          </div>
          <div className="resource-section-actions">
            <Tag>{section.assets.length} 个</Tag>
          </div>
        </div>
        {resourceGroups.isGroupedResourceSection ? (
          <div className="voice-group-toolbar">
            <PersonalSpaceFilterControl
              className="voice-group-filter"
              value={resourceGroups.selectedGroup}
              defaultValue={resourceGroups.defaultGroupFilter}
              options={resourceGroups.resourceGroupOptions}
              onlyStarred={resourceGroups.onlyStarredResourceGroups}
              onChange={resourceGroups.setSelectedGroup}
              onOnlyStarredChange={resourceGroups.setOnlyStarredResourceGroups}
              onRefresh={onRefreshProjectData}
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

        {resourceGroups.isGroupedResourceSection ? (
          <div className="voice-resource-list voice-group-list">
            {resourceGroups.visibleResourceGroups.map(({ groupName, assets }) => {
              const groupRenameItem = { id: groupName, name: groupName }
              const renameTo = groupRename.draftFor(groupRenameItem)
              const selectedAssetIds = resourceGroups.selectedAssetIdsForAssets(groupName, assets)
              const allGroupAssetsSelected = resourceGroups.allAssetsSelectedForGroup(groupName, assets)
              return (
                <PersonalResourceGroupBlock
                  key={groupName}
                  section={section}
                  groupName={groupName}
                  assets={assets}
                  selectedAssetIds={selectedAssetIds}
                  allGroupAssetsSelected={allGroupAssetsSelected}
                  canDeleteGroup={resourceGroups.canDeleteGroup}
                  renameTo={renameTo}
                  isRenamingGroup={groupRename.isRenaming(groupName)}
                  commonResourceUploadProps={commonResourceUploadProps}
                  spriteResourceUploadProps={spriteResourceUploadProps}
                  renderAssetRecord={renderAssetRecord}
                  onChangeGroupName={onChangeGroupName}
                  onToggleGroupStar={onToggleGroupStar}
                  onDeleteGroup={onDeleteGroup}
                  onDeleteAsset={onDeleteAsset}
                  onToggleGroupSelected={resourceGroups.toggleGroupSelected}
                  onRenameOpenChange={(open) => groupRename.openRename(groupRenameItem, open)}
                  onRenameDraftChange={(value) => groupRename.changeDraft(groupName, value)}
                  onConfirmRename={() => groupRename.confirmRename(groupRenameItem)}
                  onCancelRename={() => groupRename.cancelRename(groupName)}
                  onClearSelectedAssetIds={resourceGroups.clearSelectedAssetIdsForGroup}
                />
              )
            })}
          </div>
        ) : (
          <div className={`resource-list${resourceGroups.isVoiceSection ? ' voice-resource-list' : ''}`}>
            <section className="asset-group-block" key={resourceGroups.selectedGroup} aria-label={`${section.title}-${resourceGroups.selectedGroup}`}>
              <div className="asset-group-title">
                <strong>{resourceGroups.selectedGroup}</strong>
                <Tag>{resourceGroups.groupAssets.length} 个</Tag>
              </div>
              <div className="asset-group-records resource-asset-grid">
                {resourceGroups.groupAssets.map(renderAssetRecord)}
              </div>
            </section>
          </div>
        )}
      </section>
    </section>
  )
}
