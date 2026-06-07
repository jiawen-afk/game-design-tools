import { clonePersonalSpaceState, createPersonalSpaceId } from './personalSpaceState'
import type { CharacterAssetLink, CharacterProfile, PersonalSpaceState } from './personalSpaceModel'

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
      starred: false,
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

export function toggleCharacterStar(state: PersonalSpaceState, id: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.characters = next.characters.map((character) => (
    character.id === id ? { ...character, starred: !character.starred } : character
  ))
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
  return links.map((link, index) => ({ ...link, tags: [...link.tags], noteName: link.noteName, order: index }))
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

export function unassignAssetFromCharacterColumn(state: PersonalSpaceState, characterId: string, assetId: string, column: 'portrait' | 'sprite' | 'voice'): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  const key = assetColumnKey(column)
  next.characters = next.characters.map((character) => {
    if (character.id !== characterId) return character
    const links = normalizeAssetLinks(character[key].filter((link) => link.assetId !== assetId))
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
      ? { ...asset, linkedCharacterIds: asset.linkedCharacterIds.filter((linkedId) => linkedId !== characterId) }
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

export function moveCharacterVoice(state: PersonalSpaceState, characterId: string, draggedAssetId: string, targetAssetId: string): PersonalSpaceState {
  if (draggedAssetId === targetAssetId) return clonePersonalSpaceState(state)
  const next = clonePersonalSpaceState(state)
  next.characters = next.characters.map((character) => {
    if (character.id !== characterId) return character
    const links = normalizeAssetLinks([...character.voiceAssets].sort((a, b) => a.order - b.order))
    const draggedIndex = links.findIndex((link) => link.assetId === draggedAssetId)
    const targetIndex = links.findIndex((link) => link.assetId === targetAssetId)
    if (draggedIndex < 0 || targetIndex < 0) return character
    const [dragged] = links.splice(draggedIndex, 1)
    if (!dragged) return character
    const insertIndex = links.findIndex((link) => link.assetId === targetAssetId)
    links.splice(insertIndex + 1, 0, dragged)
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

export function updateCharacterAssetNote(
  state: PersonalSpaceState,
  characterId: string,
  assetId: string,
  column: 'portrait' | 'sprite' | 'voice',
  noteName: string,
): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  const key = assetColumnKey(column)
  next.characters = next.characters.map((character) => {
    if (character.id !== characterId) return character
    return {
      ...character,
      [key]: normalizeAssetLinks(character[key].map((link) => (
        link.assetId === assetId ? { ...link, noteName: noteName.trim() || undefined } : link
      ))),
    }
  })
  return next
}

export { normalizeAssetLinks }
