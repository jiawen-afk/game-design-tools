import type { AssetGroupKind, CommonAssetKind, PersonalAssetSubtype, PersonalSpaceAsset, PersonalSpaceState } from './personalSpaceModel'

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

function legacySubtypeFromAsset(asset: PersonalSpaceAsset): PersonalAssetSubtype {
  const legacy = asset as unknown as { tags?: string[]; groupName?: string; kind?: string }
  const tags = new Set(legacy.tags ?? [])
  if (legacy.kind === 'map' || tags.has('地图') || legacy.groupName?.includes('地图')) return 'map'
  if (legacy.kind === 'effect' || tags.has('特效') || legacy.groupName?.includes('特效')) return 'effect'
  if (tags.has('肖像') || legacy.groupName?.includes('肖像')) return 'portrait'
  if (legacy.kind === 'sprite' && (tags.has('特效精灵图') || legacy.groupName?.includes('特效'))) return 'effect_sprite'
  if (legacy.kind === 'sprite') return 'character_sprite'
  if (legacy.kind === 'voice') return 'character_voice'
  return 'generic'
}

function migrateAssetKind(asset: PersonalSpaceAsset): PersonalSpaceAsset {
  const legacyKind = (asset as unknown as { kind?: string }).kind
  if (legacyKind === 'map') {
    return {
      ...asset,
      kind: 'image',
      assetSubtype: 'map',
    }
  }
  if (legacyKind === 'effect') {
    return {
      ...asset,
      kind: 'image',
      assetSubtype: 'effect',
    }
  }
  return {
    ...asset,
    assetSubtype: asset.assetSubtype ?? legacySubtypeFromAsset(asset),
  }
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
      const portraitLinks = item.portraitAssets?.length ? item.portraitAssets : legacyPortraitIds.map((assetId, order) => ({ assetId, order }))
      const spriteLinks = item.spriteAssets?.length ? item.spriteAssets : legacySpriteIds.map((assetId, order) => ({ assetId, order }))
      const voiceLinks = item.voiceAssets?.length ? item.voiceAssets : legacyVoiceIds.map((assetId, order) => ({ assetId, order }))
      const portraitAssets = portraitLinks.map((link, order) => ({ assetId: link.assetId, order }))
      const spriteAssets = spriteLinks.map((link, order) => ({ assetId: link.assetId, order }))
      const voiceAssets = voiceLinks.map((link, order) => ({ assetId: link.assetId, order }))
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
        kind: asset.kind,
        assetSubtype: asset.assetSubtype,
        dialogueText: asset.dialogueText,
        resourcePaths: [...asset.resourcePaths],
        linkedCharacterIds: [...asset.linkedCharacterIds],
        linkedStoryboardIds: [...asset.linkedStoryboardIds],
        linkedVoiceAssetIds: [...asset.linkedVoiceAssetIds],
        storageResourcePaths: [...(asset.storageResourcePaths ?? [])],
        sourceKey: asset.sourceKey,
      }
    }),
    storyboardGroups: state.storyboardGroups.map((item) => {
      const legacyVoiceIds = item.voiceAssetIds ?? []
      const sourceVoiceEntries = item.voiceEntries?.length ? item.voiceEntries : legacyVoiceIds.map((assetId, order) => ({ assetId, text: '', startOffsetUs: 0, order }))
      const voiceEntries = sourceVoiceEntries.map((entry, order) => ({
        assetId: entry.assetId,
        text: entry.text,
        startOffsetUs: entry.startOffsetUs ?? 0,
        order,
      }))
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
