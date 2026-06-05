import type { PersonalSpaceState } from './personalSpaceModel'

export const personalSpaceStorageKey = 'game-design-tools.personal-space.v1'

export const defaultPersonalSpaceState: PersonalSpaceState = {
  settings: {
    storageDirectory: '',
    deleteResourcesWithContent: false,
  },
  characters: [],
  assets: [],
  storyboardGroups: [],
  pendingDeletedResourcePaths: [],
}

export function clonePersonalSpaceState(state: PersonalSpaceState): PersonalSpaceState {
  return {
    settings: { ...state.settings },
    characters: state.characters.map((item) => {
      const legacyPortraitIds = item.portraitAssetIds ?? []
      const legacySpriteIds = item.spriteAssetIds ?? []
      const legacyVoiceIds = item.voiceAssetIds ?? []
      const portraitLinks = item.portraitAssets?.length ? item.portraitAssets : legacyPortraitIds.map((assetId, order) => ({ assetId, tags: [], order }))
      const spriteLinks = item.spriteAssets?.length ? item.spriteAssets : legacySpriteIds.map((assetId, order) => ({ assetId, tags: [], order }))
      const voiceLinks = item.voiceAssets?.length ? item.voiceAssets : legacyVoiceIds.map((assetId, order) => ({ assetId, tags: [], order }))
      const portraitAssets = portraitLinks.map((link) => ({ ...link, tags: [...link.tags] }))
      const spriteAssets = spriteLinks.map((link) => ({ ...link, tags: [...link.tags] }))
      const voiceAssets = voiceLinks.map((link) => ({ ...link, tags: [...link.tags] }))
      return {
        ...item,
        portraitAssets,
        spriteAssets,
        voiceAssets,
        portraitAssetIds: portraitAssets.map((link) => link.assetId),
        spriteAssetIds: spriteAssets.map((link) => link.assetId),
        voiceAssetIds: voiceAssets.map((link) => link.assetId),
      }
    }),
    assets: state.assets.map((item) => ({
      ...item,
      tags: [...item.tags],
      resourcePaths: [...item.resourcePaths],
      linkedCharacterIds: [...item.linkedCharacterIds],
      linkedStoryboardIds: [...item.linkedStoryboardIds],
      linkedVoiceAssetIds: [...item.linkedVoiceAssetIds],
      storageResourcePaths: [...(item.storageResourcePaths ?? [])],
    })),
    storyboardGroups: state.storyboardGroups.map((item) => {
      const legacyVoiceIds = item.voiceAssetIds ?? []
      const sourceVoiceEntries = item.voiceEntries?.length ? item.voiceEntries : legacyVoiceIds.map((assetId, order) => ({ assetId, text: '', order }))
      const voiceEntries = sourceVoiceEntries.map((entry) => ({ ...entry }))
      return {
        ...item,
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
