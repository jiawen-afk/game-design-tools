import type { UploadProps } from 'antd'
import type { DragEvent } from 'react'
import { useMemo, useState } from 'react'
import { Button, Empty } from 'antd'
import { ExportOutlined, PlusOutlined } from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset, StoryboardGroup } from './personalSpaceModel'
import { StoryboardGroupCard } from './StoryboardGroupCard'
import { PersonalSpaceFilterControl } from './PersonalSpaceFilterControl'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'
import { useRecentStarredFilter } from './useRecentStarredFilter'
import {
  getStoryboardVoiceListDropTarget,
  moveAssetIdAroundTarget,
  type DraggedStoryboardVoice,
  type StoryboardVoiceDropPlacement,
} from './storyboardVoiceDrag'
import { useStoryboardVoicePlayback } from './useStoryboardVoicePlayback'
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
  const [draggedStoryboardVoice, setDraggedStoryboardVoice] = useState<DraggedStoryboardVoice>(null)
  const [dropTargetStoryboardVoice, setDropTargetStoryboardVoice] = useState<DraggedStoryboardVoice>(null)
  const [previewStoryboardVoiceOrders, setPreviewStoryboardVoiceOrders] = useState<Record<string, string[]>>({})
  const [creatingStoryboard, setCreatingStoryboard] = useState(false)
  const [renamingStoryboardId, setRenamingStoryboardId] = useState('')
  const [storyboardNameDrafts, setStoryboardNameDrafts] = useState<Record<string, string>>({})
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

  const startStoryboardVoiceDrag = (groupId: string, assetId: string) => {
    const group = storyboardGroups.find((item) => item.id === groupId)
    const assetIds = group ? [...group.voiceEntries].sort((a, b) => a.order - b.order).map((entry) => entry.assetId) : []
    setDraggedStoryboardVoice({ groupId, assetId })
    setDropTargetStoryboardVoice(null)
    setPreviewStoryboardVoiceOrders((orders) => ({ ...orders, [groupId]: assetIds }))
  }

  const previewStoryboardVoiceDrop = (groupId: string, targetAssetId: string, placement: StoryboardVoiceDropPlacement) => {
    if (!draggedStoryboardVoice || draggedStoryboardVoice.groupId !== groupId) return
    setDropTargetStoryboardVoice({ groupId, assetId: targetAssetId, placement })
    setPreviewStoryboardVoiceOrders((orders) => {
      const group = storyboardGroups.find((item) => item.id === groupId)
      const baseOrder = orders[groupId]
        ?? (group ? [...group.voiceEntries].sort((a, b) => a.order - b.order).map((entry) => entry.assetId) : [])
      return {
        ...orders,
        [groupId]: moveAssetIdAroundTarget(baseOrder, draggedStoryboardVoice.assetId, targetAssetId, placement),
      }
    })
  }

  const previewStoryboardVoiceListDrop = (event: DragEvent<HTMLElement>, groupId: string, draggedAssetId: string) => {
    const target = getStoryboardVoiceListDropTarget(event, draggedAssetId)
    if (!target) return
    previewStoryboardVoiceDrop(groupId, target.assetId, target.placement)
  }

  const dropStoryboardVoiceOnList = (event: DragEvent<HTMLElement>, groupId: string) => {
    event.preventDefault()
    const draggedAssetId = event.dataTransfer.getData('text/plain')
    if (draggedAssetId) {
      const target = getStoryboardVoiceListDropTarget(event, draggedAssetId)
      if (target) onMoveStoryboardVoice(groupId, draggedAssetId, target.assetId, target.placement)
    }
    endStoryboardVoiceDrag()
  }

  function cancelStoryboardVoiceListDrop(event: DragEvent<HTMLElement>, groupId: string) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setDropTargetStoryboardVoice((target) => (target?.groupId === groupId ? null : target))
    setPreviewStoryboardVoiceOrders((orders) => {
      if (!orders[groupId]) return orders
      const next = { ...orders }
      delete next[groupId]
      return next
    })
  }

  const endStoryboardVoiceDrag = () => {
    setDraggedStoryboardVoice(null)
    setDropTargetStoryboardVoice(null)
    setPreviewStoryboardVoiceOrders({})
  }

  const confirmCreateStoryboard = () => {
    if (!newStoryboardName.trim()) return
    onCreateStoryboard()
    setCreatingStoryboard(false)
  }

  const cancelCreateStoryboard = () => {
    onNewStoryboardNameChange('')
    setCreatingStoryboard(false)
  }

  return (
      <section className="space-panel">
      <div className="storyboard-panel-toolbar">
        <div className="storyboard-toolbar-left">
          <PersonalSpaceTextPopover
            open={creatingStoryboard}
            onOpenChange={(open) => {
              if (open) setCreatingStoryboard(true)
              else cancelCreateStoryboard()
            }}
            className="storyboard-create-popover"
            value={newStoryboardName}
            ariaLabel="新剧情分组名称"
            placeholder="新剧情分组名称"
            confirmIcon={<PlusOutlined />}
            confirmDisabled={!newStoryboardName.trim()}
            onValueChange={onNewStoryboardNameChange}
            onConfirm={confirmCreateStoryboard}
            onCancel={cancelCreateStoryboard}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreatingStoryboard(true)}>创建剧情组</Button>
          </PersonalSpaceTextPopover>
          <PersonalSpaceFilterControl
            className="storyboard-filter-control"
            value={selectedStoryboardFilter}
            defaultValue="全部剧情组"
            options={storyboardFilterOptions}
            onlyStarred={onlyStarredStoryboards}
            onChange={setSelectedStoryboardFilter}
            onOnlyStarredChange={setOnlyStarredStoryboards}
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
            const orderedVoiceEntries = [...item.voiceEntries].sort((a, b) => a.order - b.order)
            const previewVoiceAssetIds = previewStoryboardVoiceOrders[item.id]
            const visibleVoiceEntries = previewVoiceAssetIds
              ? previewVoiceAssetIds.flatMap((assetId) => orderedVoiceEntries.find((entry) => entry.assetId === assetId) ?? [])
              : orderedVoiceEntries
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
                isRenaming={renamingStoryboardId === item.id}
                storyboardNameDraft={storyboardNameDrafts[item.id] ?? item.name}
                isExportingStoryboard={isExportingStoryboard}
                storyboardExportingKey={storyboardExportingKey}
                draggedStoryboardVoice={draggedStoryboardVoice}
                dropTargetStoryboardVoice={dropTargetStoryboardVoice}
                currentPlayback={currentPlayback}
                onRenameOpenChange={(group, open) => {
                  setRenamingStoryboardId(open ? group.id : '')
                  setStoryboardNameDrafts((drafts) => ({ ...drafts, [group.id]: open ? (drafts[group.id] ?? group.name) : '' }))
                }}
                onStoryboardNameDraftChange={(groupId, value) => setStoryboardNameDrafts((drafts) => ({ ...drafts, [groupId]: value }))}
                onConfirmStoryboardRename={(group) => {
                  onRenameStoryboard(group.id, storyboardNameDrafts[group.id] ?? group.name)
                  setStoryboardNameDrafts((drafts) => ({ ...drafts, [group.id]: '' }))
                  setRenamingStoryboardId('')
                }}
                onCancelStoryboardRename={(groupId) => {
                  setStoryboardNameDrafts((drafts) => ({ ...drafts, [groupId]: '' }))
                  setRenamingStoryboardId('')
                }}
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
