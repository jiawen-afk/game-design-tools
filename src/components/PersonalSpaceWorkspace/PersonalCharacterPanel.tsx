import type { UploadProps } from 'antd'
import { useState } from 'react'
import { Button, Empty } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'
import { CharacterProfileCard } from './CharacterProfileCard'
import { PersonalSpaceFilterControl } from './PersonalSpaceFilterControl'
import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'
import { useRecentStarredFilter } from './useRecentStarredFilter'

interface PersonalCharacterPanelProps {
  characters: CharacterProfile[]
  newCharacterName: string
  portraitAssets: PersonalSpaceAsset[]
  spriteAssets: PersonalSpaceAsset[]
  voiceAssets: PersonalSpaceAsset[]
  allAssets: PersonalSpaceAsset[]
  getStoryboardVoiceRefs: (assetId: string) => string[]
  getPortraitUploadProps: (characterId: string) => UploadProps
  getSpriteUploadProps: (characterId: string) => UploadProps
  getVoiceUploadProps: (characterId: string) => UploadProps
  onNewCharacterNameChange: (name: string) => void
  onCreateCharacter: () => void
  onRenameCharacter: (characterId: string, name: string) => void
  onToggleCharacterStar: (characterId: string) => void
  onReorderCharacter: (characterId: string, direction: 'up' | 'down') => void
  onDeleteCharacter: (characterId: string) => void
  onAssignAsset: (
    characterId: string,
    assetId: string,
    column: 'portrait' | 'sprite' | 'voice',
  ) => void
  onUnassignAsset: (
    characterId: string,
    assetId: string,
    column: 'portrait' | 'sprite' | 'voice',
  ) => void
  onMoveCharacterVoice: (characterId: string, draggedAssetId: string, targetAssetId: string) => void
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

export function PersonalCharacterPanel({
  characters,
  newCharacterName,
  portraitAssets,
  spriteAssets,
  voiceAssets,
  allAssets,
  getStoryboardVoiceRefs,
  getPortraitUploadProps,
  getSpriteUploadProps,
  getVoiceUploadProps,
  onNewCharacterNameChange,
  onCreateCharacter,
  onRenameCharacter,
  onToggleCharacterStar,
  onReorderCharacter,
  onDeleteCharacter,
  onAssignAsset,
  onUnassignAsset,
  onMoveCharacterVoice,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: PersonalCharacterPanelProps) {
  const [creatingCharacter, setCreatingCharacter] = useState(false)
  const [renamingCharacterId, setRenamingCharacterId] = useState('')
  const [characterNameDrafts, setCharacterNameDrafts] = useState<Record<string, string>>({})
  const orderedCharacters = [...characters].sort((a, b) => a.order - b.order)
  const {
    selectedFilter: selectedCharacterFilter,
    setSelectedFilter: setSelectedCharacterFilter,
    onlyStarred: onlyStarredCharacters,
    setOnlyStarred: setOnlyStarredCharacters,
    filterOptions: characterFilterOptions,
    visibleItems: visibleCharacters,
  } = useRecentStarredFilter({
    items: orderedCharacters,
    defaultValue: '全部角色',
    defaultLabel: '最近创建的20个角色',
    getId: (character) => character.id,
    getName: (character) => character.name,
    getStarred: (character) => character.starred,
  })

  const confirmCreateCharacter = () => {
    if (!newCharacterName.trim()) return
    onCreateCharacter()
    setCreatingCharacter(false)
  }

  const cancelCreateCharacter = () => {
    onNewCharacterNameChange('')
    setCreatingCharacter(false)
  }

  return (
    <section className="space-panel">
      <div className="character-panel-toolbar">
        <div className="character-toolbar-left">
          <PersonalSpaceTextPopover
            open={creatingCharacter}
            onOpenChange={(open) => {
              if (open) setCreatingCharacter(true)
              else cancelCreateCharacter()
            }}
            className="character-create-popover"
            value={newCharacterName}
            ariaLabel="新角色名称"
            placeholder="新角色名称"
            confirmIcon={<PlusOutlined />}
            confirmDisabled={!newCharacterName.trim()}
            onValueChange={onNewCharacterNameChange}
            onConfirm={confirmCreateCharacter}
            onCancel={cancelCreateCharacter}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreatingCharacter(true)}>创建角色</Button>
          </PersonalSpaceTextPopover>
          <PersonalSpaceFilterControl
            className="character-filter-control"
            value={selectedCharacterFilter}
            defaultValue="全部角色"
            options={characterFilterOptions}
            onlyStarred={onlyStarredCharacters}
            onChange={setSelectedCharacterFilter}
            onOnlyStarredChange={setOnlyStarredCharacters}
          />
        </div>
      </div>
      {characters.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有角色。创建后可继续关联肖像、精灵图和配音。" />
      ) : (
        <div className="form-stack">
          {visibleCharacters.map((item) => (
            <CharacterProfileCard
              key={item.id}
              item={item}
              portraitAssets={portraitAssets}
              spriteAssets={spriteAssets}
              voiceAssets={voiceAssets}
              allAssets={allAssets}
              getStoryboardVoiceRefs={getStoryboardVoiceRefs}
              getPortraitUploadProps={getPortraitUploadProps}
              getSpriteUploadProps={getSpriteUploadProps}
              getVoiceUploadProps={getVoiceUploadProps}
              isRenaming={renamingCharacterId === item.id}
              characterNameDraft={characterNameDrafts[item.id] ?? item.name}
              onRenameOpenChange={(character, open) => {
                setRenamingCharacterId(open ? character.id : '')
                setCharacterNameDrafts((drafts) => ({ ...drafts, [character.id]: open ? (drafts[character.id] ?? character.name) : '' }))
              }}
              onCharacterNameDraftChange={(characterId, value) => setCharacterNameDrafts((drafts) => ({ ...drafts, [characterId]: value }))}
              onConfirmCharacterRename={(character) => {
                onRenameCharacter(character.id, characterNameDrafts[character.id] ?? character.name)
                setCharacterNameDrafts((drafts) => ({ ...drafts, [character.id]: '' }))
                setRenamingCharacterId('')
              }}
              onCancelCharacterRename={(characterId) => {
                setCharacterNameDrafts((drafts) => ({ ...drafts, [characterId]: '' }))
                setRenamingCharacterId('')
              }}
              onToggleCharacterStar={onToggleCharacterStar}
              onReorderCharacter={onReorderCharacter}
              onDeleteCharacter={onDeleteCharacter}
              onAssignAsset={onAssignAsset}
              onUnassignAsset={onUnassignAsset}
              onMoveCharacterVoice={onMoveCharacterVoice}
              projectObjectStorage={projectObjectStorage}
              projectAssetManager={projectAssetManager}
              projectId={projectId}
              projectMode={projectMode}
            />
          ))}
        </div>
      )}
    </section>
  )
}
