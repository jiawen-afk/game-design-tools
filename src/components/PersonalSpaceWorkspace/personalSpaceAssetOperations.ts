import { normalizeAssetLinks } from './personalSpaceCharacters'
import { clonePersonalSpaceState } from './personalSpaceState'
import type { PersonalSpaceAsset, PersonalSpaceState } from './personalSpaceModel'

export function collectPersonalSpaceAsset(state: PersonalSpaceState, asset: PersonalSpaceAsset): PersonalSpaceState {
  const duplicateIds = asset.sourceKey
    ? state.assets
      .filter((current) => current.sourceKey === asset.sourceKey && current.id !== asset.id)
      .map((current) => current.id)
    : []
  const withoutDuplicates = duplicateIds.reduce(
    (current, assetId) => deletePersonalSpaceAsset(current, assetId),
    state,
  )
  const next = clonePersonalSpaceState(withoutDuplicates)
  return clonePersonalSpaceState({
    ...next,
    assets: [asset, ...next.assets.filter((current) => current.id !== asset.id)],
  })
}

export function updatePersonalSpaceAsset(state: PersonalSpaceState, id: string, patch: Partial<Pick<PersonalSpaceAsset, 'name' | 'groupName' | 'assetSubtype' | 'dialogueText' | 'linkedCharacterIds' | 'linkedStoryboardIds' | 'linkedVoiceAssetIds'>>): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.assets = next.assets.map((asset) => {
    if (asset.id !== id) return asset
    return {
      ...asset,
      name: patch.name?.trim() || asset.name,
      groupName: patch.groupName?.trim() || asset.groupName,
      assetSubtype: patch.assetSubtype ?? asset.assetSubtype,
      dialogueText: patch.dialogueText !== undefined ? (patch.dialogueText.trim() || undefined) : asset.dialogueText,
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
  next.assets = next.assets.map((asset) => ({
    ...asset,
    linkedVoiceAssetIds: asset.linkedVoiceAssetIds.filter((assetId) => assetId !== id),
    linkedCharacterIds: asset.linkedCharacterIds.filter((assetId) => assetId !== id),
    linkedStoryboardIds: asset.linkedStoryboardIds.filter((assetId) => assetId !== id),
  }))
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
