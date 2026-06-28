import type { DragEvent } from 'react'
import { Empty } from 'antd'

import type { CharacterProfile, PersonalSpaceAsset, StoryboardGroup, StoryboardVoiceEntry } from './personalSpaceModel'
import { StoryboardVoiceRow } from './StoryboardVoiceRow'
import type { DraggedStoryboardVoice } from './storyboardVoiceDrag'
import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'

export type StoryboardVoiceSelectOption = { label: string; value: string }
export type StoryboardPlaybackState = { groupId: string; assetId: string } | null

interface StoryboardVoicePaneProps {
  item: StoryboardGroup
  visibleVoiceEntries: StoryboardVoiceEntry[]
  characterById: Map<string, CharacterProfile>
  voiceById: Map<string, PersonalSpaceAsset>
  characterOptions: StoryboardVoiceSelectOption[]
  allAssets: PersonalSpaceAsset[]
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
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

export function StoryboardVoicePane({
  item,
  visibleVoiceEntries,
  characterById,
  voiceById,
  characterOptions,
  allAssets,
  draggedStoryboardVoice,
  dropTargetStoryboardVoice,
  currentPlayback,
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
}: StoryboardVoicePaneProps) {
  return (
    <div
      className="storyboard-voice-pane"
      onDragOver={(event) => {
        const draggedAssetId = event.dataTransfer.getData('text/plain') || draggedStoryboardVoice?.assetId
        if (!draggedAssetId || draggedStoryboardVoice?.groupId !== item.id) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        previewStoryboardVoiceListDrop(event, item.id, draggedAssetId)
      }}
      onDragLeave={(event) => cancelStoryboardVoiceListDrop(event, item.id)}
      onDrop={(event) => dropStoryboardVoiceOnList(event, item.id)}
    >
      <div className="storyboard-voice-list" data-storyboard-voice-row-list>
        {visibleVoiceEntries.map((entry) => {
          const voiceAsset = voiceById.get(entry.assetId)
          if (!voiceAsset) return null
          const speaker = voiceAsset.linkedCharacterIds
            .map((characterId) => characterById.get(characterId))
            .find((character): character is CharacterProfile => Boolean(character))
          const isActiveDropTarget = dropTargetStoryboardVoice?.groupId === item.id && dropTargetStoryboardVoice.assetId === entry.assetId

          return (
            <StoryboardVoiceRow
              key={entry.assetId}
              entry={entry}
              groupId={item.id}
              voiceAsset={voiceAsset}
              speaker={speaker}
              characterOptions={characterOptions}
              allAssets={allAssets}
              onUnassignStoryboardVoice={onUnassignStoryboardVoice}
              onAssignStoryboardVoiceCharacter={onAssignStoryboardVoiceCharacter}
              onUpdateStoryboardVoiceText={onUpdateStoryboardVoiceText}
              onDragStartStoryboardVoice={onDragStartStoryboardVoice}
              onDragEndStoryboardVoice={onDragEndStoryboardVoice}
              isDragging={draggedStoryboardVoice?.groupId === item.id && draggedStoryboardVoice.assetId === entry.assetId}
              isDropTarget={isActiveDropTarget}
              dropPlacement={isActiveDropTarget ? dropTargetStoryboardVoice.placement : undefined}
              isTimelinePlaying={currentPlayback?.groupId === item.id}
              isCurrentPlayback={currentPlayback?.groupId === item.id && currentPlayback.assetId === entry.assetId}
              onPlayFrom={onPlayStoryboardFrom}
              onStopPlayback={onStopStoryboardPlayback}
              projectObjectStorage={projectObjectStorage}
              projectAssetManager={projectAssetManager}
              projectId={projectId}
              projectMode={projectMode}
            />
          )
        })}
      </div>
      {item.voiceEntries.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有导入配音。选择配音素材后即可编排多名角色对白。" />
      )}
    </div>
  )
}
