import type { UploadProps } from 'antd'
import { useEffect, useState } from 'react'
import { Button, Dropdown, Empty, Input, Modal, Popconfirm, Select, Space, Tag, Upload } from 'antd'
import { DownOutlined, StarFilled, StarOutlined, UploadOutlined } from '@ant-design/icons'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { AssetGroupKind, PersonalResourceSectionConfig, PersonalSpaceAsset } from './personalSpaceModel'
import { PersonalResourceAssetRecord } from './PersonalResourceAssetRecord'
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
  onTransferGroup: (kind: AssetGroupKind, fromName: string, toName: string) => void
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

function VoiceGroupTransferControl({
  kind,
  groupName,
  groupNames,
  selectedAssetIds,
  allGroupAssetsSelected,
  onChangeGroupName,
  onDeleteGroup,
}: {
  kind: AssetGroupKind
  groupName: string
  groupNames: string[]
  selectedAssetIds: string[]
  allGroupAssetsSelected: boolean
  onChangeGroupName: (assetId: string, groupName: string) => void
  onDeleteGroup: (kind: AssetGroupKind, name: string, options: { deleteAssets?: boolean; transferToGroup?: string }) => void
}) {
  const [transferTo, setTransferTo] = useState('')
  const transferOptions = groupNames.filter((group) => group !== groupName).map((group) => ({ label: group, value: group }))
  const confirmTransferAndDeleteGroup = () => {
    Modal.confirm({
      title: '转移资产并删除分组',
      content: '会先将资产转移到目标分组，然后删除当前分组。',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        onDeleteGroup(kind, groupName, { transferToGroup: transferTo })
        setTransferTo('')
      },
    })
  }

  return (
    <Space.Compact className="voice-group-transfer-actions">
      <Select
        size="small"
        value={transferTo || undefined}
        options={transferOptions}
        placeholder="转移到"
        aria-label={`${groupName}转移资产目标分组`}
        onChange={setTransferTo}
      />
      <Button
        size="small"
        disabled={!transferTo || selectedAssetIds.length === 0}
        onClick={() => {
          selectedAssetIds.forEach((assetId) => onChangeGroupName(assetId, transferTo))
          setTransferTo('')
        }}
      >
        转移资产
      </Button>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'transfer-and-delete',
              label: '转移并删除该分组',
              disabled: !transferTo || selectedAssetIds.length === 0 || !allGroupAssetsSelected,
              danger: true,
            },
          ],
          onClick: ({ key }) => {
            if (key === 'transfer-and-delete') confirmTransferAndDeleteGroup()
          },
        }}
      >
        <Button
          size="small"
          disabled={!transferTo || selectedAssetIds.length === 0 || !allGroupAssetsSelected}
          icon={<DownOutlined />}
          aria-label="展开转移资产更多操作"
        />
      </Dropdown>
    </Space.Compact>
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
                <section className="asset-group-block voice-group-block" key={groupName} aria-label={`${section.title}-${groupName}`}>
                  <div className="asset-group-title voice-group-header">
                    <div className="voice-group-actions">
                      <div className="voice-group-left-actions">
                        <Button
                          size="small"
                          type="text"
                          className="star-toggle-button"
                          icon={section.starredGroupNames.includes(groupName) ? <StarFilled /> : <StarOutlined />}
                          aria-label={section.starredGroupNames.includes(groupName) ? '取消星标分组' : '星标分组'}
                          onClick={() => onToggleGroupStar(section.kind, groupName)}
                        />
                        <Button
                          size="small"
                          type={allGroupAssetsSelected ? 'primary' : 'default'}
                          disabled={assets.length === 0}
                          onClick={() => toggleGroupSelected(groupName, assets)}
                        >
                          {allGroupAssetsSelected ? '取消全选' : '全选'}
                        </Button>
                        <strong>{groupName}</strong>
                        <div className="voice-group-admin-actions">
                          <PersonalSpaceTextPopover
                            open={renamingGroupName === groupName}
                            onOpenChange={(open) => {
                              setRenamingGroupName(open ? groupName : '')
                              setRenameGroupDrafts((drafts) => ({ ...drafts, [groupName]: open ? (drafts[groupName] ?? groupName) : '' }))
                            }}
                            className="group-name-rename-popover"
                            value={renameTo}
                            ariaLabel={`${groupName}重命名分组`}
                            placeholder="新分组名"
                            confirmDisabled={!renameTo.trim()}
                            onValueChange={(value) => setRenameGroupDrafts((drafts) => ({ ...drafts, [groupName]: value }))}
                            onConfirm={() => {
                              onRenameGroup(section.kind, groupName, renameTo)
                              setRenameGroupDrafts((drafts) => ({ ...drafts, [groupName]: '' }))
                              setRenamingGroupName('')
                            }}
                            onCancel={() => {
                              setRenameGroupDrafts((drafts) => ({ ...drafts, [groupName]: '' }))
                              setRenamingGroupName('')
                            }}
                          >
                            <Button
                              size="small"
                              onClick={() => {
                                setRenamingGroupName(groupName)
                                setRenameGroupDrafts((drafts) => ({ ...drafts, [groupName]: drafts[groupName] ?? groupName }))
                              }}
                            >
                              重命名分组
                            </Button>
                          </PersonalSpaceTextPopover>
                        </div>
                        <Tag>{assets.length} 个</Tag>
                      </div>
                      <div className="voice-group-right-actions">
                        <Upload {...(section.kind === 'sprite' ? spriteResourceUploadProps(groupName) : commonResourceUploadProps(section.kind, groupName))}>
                          <Button size="small" icon={<UploadOutlined />}>上传到分组</Button>
                        </Upload>
                        <VoiceGroupTransferControl
                          kind={section.kind}
                          groupName={groupName}
                          groupNames={section.groupNames}
                          selectedAssetIds={selectedAssetIds}
                          allGroupAssetsSelected={allGroupAssetsSelected}
                          onChangeGroupName={onChangeGroupName}
                          onDeleteGroup={onDeleteGroup}
                        />
                        <Popconfirm
                          title="删除选中资产"
                          description={`将删除已选中的 ${selectedAssetIds.length} 个资产，并移除角色和剧情中的关联。`}
                          okText="删除选中资产"
                          cancelText="取消"
                          onConfirm={() => {
                            selectedAssetIds.forEach((assetId) => onDeleteAsset(assetId))
                            updateSelectedAssetIdsForGroup(groupName, [])
                          }}
                        >
                          <Button size="small" danger disabled={selectedAssetIds.length === 0}>删除选中资产</Button>
                        </Popconfirm>
                        <Popconfirm
                          title="删除分组"
                          description={canDeleteGroup ? '删除分组会同时删除分组下的资产。' : '至少保留一个分组。'}
                          okText="删除分组"
                          cancelText="取消"
                          onConfirm={() => onDeleteGroup(section.kind, groupName, { deleteAssets: true })}
                        >
                          <Button size="small" danger disabled={!canDeleteGroup}>删除分组</Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                  {assets.length === 0 ? (
                    <EmptyBlock description="当前分组还没有资源。" />
                  ) : (
                    <div className="asset-group-records resource-asset-grid">
                      {assets.map(renderAssetRecord)}
                    </div>
                  )}
                </section>
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
