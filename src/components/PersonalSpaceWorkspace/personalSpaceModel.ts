export type PersonalSpaceModule = 'characters' | 'storyboards' | 'assets' | 'settings'
export type CommonAssetKind = 'map' | 'image' | 'effect' | 'voice' | 'sprite'
export type StoredAssetKind = 'image' | 'sprite' | 'voice'
export type AssetGroupKind = 'image' | 'sprite' | 'voice'
export type PersonalAssetSubtype =
  | 'generic'
  | 'portrait'
  | 'map'
  | 'effect'
  | 'character_sprite'
  | 'effect_sprite'
  | 'character_voice'
  | 'narration'
  | 'sound_effect'

export interface PersonalSpaceSettings {
  storageDirectory: string
  deleteResourcesWithContent: boolean
}

export interface PersonalSpaceAsset {
  id: string
  kind: StoredAssetKind
  assetSubtype: PersonalAssetSubtype
  name: string
  groupName: string
  dialogueText?: string
  resourcePaths: string[]
  createdAt: string
  linkedCharacterIds: string[]
  linkedStoryboardIds: string[]
  linkedVoiceAssetIds: string[]
  storageResourcePaths: string[]
  projectResourceIds?: string[]
  projectResourceSizes?: Array<number | null>
  projectResourceHashes?: Array<string | null>
  projectResourceMimeTypes?: Array<string | null>
  sourceKey?: string
}

export interface CharacterAssetLink {
  assetId: string
  order: number
}

export interface StoryboardVoiceEntry {
  assetId: string
  text: string
  startOffsetUs: number
  order: number
}

export interface CharacterProfile {
  id: string
  name: string
  order: number
  starred?: boolean
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
  starred?: boolean
  voiceEntries: StoryboardVoiceEntry[]
  characterIds: string[]
  voiceAssetIds: string[]
}

export interface StoryboardReferenceExport {
  group: StoryboardGroup
  characters: CharacterProfile[]
  voiceAssets: PersonalSpaceAsset[]
  dialogue: Array<StoryboardVoiceEntry & {
    voiceAsset: PersonalSpaceAsset
    speaker?: CharacterProfile
    speakerText: string
  }>
}

export interface PersonalSpaceState {
  settings: PersonalSpaceSettings
  assetGroups: Record<AssetGroupKind, string[]>
  starredAssetGroups: Record<AssetGroupKind, string[]>
  characters: CharacterProfile[]
  assets: PersonalSpaceAsset[]
  storyboardGroups: StoryboardGroup[]
  pendingDeletedResourcePaths: string[]
}

export interface VoiceRecordAssetInput {
  name: string
  audioUrl?: string
  audioPath: string | null
  dialogueText?: string
  sourceKey?: string
  params?: {
    text?: string
  }
}

export interface SpriteExportAssetInput {
  name: string
  spritePath: string
  indexPath: string
  groupName?: string
  assetSubtype?: PersonalAssetSubtype
  sourceKey?: string
}

export interface PortraitUploadAssetInput {
  name: string
  portraitPath: string
}

export interface ResourceUploadAssetInput {
  kind: CommonAssetKind
  name: string
  resourcePath: string
  groupName?: string
  assetSubtype?: PersonalAssetSubtype
}

export {
  addAssetGroup,
  assetGroupKindForAsset,
  defaultAssetGroups,
  deleteAssetGroup,
  renameAssetGroup,
  toggleAssetGroupStar,
  transferAssetGroup,
} from './personalSpaceAssetGroups'

export {
  createPersonalSpaceAsset,
  archiveAssetForStorageDirectory,
  assetKindLabel,
  createImportedAssetName,
  hashText,
  hashedResourceFileName,
  importDatePart,
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
  deleteProjectSpaceState,
  hasProjectSpaceState,
  projectSpaceStatesStorageKey,
  readProjectSpaceState,
  writeProjectSpaceState,
} from './projectSpaceState'

export {
  addStoryboardGroup,
  assignVoiceToStoryboardGroup,
  deleteStoryboardGroup,
  exportStoryboardReference,
  getStoryboardLinkedCharacterIds,
  linkEffectAssetToVoice,
  moveStoryboardVoice,
  renameStoryboardGroup,
  reorderStoryboardVoice,
  setStoryboardCharacters,
  storyboardReferenceFileName,
  toggleStoryboardStar,
  unassignVoiceFromStoryboardGroup,
  updateStoryboardVoiceText,
} from './personalSpaceStoryboards'

export {
  addCharacterProfile,
  assignAssetToCharacterColumn,
  deleteCharacterProfile,
  moveCharacterVoice,
  renameCharacterProfile,
  reorderCharacterProfile,
  reorderCharacterVoice,
  toggleCharacterStar,
  unassignAssetFromCharacterColumn,
} from './personalSpaceCharacters'

export {
  collectPersonalSpaceAsset,
  deletePersonalSpaceAsset,
  updatePersonalSpaceAsset,
} from './personalSpaceAssetOperations'
