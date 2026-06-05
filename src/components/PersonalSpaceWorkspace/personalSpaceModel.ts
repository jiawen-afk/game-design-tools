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

export {
  deletePersonalSpaceAsset,
  updatePersonalSpaceAsset,
} from './personalSpaceAssetOperations'
