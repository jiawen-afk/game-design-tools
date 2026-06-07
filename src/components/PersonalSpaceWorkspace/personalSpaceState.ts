import type { AssetGroupKind, CommonAssetKind, PersonalSpaceAsset, PersonalSpaceState } from './personalSpaceModel'

export const personalSpaceStorageKey = 'game-design-tools.personal-space.v1'
const fallbackAssetGroups: Record<AssetGroupKind, string[]> = {
  image: ['默认分组'],
  sprite: ['默认分组'],
  voice: ['默认分组'],
}

export const defaultPersonalSpaceState: PersonalSpaceState = {
  settings: {
    storageDirectory: '',
    deleteResourcesWithContent: false,
  },
  assetGroups: fallbackAssetGroups,
  starredAssetGroups: {
    image: [],
    sprite: [],
    voice: [],
  },
  characters: [],
  assets: [],
  storyboardGroups: [],
  pendingDeletedResourcePaths: [],
}

function assetGroupKindForKind(kind: CommonAssetKind): AssetGroupKind {
  if (kind === 'voice') return 'voice'
  if (kind === 'sprite') return 'sprite'
  return 'image'
}

function migrateAssetKind(asset: PersonalSpaceAsset): PersonalSpaceAsset {
  if (asset.kind === 'map') {
    return {
      ...asset,
      kind: 'image',
      tags: Array.from(new Set(['地图', ...asset.tags])),
    }
  }
  if (asset.kind === 'effect') {
    return {
      ...asset,
      kind: 'image',
      tags: Array.from(new Set(['特效', ...asset.tags])),
    }
  }
  return asset
}

function normalizeAssetGroups(state: PersonalSpaceState): Record<AssetGroupKind, string[]> {
  const groups = { ...fallbackAssetGroups, ...(state.assetGroups ?? {}) }
  for (const asset of state.assets) {
    const groupKind = assetGroupKindForKind(asset.kind)
    groups[groupKind] = Array.from(new Set(['默认分组', ...(groups[groupKind] ?? []), asset.groupName]))
  }
  return groups
}

function normalizeStarredAssetGroups(state: PersonalSpaceState, groups: Record<AssetGroupKind, string[]>): Record<AssetGroupKind, string[]> {
  const source = state.starredAssetGroups ?? { image: [], sprite: [], voice: [] }
  return {
    image: (source.image ?? []).filter((groupName) => groups.image.includes(groupName)),
    sprite: (source.sprite ?? []).filter((groupName) => groups.sprite.includes(groupName)),
    voice: (source.voice ?? []).filter((groupName) => groups.voice.includes(groupName)),
  }
}

function optionalNote(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

export function clonePersonalSpaceState(state: PersonalSpaceState): PersonalSpaceState {
  const assetGroups = normalizeAssetGroups(state)
  return {
    settings: { ...state.settings },
    assetGroups,
    starredAssetGroups: normalizeStarredAssetGroups(state, assetGroups),
    characters: state.characters.map((item) => {
      const legacyPortraitIds = item.portraitAssetIds ?? []
      const legacySpriteIds = item.spriteAssetIds ?? []
      const legacyVoiceIds = item.voiceAssetIds ?? []
      const portraitLinks = item.portraitAssets?.length ? item.portraitAssets : legacyPortraitIds.map((assetId, order) => ({ assetId, tags: [], order }))
      const spriteLinks = item.spriteAssets?.length ? item.spriteAssets : legacySpriteIds.map((assetId, order) => ({ assetId, tags: [], order }))
      const voiceLinks = item.voiceAssets?.length ? item.voiceAssets : legacyVoiceIds.map((assetId, order) => ({ assetId, tags: [], order }))
      const portraitAssets = portraitLinks.map((link) => ({ ...link, tags: [...link.tags], noteName: 'noteName' in link ? optionalNote(link.noteName) : undefined }))
      const spriteAssets = spriteLinks.map((link) => ({ ...link, tags: [...link.tags], noteName: 'noteName' in link ? optionalNote(link.noteName) : undefined }))
      const voiceAssets = voiceLinks.map((link) => ({ ...link, tags: [...link.tags], noteName: 'noteName' in link ? optionalNote(link.noteName) : undefined }))
      return {
        ...item,
        starred: Boolean(item.starred),
        portraitAssets,
        spriteAssets,
        voiceAssets,
        portraitAssetIds: portraitAssets.map((link) => link.assetId),
        spriteAssetIds: spriteAssets.map((link) => link.assetId),
        voiceAssetIds: voiceAssets.map((link) => link.assetId),
      }
    }),
    assets: state.assets.map((item) => {
      const asset = migrateAssetKind(item)
      return {
        ...asset,
        tags: [...asset.tags],
        dialogueText: asset.dialogueText,
        resourcePaths: [...asset.resourcePaths],
        linkedCharacterIds: [...asset.linkedCharacterIds],
        linkedStoryboardIds: [...asset.linkedStoryboardIds],
        linkedVoiceAssetIds: [...asset.linkedVoiceAssetIds],
        storageResourcePaths: [...(asset.storageResourcePaths ?? [])],
      }
    }),
    storyboardGroups: state.storyboardGroups.map((item) => {
      const legacyVoiceIds = item.voiceAssetIds ?? []
      const sourceVoiceEntries = item.voiceEntries?.length ? item.voiceEntries : legacyVoiceIds.map((assetId, order) => ({ assetId, text: '', order }))
      const voiceEntries = sourceVoiceEntries.map((entry) => ({ ...entry, noteName: 'noteName' in entry ? optionalNote(entry.noteName) : undefined }))
      return {
        ...item,
        starred: Boolean(item.starred),
        voiceEntries,
        characterIds: [...(item.characterIds ?? [])],
        voiceAssetIds: voiceEntries.map((entry) => entry.assetId),
      }
    }),
    pendingDeletedResourcePaths: [...(state.pendingDeletedResourcePaths ?? [])],
  }
}

export function readPersonalSpaceState(storage: Storage = localStorage): PersonalSpaceState {
  try {
    const raw = storage.getItem(personalSpaceStorageKey)
    if (!raw) return clonePersonalSpaceState(defaultPersonalSpaceState)
    const parsed = JSON.parse(raw)
    return clonePersonalSpaceState({
      ...clonePersonalSpaceState(defaultPersonalSpaceState),
      ...parsed,
      settings: { ...defaultPersonalSpaceState.settings, ...(parsed.settings ?? {}) },
      assetGroups: { ...defaultPersonalSpaceState.assetGroups, ...(parsed.assetGroups ?? {}) },
      starredAssetGroups: { ...defaultPersonalSpaceState.starredAssetGroups, ...(parsed.starredAssetGroups ?? {}) },
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
      storyboardGroups: Array.isArray(parsed.storyboardGroups) ? parsed.storyboardGroups : [],
      pendingDeletedResourcePaths: Array.isArray(parsed.pendingDeletedResourcePaths) ? parsed.pendingDeletedResourcePaths : [],
    })
  } catch {
    return clonePersonalSpaceState(defaultPersonalSpaceState)
  }
}

export function writePersonalSpaceState(state: PersonalSpaceState, storage: Storage = localStorage) {
  storage.setItem(personalSpaceStorageKey, JSON.stringify(state))
}

export function createPersonalSpaceId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
