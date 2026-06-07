export type PersonalSpaceModule = 'characters' | 'storyboards' | 'assets' | 'settings'
export type CommonAssetKind = 'map' | 'image' | 'effect' | 'voice' | 'sprite'
export type AssetGroupKind = 'image' | 'sprite' | 'voice'

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
  dialogueText?: string
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
  noteName?: string
}

export interface StoryboardVoiceEntry {
  assetId: string
  text: string
  order: number
  noteName?: string
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
  params?: {
    text?: string
  }
}

export interface SpriteExportAssetInput {
  name: string
  spritePath: string
  indexPath: string
  groupName?: string
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
  groupName?: string
  tags?: string[]
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
  updateStoryboardVoiceNote,
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
  updateCharacterAssetNote,
} from './personalSpaceCharacters'

export {
  deletePersonalSpaceAsset,
  updatePersonalSpaceAsset,
} from './personalSpaceAssetOperations'
