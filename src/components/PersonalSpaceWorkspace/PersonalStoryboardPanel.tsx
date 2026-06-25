import type { UploadProps } from 'antd'
import { useMemo } from 'react'
import { Button, Empty } from 'antd'
import { ExportOutlined } from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset, StoryboardGroup } from './personalSpaceModel'
import { StoryboardGroupCard } from './StoryboardGroupCard'
import { CreateNamePopoverButton } from './CreateNamePopoverButton'
import { PersonalSpaceFilterControl } from './PersonalSpaceFilterControl'
import { useCreateNamePopover } from './useCreateNamePopover'
import { useRecentStarredFilter } from './useRecentStarredFilter'
import { storyboardVoiceEntriesForPreview, type StoryboardVoiceDropPlacement } from './storyboardVoiceDrag'
import { useStoryboardVoiceDragDrop } from './useStoryboardVoiceDragDrop'
import { useStoryboardVoicePlayback } from './useStoryboardVoicePlayback'
import { useRenameDrafts } from './useRenameDrafts'
import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'

interface PersonalStoryboardPanelProps {
  storyboardGroups: StoryboardGroup[]
  newStoryboardName: string
  characters: CharacterProfile[]
  voiceAssets: PersonalSpaceAsset[]
  allAssets: PersonalSpaceAsset[]
  getStoryboardLinkedCharacterIds: (groupId: string) => string[]
  getStoryboardVoiceUploadProps: (groupId: string) => UploadProps
  onNewStoryboardNameChange: (name: string) => void
  onCreateStoryboard: () => void
  onRenameStoryboard: (groupId: string, name: string) => void
  onToggleStoryboardStar: (groupId: string) => void
  storyboardExportingKey: string
  onExportStoryboardVoiceAssets: (groupId: string) => void
  onExportStoryboardCharacterAssets: (groupId: string) => void
  onExportAllStoryboardVoiceAssets: () => void
  onExportAllStoryboardCharacterAssets: () => void
  onDeleteStoryboard: (groupId: string) => void
  onAssignVoiceToStoryboard: (groupId: string, assetId: string) => void
  onUnassignStoryboardVoice: (groupId: string, assetId: string) => void
  onAssignStoryboardVoiceCharacter: (groupId: string, assetId: string, characterId: string) => void
  onUpdateStoryboardVoiceText: (groupId: string, assetId: string, text: string) => void
  onMoveStoryboardVoice: (groupId: string, draggedAssetId: string, targetAssetId: string, placement?: StoryboardVoiceDropPlacement) => void
  onRefreshProjectData?: () => void | Promise<void>
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

export function PersonalStoryboardPanel({
  storyboardGroups,
  newStoryboardName,
  characters,
  voiceAssets,
  allAssets,
  getStoryboardLinkedCharacterIds,
  getStoryboardVoiceUploadProps,
  onNewStoryboardNameChange,
  onCreateStoryboard,
  onRenameStoryboard,
  onToggleStoryboardStar,
  storyboardExportingKey,
  onExportStoryboardVoiceAssets,
  onExportStoryboardCharacterAssets,
  onExportAllStoryboardVoiceAssets,
  onExportAllStoryboardCharacterAssets,
  onDeleteStoryboard,
  onAssignVoiceToStoryboard,
  onUnassignStoryboardVoice,
  onAssignStoryboardVoiceCharacter,
  onUpdateStoryboardVoiceText,
  onMoveStoryboardVoice,
  onRefreshProjectData,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: PersonalStoryboardPanelProps) {
  const characterById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters])
  const voiceById = useMemo(() => new Map(voiceAssets.map((asset) => [asset.id, asset])), [voiceAssets])
  const characterOptions = characters.map((character) => ({ label: character.name, value: character.id }))
  const {
    currentPlayback,
    playStoryboardFrom,
    stopStoryboardPlayback,
  } = useStoryboardVoicePlayback({
    storyboardGroups,
    voiceAssets,
    projectObjectStorage,
    projectAssetManager,
    projectId,
    projectMode,
  })
  const {
    draggedStoryboardVoice,
    dropTargetStoryboardVoice,
    previewStoryboardVoiceOrders,
    startStoryboardVoiceDrag,
    endStoryboardVoiceDrag,
    previewStoryboardVoiceListDrop,
    cancelStoryboardVoiceListDrop,
    dropStoryboardVoiceOnList,
  } = useStoryboardVoiceDragDrop({
    storyboardGroups,
    onMoveStoryboardVoice,
  })
  const createStoryboard = useCreateNamePopover({
    value: newStoryboardName,
    onValueChange: onNewStoryboardNameChange,
    onConfirm: onCreateStoryboard,
  })
  const storyboardRename = useRenameDrafts(onRenameStoryboard)
  const isExportingStoryboard = Boolean(storyboardExportingKey)
  const {
    selectedFilter: selectedStoryboardFilter,
    setSelectedFilter: setSelectedStoryboardFilter,
    onlyStarred: onlyStarredStoryboards,
    setOnlyStarred: setOnlyStarredStoryboards,
    filterOptions: storyboardFilterOptions,
    visibleItems: visibleStoryboardGroups,
  } = useRecentStarredFilter({
    items: storyboardGroups,
    defaultValue: '全部剧情组',
    defaultLabel: '最近创建的20个剧情组',
    getId: (group) => group.id,
    getName: (group) => group.name,
    getStarred: (group) => group.starred,
  })

  return (
      <section className="space-panel">
      <div className="storyboard-panel-toolbar">
        <div className="storyboard-toolbar-left">
          <CreateNamePopoverButton
            open={createStoryboard.open}
            onOpenChange={createStoryboard.onOpenChange}
            className="storyboard-create-popover"
            value={newStoryboardName}
            ariaLabel="新剧情分组名称"
            placeholder="新剧情分组名称"
            buttonText="创建剧情组"
            onValueChange={onNewStoryboardNameChange}
            onConfirm={createStoryboard.confirmCreateName}
            onCancel={createStoryboard.cancelCreateName}
          />
          <PersonalSpaceFilterControl
            className="storyboard-filter-control"
            value={selectedStoryboardFilter}
            defaultValue="全部剧情组"
            options={storyboardFilterOptions}
            onlyStarred={onlyStarredStoryboards}
            onChange={setSelectedStoryboardFilter}
            onOnlyStarredChange={setOnlyStarredStoryboards}
            onRefresh={onRefreshProjectData}
          />
        </div>
        <div className="storyboard-global-actions">
          <Button
            icon={<ExportOutlined />}
            loading={storyboardExportingKey === 'all-voices'}
            disabled={isExportingStoryboard || storyboardGroups.length === 0}
            onClick={onExportAllStoryboardVoiceAssets}
          >
            导出所有分组配音资产
          </Button>
          <Button
            icon={<ExportOutlined />}
            loading={storyboardExportingKey === 'all-characters'}
            disabled={isExportingStoryboard || storyboardGroups.length === 0}
            onClick={onExportAllStoryboardCharacterAssets}
          >
            导出所有分组关联角色资产
          </Button>
        </div>
      </div>
      {storyboardGroups.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有剧情分组。创建后可导入配音、填写对白文本，并按组导出剧情编排资产。" />
      ) : (
        <div className="form-stack">
          {visibleStoryboardGroups.map((item) => {
            const visibleVoiceEntries = storyboardVoiceEntriesForPreview(item, previewStoryboardVoiceOrders[item.id])
            return (
              <StoryboardGroupCard
                key={item.id}
                item={item}
                linkedCharacterIds={getStoryboardLinkedCharacterIds(item.id)}
                visibleVoiceEntries={visibleVoiceEntries}
                characterById={characterById}
                voiceById={voiceById}
                characterOptions={characterOptions}
                voiceAssets={voiceAssets}
                allAssets={allAssets}
                getStoryboardVoiceUploadProps={getStoryboardVoiceUploadProps}
                isRenaming={storyboardRename.isRenaming(item.id)}
                storyboardNameDraft={storyboardRename.draftFor(item)}
                isExportingStoryboard={isExportingStoryboard}
                storyboardExportingKey={storyboardExportingKey}
                draggedStoryboardVoice={draggedStoryboardVoice}
                dropTargetStoryboardVoice={dropTargetStoryboardVoice}
                currentPlayback={currentPlayback}
                onRenameOpenChange={storyboardRename.openRename}
                onStoryboardNameDraftChange={storyboardRename.changeDraft}
                onConfirmStoryboardRename={storyboardRename.confirmRename}
                onCancelStoryboardRename={storyboardRename.cancelRename}
                onToggleStoryboardStar={onToggleStoryboardStar}
                onExportStoryboardVoiceAssets={onExportStoryboardVoiceAssets}
                onExportStoryboardCharacterAssets={onExportStoryboardCharacterAssets}
                onDeleteStoryboard={onDeleteStoryboard}
                onAssignVoiceToStoryboard={onAssignVoiceToStoryboard}
                onUnassignStoryboardVoice={onUnassignStoryboardVoice}
                onAssignStoryboardVoiceCharacter={onAssignStoryboardVoiceCharacter}
                onUpdateStoryboardVoiceText={onUpdateStoryboardVoiceText}
                onDragStartStoryboardVoice={startStoryboardVoiceDrag}
                onDragEndStoryboardVoice={endStoryboardVoiceDrag}
                previewStoryboardVoiceListDrop={previewStoryboardVoiceListDrop}
                cancelStoryboardVoiceListDrop={cancelStoryboardVoiceListDrop}
                dropStoryboardVoiceOnList={dropStoryboardVoiceOnList}
                onPlayStoryboardFrom={playStoryboardFrom}
                onStopStoryboardPlayback={stopStoryboardPlayback}
                projectObjectStorage={projectObjectStorage}
                projectAssetManager={projectAssetManager}
                projectId={projectId}
                projectMode={projectMode}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
