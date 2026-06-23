import { Avatar, Button, Input, Select, Space } from 'antd'
import { DisconnectOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons'

import type { CharacterProfile, PersonalSpaceAsset, StoryboardVoiceEntry } from './personalSpaceModel'
import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import { PersonalAssetPreview } from './PersonalAssetPreview'
import { StoryboardCharacterAvatar } from './StoryboardCharacterAvatar'
import type { StoryboardVoiceDropPlacement } from './storyboardVoiceDrag'

type SelectOption = { label: string; value: string }

export function StoryboardVoiceRow({
  entry,
  groupId,
  voiceAsset,
  speaker,
  characterOptions,
  allAssets,
  onUnassignStoryboardVoice,
  onAssignStoryboardVoiceCharacter,
  onUpdateStoryboardVoiceText,
  onDragStartStoryboardVoice,
  onDragEndStoryboardVoice,
  isDragging,
  isDropTarget,
  dropPlacement,
  isTimelinePlaying,
  isCurrentPlayback,
  onPlayFrom,
  onStopPlayback,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: {
  entry: StoryboardVoiceEntry
  groupId: string
  voiceAsset: PersonalSpaceAsset
  speaker?: CharacterProfile
  characterOptions: SelectOption[]
  allAssets: PersonalSpaceAsset[]
  onUnassignStoryboardVoice: (groupId: string, assetId: string) => void
  onAssignStoryboardVoiceCharacter: (groupId: string, assetId: string, characterId: string) => void
  onUpdateStoryboardVoiceText: (groupId: string, assetId: string, text: string) => void
  onDragStartStoryboardVoice: (groupId: string, assetId: string) => void
  onDragEndStoryboardVoice: () => void
  isDragging: boolean
  isDropTarget: boolean
  dropPlacement?: StoryboardVoiceDropPlacement
  isTimelinePlaying: boolean
  isCurrentPlayback: boolean
  onPlayFrom: (groupId: string, assetId: string) => void
  onStopPlayback: () => void
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}) {
  return (
    <article
      className={`storyboard-voice-row${isDragging ? ' storyboard-voice-row is-dragging' : ''}${isDropTarget ? ` storyboard-voice-row is-drop-target is-drop-${dropPlacement ?? 'after'}` : ''}`}
      data-storyboard-voice-id={voiceAsset.id}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', voiceAsset.id)
        onDragStartStoryboardVoice(groupId, voiceAsset.id)
      }}
      onDragEnd={onDragEndStoryboardVoice}
    >
      <div className="storyboard-voice-speaker">
        {speaker ? <StoryboardCharacterAvatar character={speaker} allAssets={allAssets} /> : <Avatar size={34} className="storyboard-avatar">?</Avatar>}
        <Select
          size="small"
          className="storyboard-speaker-select"
          placeholder="关联角色"
          value={speaker?.id}
          options={characterOptions}
          showSearch
          optionFilterProp="label"
          onChange={(characterId) => onAssignStoryboardVoiceCharacter(groupId, voiceAsset.id, characterId)}
        />
      </div>
      <div className="storyboard-voice-main">
        <div className="storyboard-voice-meta">
          <PersonalAssetPreview
            asset={voiceAsset}
            projectObjectStorage={projectObjectStorage}
            projectAssetManager={projectAssetManager}
            projectId={projectId}
            projectMode={projectMode}
          />
          <strong>{voiceAsset.name}</strong>
          {speaker && <span>{speaker.name}</span>}
        </div>
        <Input
          size="small"
          value={entry.text}
          aria-label="对白文本"
          placeholder="对白文本"
          onChange={(event) => onUpdateStoryboardVoiceText(groupId, voiceAsset.id, event.target.value)}
        />
      </div>
      <div className={`storyboard-timeline${isTimelinePlaying ? ' is-playing' : ''}${isCurrentPlayback ? ' is-current' : ''}`}>
        <span className="storyboard-timeline-line" aria-hidden="true" />
        <Button
          size="small"
          type={isCurrentPlayback ? 'primary' : 'default'}
          icon={<PlayCircleOutlined />}
          onClick={() => onPlayFrom(groupId, voiceAsset.id)}
        >
          从这里开始播放
        </Button>
        {isTimelinePlaying && (
          <Button size="small" danger icon={<StopOutlined />} onClick={onStopPlayback}>
            停止播放
          </Button>
        )}
      </div>
      <Space.Compact>
        <Button
          size="small"
          danger
          icon={<DisconnectOutlined />}
          aria-label="取消关联配音"
          onClick={() => onUnassignStoryboardVoice(groupId, voiceAsset.id)}
        />
      </Space.Compact>
    </article>
  )
}
