import type { DragEvent } from 'react'

import type { PersonalSpaceAsset, StoryboardVoiceEntry } from './personalSpaceModel'
import { StoryboardCharacterPane, type StoryboardCharacterPaneProps } from './StoryboardCharacterPane'
import { StoryboardGroupHeader, type StoryboardGroupHeaderProps } from './StoryboardGroupHeader'
import { StoryboardVoicePane, type StoryboardPlaybackState, type StoryboardVoiceSelectOption } from './StoryboardVoicePane'
import type { DraggedStoryboardVoice } from './storyboardVoiceDrag'

interface StoryboardGroupCardProps extends StoryboardGroupHeaderProps, StoryboardCharacterPaneProps {
  visibleVoiceEntries: StoryboardVoiceEntry[]
  voiceById: Map<string, PersonalSpaceAsset>
  characterOptions: StoryboardVoiceSelectOption[]
  draggedStoryboardVoice: DraggedStoryboardVoice
  dropTargetStoryboardVoice: DraggedStoryboardVoice
  currentPlayback: StoryboardPlaybackState
  onUnassignStoryboardVoice: (groupId: string, assetId: string) => void
  onAssignStoryboardVoiceCharacter: (groupId: string, assetId: string, characterId: string) => void
  onUpdateStoryboardVoiceText: (groupId: string, assetId: string, text: string) => void
  onDragStartStoryboardVoice: (groupId: string, assetId: string) => void
  onDragEndStoryboardVoice: () => void
  previewStoryboardVoiceListDrop: (event: DragEvent<HTMLElement>, groupId: string, draggedAssetId: string) => void
  cancelStoryboardVoiceListDrop: (event: DragEvent<HTMLElement>, groupId: string) => void
  dropStoryboardVoiceOnList: (event: DragEvent<HTMLElement>, groupId: string) => void
  onPlayStoryboardFrom: (groupId: string, assetId: string) => void
  onStopStoryboardPlayback: () => void
}

export function StoryboardGroupCard({
  item,
  linkedCharacterIds,
  visibleVoiceEntries,
  characterById,
  voiceById,
  characterOptions,
  voiceAssets,
  allAssets,
  getStoryboardVoiceUploadProps,
  isRenaming,
  storyboardNameDraft,
  isExportingStoryboard,
  storyboardExportingKey,
  draggedStoryboardVoice,
  dropTargetStoryboardVoice,
  currentPlayback,
  onRenameOpenChange,
  onStoryboardNameDraftChange,
  onConfirmStoryboardRename,
  onCancelStoryboardRename,
  onToggleStoryboardStar,
  onExportStoryboardVoiceAssets,
  onExportStoryboardCharacterAssets,
  onDeleteStoryboard,
  onAssignVoiceToStoryboard,
  onUnassignStoryboardVoice,
  onAssignStoryboardVoiceCharacter,
  onUpdateStoryboardVoiceText,
  onDragStartStoryboardVoice,
  onDragEndStoryboardVoice,
  previewStoryboardVoiceListDrop,
  cancelStoryboardVoiceListDrop,
  dropStoryboardVoiceOnList,
  onPlayStoryboardFrom,
  onStopStoryboardPlayback,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: StoryboardGroupCardProps) {
  return (
    <article className="space-record">
      <StoryboardGroupHeader
        item={item}
        voiceAssets={voiceAssets}
        getStoryboardVoiceUploadProps={getStoryboardVoiceUploadProps}
        isRenaming={isRenaming}
        storyboardNameDraft={storyboardNameDraft}
        isExportingStoryboard={isExportingStoryboard}
        storyboardExportingKey={storyboardExportingKey}
        onRenameOpenChange={onRenameOpenChange}
        onStoryboardNameDraftChange={onStoryboardNameDraftChange}
        onConfirmStoryboardRename={onConfirmStoryboardRename}
        onCancelStoryboardRename={onCancelStoryboardRename}
        onToggleStoryboardStar={onToggleStoryboardStar}
        onExportStoryboardVoiceAssets={onExportStoryboardVoiceAssets}
        onExportStoryboardCharacterAssets={onExportStoryboardCharacterAssets}
        onDeleteStoryboard={onDeleteStoryboard}
        onAssignVoiceToStoryboard={onAssignVoiceToStoryboard}
      />
      <span className="field-note">关联角色 {linkedCharacterIds.length} · 配音 {item.voiceAssetIds.length}</span>
      <div className="storyboard-arranger">
        <StoryboardCharacterPane
          linkedCharacterIds={linkedCharacterIds}
          characterById={characterById}
          allAssets={allAssets}
          projectObjectStorage={projectObjectStorage}
          projectAssetManager={projectAssetManager}
          projectId={projectId}
          projectMode={projectMode}
        />
        <StoryboardVoicePane
          item={item}
          visibleVoiceEntries={visibleVoiceEntries}
          characterById={characterById}
          voiceById={voiceById}
          characterOptions={characterOptions}
          allAssets={allAssets}
          draggedStoryboardVoice={draggedStoryboardVoice}
          dropTargetStoryboardVoice={dropTargetStoryboardVoice}
          currentPlayback={currentPlayback}
          onUnassignStoryboardVoice={onUnassignStoryboardVoice}
          onAssignStoryboardVoiceCharacter={onAssignStoryboardVoiceCharacter}
          onUpdateStoryboardVoiceText={onUpdateStoryboardVoiceText}
          onDragStartStoryboardVoice={onDragStartStoryboardVoice}
          onDragEndStoryboardVoice={onDragEndStoryboardVoice}
          previewStoryboardVoiceListDrop={previewStoryboardVoiceListDrop}
          cancelStoryboardVoiceListDrop={cancelStoryboardVoiceListDrop}
          dropStoryboardVoiceOnList={dropStoryboardVoiceOnList}
          onPlayStoryboardFrom={onPlayStoryboardFrom}
          onStopStoryboardPlayback={onStopStoryboardPlayback}
          projectObjectStorage={projectObjectStorage}
          projectAssetManager={projectAssetManager}
          projectId={projectId}
          projectMode={projectMode}
        />
      </div>
    </article>
  )
}
