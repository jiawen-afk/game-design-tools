import { clonePersonalSpaceState } from './personalSpaceState'
import { normalizeAssetLinks } from './personalSpaceCharacters'

export type PersonalSpaceModule = 'characters' | 'storyboards' | 'assets' | 'settings'
export type CommonAssetKind = 'map' | 'effect' | 'voice' | 'sprite'

export interface PersonalSpaceSettings {
  storageDirectory: string
  deleteResourcesWithContent: boolean
}

export interface PersonalSpaceAsset {
  id: string
  kind: CommonAssetKind
  name: string
  groupName: string
  tags: string[]
  resourcePaths: string[]
  createdAt: string
  linkedCharacterIds: string[]
  linkedStoryboardIds: string[]
  linkedVoiceAssetIds: string[]
  storageResourcePaths: string[]
}

export interface CharacterAssetLink {
  assetId: string
  tags: string[]
  order: number
}

export interface StoryboardVoiceEntry {
  assetId: string
  text: string
  order: number
}

export interface CharacterProfile {
  id: string
  name: string
  order: number
  portraitAssets: CharacterAssetLink[]
  spriteAssets: CharacterAssetLink[]
  voiceAssets: CharacterAssetLink[]
  portraitAssetIds: string[]
  spriteAssetIds: string[]
  voiceAssetIds: string[]
}

export interface StoryboardGroup {
  id: string
  name: string
  voiceEntries: StoryboardVoiceEntry[]
  characterIds: string[]
  voiceAssetIds: string[]
}

export interface StoryboardReferenceExport {
  group: StoryboardGroup
  characters: CharacterProfile[]
  voiceAssets: PersonalSpaceAsset[]
  dialogue: Array<StoryboardVoiceEntry & { voiceAsset: PersonalSpaceAsset }>
}

export interface PersonalSpaceState {
  settings: PersonalSpaceSettings
  characters: CharacterProfile[]
  assets: PersonalSpaceAsset[]
  storyboardGroups: StoryboardGroup[]
  pendingDeletedResourcePaths: string[]
}

export interface VoiceRecordAssetInput {
  name: string
  audioPath: string | null
}

export interface SpriteExportAssetInput {
  name: string
  spritePath: string
  indexPath: string
  tags?: string[]
}

export interface PortraitUploadAssetInput {
  name: string
  portraitPath: string
  tags?: string[]
}

export interface ResourceUploadAssetInput {
  kind: CommonAssetKind
  name: string
  resourcePath: string
  tags?: string[]
}

export {
  createPersonalSpaceAsset,
  archiveAssetForStorageDirectory,
  createPortraitAssetFromUpload,
  createResourceAssetFromUpload,
  createSpriteAssetFromExport,
  createVoiceAssetFromRecord,
  storageCategoryForAsset,
} from './personalSpaceAssets'

export {
  clonePersonalSpaceState,
  defaultPersonalSpaceState,
  personalSpaceStorageKey,
  readPersonalSpaceState,
  writePersonalSpaceState,
} from './personalSpaceState'

export {
  addStoryboardGroup,
  assignVoiceToStoryboardGroup,
  deleteStoryboardGroup,
  exportStoryboardReference,
  linkEffectAssetToVoice,
  renameStoryboardGroup,
  reorderStoryboardVoice,
  setStoryboardCharacters,
  storyboardReferenceFileName,
  updateStoryboardVoiceText,
} from './personalSpaceStoryboards'

export {
  addCharacterProfile,
  assignAssetToCharacterColumn,
  deleteCharacterProfile,
  renameCharacterProfile,
  reorderCharacterProfile,
  reorderCharacterVoice,
} from './personalSpaceCharacters'

export function updatePersonalSpaceAsset(state: PersonalSpaceState, id: string, patch: Partial<Pick<PersonalSpaceAsset, 'name' | 'groupName' | 'tags' | 'linkedCharacterIds' | 'linkedStoryboardIds' | 'linkedVoiceAssetIds'>>): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.assets = next.assets.map((asset) => {
    if (asset.id !== id) return asset
    return {
      ...asset,
      name: patch.name?.trim() || asset.name,
      groupName: patch.groupName?.trim() || asset.groupName,
      tags: patch.tags ? [...patch.tags] : asset.tags,
      linkedCharacterIds: patch.linkedCharacterIds ? [...patch.linkedCharacterIds] : asset.linkedCharacterIds,
      linkedStoryboardIds: patch.linkedStoryboardIds ? [...patch.linkedStoryboardIds] : asset.linkedStoryboardIds,
      linkedVoiceAssetIds: patch.linkedVoiceAssetIds ? [...patch.linkedVoiceAssetIds] : asset.linkedVoiceAssetIds,
    }
  })
  return next
}

export function deletePersonalSpaceAsset(state: PersonalSpaceState, id: string, options: { resourcesDeleted?: boolean } = {}): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  const deletedAsset = next.assets.find((asset) => asset.id === id)
  next.assets = next.assets.filter((asset) => asset.id !== id)
  next.characters = next.characters.map((character) => ({
    ...character,
    portraitAssets: normalizeAssetLinks(character.portraitAssets.filter((link) => link.assetId !== id)),
    spriteAssets: normalizeAssetLinks(character.spriteAssets.filter((link) => link.assetId !== id)),
    voiceAssets: normalizeAssetLinks(character.voiceAssets.filter((link) => link.assetId !== id)),
    portraitAssetIds: character.portraitAssetIds.filter((assetId) => assetId !== id),
    spriteAssetIds: character.spriteAssetIds.filter((assetId) => assetId !== id),
    voiceAssetIds: character.voiceAssetIds.filter((assetId) => assetId !== id),
  }))
  next.storyboardGroups = next.storyboardGroups.map((group) => ({
    ...group,
    voiceEntries: group.voiceEntries.filter((entry) => entry.assetId !== id).map((entry, index) => ({ ...entry, order: index })),
    voiceAssetIds: group.voiceAssetIds.filter((assetId) => assetId !== id),
  }))
  if (next.settings.deleteResourcesWithContent && deletedAsset && !options.resourcesDeleted) {
    next.pendingDeletedResourcePaths = Array.from(new Set([...next.pendingDeletedResourcePaths, ...deletedAsset.storageResourcePaths]))
  }
  return next
}
