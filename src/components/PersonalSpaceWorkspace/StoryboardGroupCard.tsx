import type { UploadProps } from 'antd'
import type { DragEvent } from 'react'
import { Button, Empty, Popconfirm, Upload } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  StarFilled,
  StarOutlined,
  UploadOutlined,
} from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset, StoryboardGroup, StoryboardVoiceEntry } from './personalSpaceModel'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'
import { StoryboardCharacterAvatar } from './StoryboardCharacterAvatar'
import { StoryboardVoicePicker } from './StoryboardVoicePicker'
import { StoryboardVoiceRow } from './StoryboardVoiceRow'
import type { DraggedStoryboardVoice } from './storyboardVoiceDrag'
import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'

type SelectOption = { label: string; value: string }
type StoryboardPlaybackState = { groupId: string; assetId: string } | null

interface StoryboardGroupCardProps {
  item: StoryboardGroup
  linkedCharacterIds: string[]
  visibleVoiceEntries: StoryboardVoiceEntry[]
  characterById: Map<string, CharacterProfile>
  voiceById: Map<string, PersonalSpaceAsset>
  characterOptions: SelectOption[]
  voiceAssets: PersonalSpaceAsset[]
  allAssets: PersonalSpaceAsset[]
  getStoryboardVoiceUploadProps: (groupId: string) => UploadProps
  isRenaming: boolean
  storyboardNameDraft: string
  isExportingStoryboard: boolean
  storyboardExportingKey: string
  draggedStoryboardVoice: DraggedStoryboardVoice
  dropTargetStoryboardVoice: DraggedStoryboardVoice
  currentPlayback: StoryboardPlaybackState
  onRenameOpenChange: (group: StoryboardGroup, open: boolean) => void
  onStoryboardNameDraftChange: (groupId: string, value: string) => void
  onConfirmStoryboardRename: (group: StoryboardGroup) => void
  onCancelStoryboardRename: (groupId: string) => void
  onToggleStoryboardStar: (groupId: string) => void
  onExportStoryboardVoiceAssets: (groupId: string) => void
  onExportStoryboardCharacterAssets: (groupId: string) => void
  onDeleteStoryboard: (groupId: string) => void
  onAssignVoiceToStoryboard: (groupId: string, assetId: string) => void
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
      <div className="command-row storyboard-command-row">
        <div className="record-name-view storyboard-name-view">
          <span className="field-label">分组名称</span>
          <Button
            size="small"
            type="text"
            className="star-toggle-button"
            icon={item.starred ? <StarFilled /> : <StarOutlined />}
            aria-label={item.starred ? '取消星标剧情分组' : '星标剧情分组'}
            onClick={() => onToggleStoryboardStar(item.id)}
          />
          <strong>{item.name}</strong>
          <PersonalSpaceTextPopover
            open={isRenaming}
            onOpenChange={(open) => onRenameOpenChange(item, open)}
            className="storyboard-name-rename-popover"
            value={storyboardNameDraft}
            ariaLabel={`${item.name}分组名称`}
            placeholder="分组名称"
            confirmDisabled={!storyboardNameDraft.trim()}
            onValueChange={(value) => onStoryboardNameDraftChange(item.id, value)}
            onConfirm={() => onConfirmStoryboardRename(item)}
            onCancel={() => onCancelStoryboardRename(item.id)}
          >
            <Button size="small" icon={<EditOutlined />} aria-label="重命名剧情分组" />
          </PersonalSpaceTextPopover>
        </div>
        <div className="storyboard-header-actions">
          <Upload {...getStoryboardVoiceUploadProps(item.id)}>
            <Button size="small" icon={<UploadOutlined />}>导入配音</Button>
          </Upload>
          <StoryboardVoicePicker
            groupId={item.id}
            voiceAssets={voiceAssets}
            onAssignVoiceToStoryboard={onAssignVoiceToStoryboard}
          />
          <Button
            size="small"
            icon={<ExportOutlined />}
            loading={storyboardExportingKey === `group-voices-${item.id}`}
            disabled={isExportingStoryboard}
            onClick={() => onExportStoryboardVoiceAssets(item.id)}
          >
            导出分组配音资产
          </Button>
          <Button
            size="small"
            icon={<ExportOutlined />}
            loading={storyboardExportingKey === `group-characters-${item.id}`}
            disabled={isExportingStoryboard}
            onClick={() => onExportStoryboardCharacterAssets(item.id)}
          >
            导出分组关联角色资产
          </Button>
          <Popconfirm title="删除剧情组" description="会移除素材中关联到该剧情组的关系。" onConfirm={() => onDeleteStoryboard(item.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      </div>
      <span className="field-note">关联角色 {linkedCharacterIds.length} · 配音 {item.voiceAssetIds.length}</span>
      <div className="storyboard-arranger">
        <aside className="storyboard-character-pane" aria-label="关联角色">
          <span className="field-label">关联角色</span>
          <div className="storyboard-character-list">
            {linkedCharacterIds
              .map((characterId) => characterById.get(characterId))
              .filter((character): character is CharacterProfile => Boolean(character))
              .map((character) => (
                <div className="storyboard-character-item" key={character.id}>
                  <StoryboardCharacterAvatar
                    character={character}
                    allAssets={allAssets}
                    projectObjectStorage={projectObjectStorage}
                    projectAssetManager={projectAssetManager}
                    projectId={projectId}
                    projectMode={projectMode}
                  />
                  <span>{character.name}</span>
                </div>
              ))}
            {linkedCharacterIds.length === 0 && (
              <span className="field-note">导入的配音关联角色后会显示在这里。</span>
            )}
          </div>
        </aside>
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
                  isDropTarget={dropTargetStoryboardVoice?.groupId === item.id && dropTargetStoryboardVoice.assetId === entry.assetId}
                  dropPlacement={dropTargetStoryboardVoice?.groupId === item.id && dropTargetStoryboardVoice.assetId === entry.assetId ? dropTargetStoryboardVoice.placement : undefined}
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
      </div>
    </article>
  )
}
