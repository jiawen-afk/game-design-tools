import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
  moveCharacterVoice,
  renameCharacterProfile,
  reorderCharacterProfile,
  reorderCharacterVoice,
  unassignAssetFromCharacterColumn,
} from './personalSpaceModel'

test('character profiles can be created, renamed, sorted, and deleted without mutating state', () => {
  const initial = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [] }, '商人')
  const second = addCharacterProfile(initial, '骑士')
  const renamed = renameCharacterProfile(second, second.characters[0]!.id, '杂货商')
  const reordered = reorderCharacterProfile(renamed, second.characters[1]!.id, 'up')

  assert.deepEqual(initial.characters.map((item) => item.name), ['商人'])
  assert.deepEqual(renamed.characters.map((item) => item.name), ['杂货商', '骑士'])
  assert.deepEqual(reordered.characters.map((item) => item.name), ['骑士', '杂货商'])
  assert.deepEqual(reordered.characters.map((item) => item.order), [0, 1])
})

test('character columns keep portrait, sprite, and voice asset order without link metadata', () => {
  const portrait = createPersonalSpaceAsset({ kind: 'map', name: '肖像' })
  const sprite = createPersonalSpaceAsset({ kind: 'sprite', name: '行走图' })
  const hello = createPersonalSpaceAsset({ kind: 'voice', name: '问候' })
  const attack = createPersonalSpaceAsset({ kind: 'voice', name: '攻击' })
  let state = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [portrait, sprite, hello, attack] }, '主角')
  const characterId = state.characters[0]!.id

  state = assignAssetToCharacterColumn(state, characterId, portrait.id, 'portrait')
  state = assignAssetToCharacterColumn(state, characterId, sprite.id, 'sprite')
  state = assignAssetToCharacterColumn(state, characterId, hello.id, 'voice')
  state = assignAssetToCharacterColumn(state, characterId, attack.id, 'voice')
  state = reorderCharacterVoice(state, characterId, attack.id, 'up')

  assert.deepEqual(state.characters[0]!.portraitAssets, [{ assetId: portrait.id, order: 0 }])
  assert.deepEqual(state.characters[0]!.spriteAssets, [{ assetId: sprite.id, order: 0 }])
  assert.deepEqual(state.characters[0]!.voiceAssets.map((item) => item.assetId), [attack.id, hello.id])
  assert.equal('noteName' in state.characters[0]!.voiceAssets[0]!, false)
  assert.deepEqual(state.assets.find((item) => item.id === sprite.id)!.linkedCharacterIds, [characterId])
})

test('character asset links can be removed and voice links can be drag-sorted', () => {
  const portrait = createPersonalSpaceAsset({ kind: 'image', name: '肖像' })
  const hello = createPersonalSpaceAsset({ kind: 'voice', name: '问候' })
  const attack = createPersonalSpaceAsset({ kind: 'voice', name: '攻击' })
  let state = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [portrait, hello, attack] }, '主角')
  const characterId = state.characters[0]!.id

  state = assignAssetToCharacterColumn(state, characterId, portrait.id, 'portrait')
  state = assignAssetToCharacterColumn(state, characterId, hello.id, 'voice')
  state = assignAssetToCharacterColumn(state, characterId, attack.id, 'voice')
  state = moveCharacterVoice(state, characterId, hello.id, attack.id)
  state = unassignAssetFromCharacterColumn(state, characterId, portrait.id, 'portrait')

  assert.deepEqual(state.characters[0]!.portraitAssetIds, [])
  assert.deepEqual(state.characters[0]!.voiceAssetIds, [attack.id, hello.id])
  assert.deepEqual(state.assets.find((asset) => asset.id === portrait.id)!.linkedCharacterIds, [])
})

test('character and storyboard asset links do not store note names', () => {
  const voice = createPersonalSpaceAsset({ kind: 'voice', name: 'line.wav' })
  let state = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [voice] }, '商人')
  state = addStoryboardGroup(state, '开场')
  const characterId = state.characters[0]!.id
  const storyboardId = state.storyboardGroups[0]!.id

  state = assignAssetToCharacterColumn(state, characterId, voice.id, 'voice')
  state = assignVoiceToStoryboardGroup(state, storyboardId, voice.id, '')

  assert.equal(state.assets[0]!.name, 'line.wav')
  assert.equal('noteName' in state.characters[0]!.voiceAssets[0]!, false)
  assert.equal('noteName' in state.storyboardGroups[0]!.voiceEntries[0]!, false)
})
