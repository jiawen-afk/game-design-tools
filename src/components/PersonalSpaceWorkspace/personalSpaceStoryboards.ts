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
      starred: false,
      voiceEntries: [],
      characterIds: [],
      voiceAssetIds: [],
    },
  ]
  return next
}

export function toggleStoryboardStar(state: PersonalSpaceState, id: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.storyboardGroups = next.storyboardGroups.map((group) => (
    group.id === id ? { ...group, starred: !group.starred } : group
  ))
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

export function assignVoiceToStoryboardGroup(state: PersonalSpaceState, groupId: string, assetId: string, text = '', startOffsetUs = 0): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  const voiceAsset = next.assets.find((asset) => asset.id === assetId && asset.kind === 'voice')
  const dialogueText = text.trim() || voiceAsset?.dialogueText || ''
  next.storyboardGroups = next.storyboardGroups.map((group) => {
    if (group.id !== groupId) return group
    const existing = group.voiceEntries.filter((entry) => entry.assetId !== assetId)
    const voiceEntries = [
      ...existing,
      { assetId, text: dialogueText, startOffsetUs: Math.trunc(startOffsetUs), order: existing.length },
    ].map((entry, index) => ({ ...entry, startOffsetUs: entry.startOffsetUs ?? 0, order: index }))
    return { ...group, voiceEntries, voiceAssetIds: voiceEntries.map((entry) => entry.assetId) }
  })
  next.assets = next.assets.map((asset) => (
    asset.id === assetId
      ? { ...asset, linkedStoryboardIds: Array.from(new Set([...asset.linkedStoryboardIds, groupId])) }
      : asset
  ))
  return next
}

export function unassignVoiceFromStoryboardGroup(state: PersonalSpaceState, groupId: string, assetId: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.storyboardGroups = next.storyboardGroups.map((group) => {
    if (group.id !== groupId) return group
    const voiceEntries = group.voiceEntries
      .filter((entry) => entry.assetId !== assetId)
      .map((entry, order) => ({ ...entry, order }))
    return { ...group, voiceEntries, voiceAssetIds: voiceEntries.map((entry) => entry.assetId) }
  })
  next.assets = next.assets.map((asset) => (
    asset.id === assetId
      ? { ...asset, linkedStoryboardIds: asset.linkedStoryboardIds.filter((linkedId) => linkedId !== groupId) }
      : asset
  ))
  return next
}

export function getStoryboardLinkedCharacterIds(state: PersonalSpaceState, groupId: string): string[] {
  const group = state.storyboardGroups.find((item) => item.id === groupId)
  if (!group) return []
  const ids = group.voiceEntries
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((entry) => {
      const voiceAsset = state.assets.find((asset) => asset.id === entry.assetId && asset.kind === 'voice')
      return voiceAsset?.linkedCharacterIds ?? []
    })
  return Array.from(new Set(ids))
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

export function moveStoryboardVoice(
  state: PersonalSpaceState,
  groupId: string,
  draggedAssetId: string,
  targetAssetId: string,
  placement: 'before' | 'after' = 'after',
): PersonalSpaceState {
  if (draggedAssetId === targetAssetId) return clonePersonalSpaceState(state)
  const next = clonePersonalSpaceState(state)
  next.storyboardGroups = next.storyboardGroups.map((group) => {
    if (group.id !== groupId) return group
    const entries = group.voiceEntries.slice().sort((a, b) => a.order - b.order)
    const draggedIndex = entries.findIndex((entry) => entry.assetId === draggedAssetId)
    const targetIndex = entries.findIndex((entry) => entry.assetId === targetAssetId)
    if (draggedIndex < 0 || targetIndex < 0) return group
    const [dragged] = entries.splice(draggedIndex, 1)
    if (!dragged) return group
    const insertIndex = entries.findIndex((entry) => entry.assetId === targetAssetId)
    entries.splice(placement === 'before' ? insertIndex : insertIndex + 1, 0, dragged)
    const voiceEntries = entries.map((entry, order) => ({ ...entry, order }))
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
    .flatMap<StoryboardReferenceExport['dialogue'][number]>((entry) => {
      const voiceAsset = space.assets.find((asset) => asset.id === entry.assetId && asset.kind === 'voice')
      if (!voiceAsset) return []
      const speaker = voiceAsset.linkedCharacterIds
        .map((characterId) => space.characters.find((character) => character.id === characterId))
        .find((character): character is CharacterProfile => Boolean(character))
      return [{
        ...entry,
        voiceAsset,
        ...(speaker ? { speaker } : {}),
        speakerText: speaker ? `【${speaker.name}：】${entry.text}` : entry.text,
      }]
    })
  return {
    group,
    characters: getStoryboardLinkedCharacterIds(space, group.id)
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
