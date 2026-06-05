import { clonePersonalSpaceState, createPersonalSpaceId } from './personalSpaceState'
import type {
  CharacterProfile,
  PersonalSpaceAsset,
  PersonalSpaceState,
  StoryboardReferenceExport,
  StoryboardVoiceEntry,
} from './personalSpaceModel'

export function addStoryboardGroup(state: PersonalSpaceState, name: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.storyboardGroups = [
    ...next.storyboardGroups,
    {
      id: createPersonalSpaceId('storyboard'),
      name: name.trim() || '未命名剧情组',
      voiceEntries: [],
      characterIds: [],
      voiceAssetIds: [],
    },
  ]
  return next
}

export function renameStoryboardGroup(state: PersonalSpaceState, id: string, name: string): PersonalSpaceState {
  const trimmed = name.trim()
  if (!trimmed) return clonePersonalSpaceState(state)
  const next = clonePersonalSpaceState(state)
  next.storyboardGroups = next.storyboardGroups.map((group) => (group.id === id ? { ...group, name: trimmed } : group))
  return next
}

export function deleteStoryboardGroup(state: PersonalSpaceState, id: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.storyboardGroups = next.storyboardGroups.filter((group) => group.id !== id)
  next.assets = next.assets.map((asset) => ({
    ...asset,
    linkedStoryboardIds: asset.linkedStoryboardIds.filter((linkedId) => linkedId !== id),
  }))
  return next
}

export function linkEffectAssetToVoice(state: PersonalSpaceState, effectAssetId: string, voiceAssetId: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.assets = next.assets.map((asset) => {
    if (asset.id !== effectAssetId) return asset
    return { ...asset, linkedVoiceAssetIds: Array.from(new Set([...asset.linkedVoiceAssetIds, voiceAssetId])) }
  })
  return next
}

export function setStoryboardCharacters(state: PersonalSpaceState, groupId: string, characterIds: string[]): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.storyboardGroups = next.storyboardGroups.map((group) => (group.id === groupId ? { ...group, characterIds: [...characterIds] } : group))
  return next
}

export function assignVoiceToStoryboardGroup(state: PersonalSpaceState, groupId: string, assetId: string, text = ''): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.storyboardGroups = next.storyboardGroups.map((group) => {
    if (group.id !== groupId) return group
    const existing = group.voiceEntries.filter((entry) => entry.assetId !== assetId)
    const voiceEntries = [...existing, { assetId, text, order: existing.length }].map((entry, index) => ({ ...entry, order: index }))
    return { ...group, voiceEntries, voiceAssetIds: voiceEntries.map((entry) => entry.assetId) }
  })
  next.assets = next.assets.map((asset) => (
    asset.id === assetId
      ? { ...asset, linkedStoryboardIds: Array.from(new Set([...asset.linkedStoryboardIds, groupId])) }
      : asset
  ))
  return next
}

export function updateStoryboardVoiceText(state: PersonalSpaceState, groupId: string, assetId: string, text: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.storyboardGroups = next.storyboardGroups.map((group) => {
    if (group.id !== groupId) return group
    return { ...group, voiceEntries: group.voiceEntries.map((entry) => (entry.assetId === assetId ? { ...entry, text } : entry)) }
  })
  return next
}

export function reorderStoryboardVoice(state: PersonalSpaceState, groupId: string, assetId: string, direction: 'up' | 'down'): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.storyboardGroups = next.storyboardGroups.map((group) => {
    if (group.id !== groupId) return group
    const entries = group.voiceEntries.slice().sort((a, b) => a.order - b.order)
    const index = entries.findIndex((entry) => entry.assetId === assetId)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || targetIndex < 0 || targetIndex >= entries.length) return group
    const current = entries[index]!
    entries[index] = entries[targetIndex]!
    entries[targetIndex] = current
    const voiceEntries = entries.map((entry, nextOrder) => ({ ...entry, order: nextOrder }))
    return { ...group, voiceEntries, voiceAssetIds: voiceEntries.map((entry) => entry.assetId) }
  })
  return next
}

export function exportStoryboardReference(state: PersonalSpaceState, id: string): StoryboardReferenceExport {
  const space = clonePersonalSpaceState(state)
  const group = space.storyboardGroups.find((item) => item.id === id) ?? {
    id,
    name: '未找到剧情组',
    voiceEntries: [],
    characterIds: [],
    voiceAssetIds: [],
  }
  const dialogue = group.voiceEntries
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      const voiceAsset = space.assets.find((asset) => asset.id === entry.assetId && asset.kind === 'voice')
      return voiceAsset ? { ...entry, voiceAsset } : null
    })
    .filter((entry): entry is StoryboardVoiceEntry & { voiceAsset: PersonalSpaceAsset } => Boolean(entry))
  return {
    group,
    characters: group.characterIds
      .map((characterId) => space.characters.find((character) => character.id === characterId))
      .filter((character): character is CharacterProfile => Boolean(character)),
    voiceAssets: group.voiceAssetIds
      .map((assetId) => space.assets.find((asset) => asset.id === assetId && asset.kind === 'voice'))
      .filter((asset): asset is PersonalSpaceAsset => Boolean(asset)),
    dialogue,
  }
}

export function storyboardReferenceFileName(name: string) {
  const clean = (name.trim() || '未命名剧情组').replace(/[<>:"/\\|?*]+/g, '_')
  return `storyboard-${clean}.json`
}
