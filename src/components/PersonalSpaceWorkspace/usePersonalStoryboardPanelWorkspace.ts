import { useCallback, useMemo } from 'react'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { CharacterProfile, PersonalSpaceAsset, StoryboardGroup } from './personalSpaceModel'
import { storyboardVoiceEntriesForPreview, type StoryboardVoiceDropPlacement } from './storyboardVoiceDrag'
import { useCreateNamePopover } from './useCreateNamePopover'
import { useRecentStarredFilter } from './useRecentStarredFilter'
import { useRenameDrafts } from './useRenameDrafts'
import { useStoryboardVoiceDragDrop } from './useStoryboardVoiceDragDrop'
import { useStoryboardVoicePlayback } from './useStoryboardVoicePlayback'

export type { StoryboardVoiceDropPlacement } from './storyboardVoiceDrag'

interface UsePersonalStoryboardPanelWorkspaceParams {
  storyboardGroups: StoryboardGroup[]
  newStoryboardName: string
  characters: CharacterProfile[]
  voiceAssets: PersonalSpaceAsset[]
  onNewStoryboardNameChange: (name: string) => void
  onCreateStoryboard: () => void
  onRenameStoryboard: (groupId: string, name: string) => void
  onMoveStoryboardVoice: (
    groupId: string,
    draggedAssetId: string,
    targetAssetId: string,
    placement?: StoryboardVoiceDropPlacement,
  ) => void
  storyboardExportingKey: string
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

export function usePersonalStoryboardPanelWorkspace({
  storyboardGroups,
  newStoryboardName,
  characters,
  voiceAssets,
  onNewStoryboardNameChange,
  onCreateStoryboard,
  onRenameStoryboard,
  onMoveStoryboardVoice,
  storyboardExportingKey,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: UsePersonalStoryboardPanelWorkspaceParams) {
  const characterById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters])
  const voiceById = useMemo(() => new Map(voiceAssets.map((asset) => [asset.id, asset])), [voiceAssets])
  const characterOptions = useMemo(() => characters.map((character) => ({ label: character.name, value: character.id })), [characters])
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
  const visibleVoiceEntriesFor = useCallback((group: StoryboardGroup) => (
    storyboardVoiceEntriesForPreview(group, previewStoryboardVoiceOrders[group.id])
  ), [previewStoryboardVoiceOrders])

  return {
    characterById,
    voiceById,
    characterOptions,
    currentPlayback,
    playStoryboardFrom,
    stopStoryboardPlayback,
    draggedStoryboardVoice,
    dropTargetStoryboardVoice,
    startStoryboardVoiceDrag,
    endStoryboardVoiceDrag,
    previewStoryboardVoiceListDrop,
    cancelStoryboardVoiceListDrop,
    dropStoryboardVoiceOnList,
    createStoryboard,
    storyboardRename,
    isExportingStoryboard,
    selectedStoryboardFilter,
    setSelectedStoryboardFilter,
    onlyStarredStoryboards,
    setOnlyStarredStoryboards,
    storyboardFilterOptions,
    visibleStoryboardGroups,
    visibleVoiceEntriesFor,
  }
}
