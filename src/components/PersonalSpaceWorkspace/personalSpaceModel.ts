import { clonePersonalSpaceState, createPersonalSpaceId } from './personalSpaceState'

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

function normalizeCharacterOrder(characters: CharacterProfile[]): CharacterProfile[] {
  return characters.map((character, index) => ({ ...character, order: index }))
}

export function addCharacterProfile(state: PersonalSpaceState, name: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.characters = normalizeCharacterOrder([
    ...next.characters,
    {
      id: createPersonalSpaceId('character'),
      name: name.trim() || '未命名角色',
      order: next.characters.length,
      portraitAssets: [],
      spriteAssets: [],
      voiceAssets: [],
      portraitAssetIds: [],
      spriteAssetIds: [],
      voiceAssetIds: [],
    },
  ])
  return next
}

export function renameCharacterProfile(state: PersonalSpaceState, id: string, name: string): PersonalSpaceState {
  const trimmed = name.trim()
  if (!trimmed) return clonePersonalSpaceState(state)
  const next = clonePersonalSpaceState(state)
  next.characters = next.characters.map((character) => (character.id === id ? { ...character, name: trimmed } : character))
  return next
}

export function deleteCharacterProfile(state: PersonalSpaceState, id: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.characters = normalizeCharacterOrder(next.characters.filter((character) => character.id !== id))
  next.assets = next.assets.map((asset) => ({
    ...asset,
    linkedCharacterIds: asset.linkedCharacterIds.filter((linkedId) => linkedId !== id),
  }))
  next.storyboardGroups = next.storyboardGroups.map((group) => ({
    ...group,
    characterIds: group.characterIds.filter((linkedId) => linkedId !== id),
  }))
  return next
}

function normalizeAssetLinks(links: CharacterAssetLink[]): CharacterAssetLink[] {
  return links.map((link, index) => ({ ...link, tags: [...link.tags], order: index }))
}

function assetColumnKey(column: 'portrait' | 'sprite' | 'voice'): 'portraitAssets' | 'spriteAssets' | 'voiceAssets' {
  if (column === 'portrait') return 'portraitAssets'
  if (column === 'sprite') return 'spriteAssets'
  return 'voiceAssets'
}

export function assignAssetToCharacterColumn(state: PersonalSpaceState, characterId: string, assetId: string, column: 'portrait' | 'sprite' | 'voice', tags: string[] = []): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  const key = assetColumnKey(column)
  next.characters = next.characters.map((character) => {
    if (character.id !== characterId) return character
    const existing = character[key].filter((link) => link.assetId !== assetId)
    const links = normalizeAssetLinks([...existing, { assetId, tags, order: existing.length }])
    return {
      ...character,
      [key]: links,
      portraitAssetIds: key === 'portraitAssets' ? links.map((link) => link.assetId) : character.portraitAssetIds,
      spriteAssetIds: key === 'spriteAssets' ? links.map((link) => link.assetId) : character.spriteAssetIds,
      voiceAssetIds: key === 'voiceAssets' ? links.map((link) => link.assetId) : character.voiceAssetIds,
    }
  })
  next.assets = next.assets.map((asset) => (
    asset.id === assetId
      ? { ...asset, linkedCharacterIds: Array.from(new Set([...asset.linkedCharacterIds, characterId])) }
      : asset
  ))
  return next
}

export function reorderCharacterVoice(state: PersonalSpaceState, characterId: string, assetId: string, direction: 'up' | 'down'): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.characters = next.characters.map((character) => {
    if (character.id !== characterId) return character
    const links = normalizeAssetLinks([...character.voiceAssets].sort((a, b) => a.order - b.order))
    const index = links.findIndex((link) => link.assetId === assetId)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || targetIndex < 0 || targetIndex >= links.length) return character
    const current = links[index]!
    links[index] = links[targetIndex]!
    links[targetIndex] = current
    const voiceAssets = normalizeAssetLinks(links)
    return { ...character, voiceAssets, voiceAssetIds: voiceAssets.map((link) => link.assetId) }
  })
  return next
}

export function reorderCharacterProfile(state: PersonalSpaceState, id: string, direction: 'up' | 'down'): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  const characters = normalizeCharacterOrder([...next.characters].sort((a, b) => a.order - b.order))
  const index = characters.findIndex((character) => character.id === id)
  if (index < 0) return next
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= characters.length) return next
  const current = characters[index]!
  characters[index] = characters[targetIndex]!
  characters[targetIndex] = current
  next.characters = normalizeCharacterOrder(characters)
  return next
}

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
