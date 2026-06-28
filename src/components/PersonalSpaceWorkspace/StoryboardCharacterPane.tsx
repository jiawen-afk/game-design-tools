import type { ProjectAssetManager, ProjectMode, ProjectObjectStorage } from '../ProjectStorage'
import type { CharacterProfile, PersonalSpaceAsset } from './personalSpaceModel'
import { StoryboardCharacterAvatar } from './StoryboardCharacterAvatar'

export interface StoryboardCharacterPaneProps {
  linkedCharacterIds: string[]
  characterById: Map<string, CharacterProfile>
  allAssets: PersonalSpaceAsset[]
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

export function StoryboardCharacterPane({
  linkedCharacterIds,
  characterById,
  allAssets,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: StoryboardCharacterPaneProps) {
  return (
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
  )
}
