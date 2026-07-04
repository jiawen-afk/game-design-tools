import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addAssetGroup,
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  collectPersonalSpaceAsset,
  createPersonalSpaceAsset,
  createPersonalSpaceDerivedState,
  defaultPersonalSpaceState,
  deleteAssetGroup,
  deletePersonalSpaceAsset,
  renameAssetGroup,
  toggleAssetGroupStar,
  toggleCharacterStar,
  toggleStoryboardStar,
  transferAssetGroup,
  updatePersonalSpaceAsset,
} from './personalSpaceModel'

test('personal space derived state groups assets and workspace options', () => {
  const publicImage = createPersonalSpaceAsset({ kind: 'image', name: '森林', assetSubtype: 'map', groupName: '地图' })
  const portrait = createPersonalSpaceAsset({ kind: 'image', name: '主角头像', assetSubtype: 'portrait', groupName: '角色肖像' })
  const sprite = createPersonalSpaceAsset({ kind: 'sprite', name: '主角行走', groupName: '角色精灵' })
  const voice = createPersonalSpaceAsset({ kind: 'voice', name: '开场对白', groupName: '对白' })
  const space = addAssetGroup(
    addAssetGroup(
      addAssetGroup(
        addCharacterProfile({
          ...defaultPersonalSpaceState,
          assets: [publicImage, portrait, sprite, voice],
        }, '商人'),
        'image',
        '地图',
      ),
      'sprite',
      '角色精灵',
    ),
    'voice',
    '对白',
  )
  const derived = createPersonalSpaceDerivedState(toggleAssetGroupStar(space, 'voice', '对白'))

  assert.deepEqual(derived.imageAssets.map((asset) => asset.name), ['森林', '主角头像'])
  assert.deepEqual(derived.portraitAssets.map((asset) => asset.name), ['主角头像'])
  assert.deepEqual(derived.spriteAssets.map((asset) => asset.name), ['主角行走'])
  assert.deepEqual(derived.voiceAssets.map((asset) => asset.name), ['开场对白'])
  assert.deepEqual(derived.characterOptions, [{ label: '商人', value: derived.characterOptions[0]!.value }])
  assert.deepEqual(derived.assetCounts, { image: 2, sprite: 1, voice: 1, sound: 0 })
  assert.deepEqual(derived.resourceSections.map((section) => section.kind), ['image', 'sprite', 'voice', 'sound'])
  assert.deepEqual(
    derived.resourceSections.find((section) => section.kind === 'image')?.assets.map((asset) => asset.groupName),
    ['地图', '角色肖像'],
  )
  assert.deepEqual(derived.resourceSections.find((section) => section.kind === 'voice')?.starredGroupNames, ['对白'])
})

test('collecting the same source asset keeps only the latest asset and clears old links', () => {
  let state = addCharacterProfile(defaultPersonalSpaceState, '主角')
  const characterId = state.characters[0]!.id
  const first = createPersonalSpaceAsset({
    kind: 'sprite',
    name: '主角行走',
    resourcePaths: ['old-sprite.png', 'old-index.json'],
    sourceKey: 'sprite-export:hero-walk',
  })
  const second = createPersonalSpaceAsset({
    kind: 'sprite',
    name: '主角行走',
    resourcePaths: ['new-sprite.png', 'new-index.json'],
    sourceKey: 'sprite-export:hero-walk',
  })

  state = collectPersonalSpaceAsset(state, first)
  state = assignAssetToCharacterColumn(state, characterId, first.id, 'sprite')
  state = collectPersonalSpaceAsset(state, second)
  state = assignAssetToCharacterColumn(state, characterId, second.id, 'sprite')

  assert.deepEqual(state.assets.map((asset) => asset.id), [second.id])
  assert.deepEqual(state.assets[0]!.resourcePaths, ['new-sprite.png', 'new-index.json'])
  assert.deepEqual(state.assets[0]!.linkedCharacterIds, [characterId])
  assert.deepEqual(state.characters[0]!.spriteAssetIds, [second.id])
  assert.deepEqual(state.characters[0]!.spriteAssets.map((link) => link.assetId), [second.id])
})

test('asset groups can be created, renamed, transferred, and protected from deleting the last group', () => {
  const first = createPersonalSpaceAsset({ kind: 'image', name: 'forest.png', groupName: '地图' })
  const second = createPersonalSpaceAsset({ kind: 'image', name: 'town.png', groupName: '城镇' })
  let state = { ...defaultPersonalSpaceState, assets: [first, second] }

  state = addAssetGroup(state, 'image', '参考')
  assert.deepEqual(state.assetGroups.image, ['默认分组', '地图', '城镇', '参考'])

  state = renameAssetGroup(state, 'image', '地图', '场景')
  assert.equal(state.assets[0]!.groupName, '场景')
  assert.ok(state.assetGroups.image.includes('场景'))

  state = transferAssetGroup(state, 'image', '城镇', '场景')
  assert.deepEqual(state.assets.map((asset) => asset.groupName), ['场景', '场景'])
  assert.ok(state.assetGroups.image.includes('城镇'))

  state = deleteAssetGroup(state, 'image', '城镇', { transferToGroup: '默认分组' })
  assert.deepEqual(state.assets.map((asset) => asset.groupName), ['场景', '场景'])
  assert.ok(!state.assetGroups.image.includes('城镇'))

  state = deleteAssetGroup(state, 'image', '场景', { deleteAssets: true })
  assert.deepEqual(state.assets, [])
  assert.ok(state.assetGroups.image.includes('默认分组'))
  state = deleteAssetGroup(state, 'image', '参考', { deleteAssets: true })
  assert.throws(
    () => deleteAssetGroup(state, 'image', '默认分组', { deleteAssets: true }),
    /至少保留一个分组/,
  )
})

test('characters, storyboard groups, and asset groups can be starred for filtering', () => {
  let state = addCharacterProfile(defaultPersonalSpaceState, '商人')
  state = addStoryboardGroup(state, '开场对白')
  state = addAssetGroup(state, 'image', '场景')
  const characterId = state.characters[0]!.id
  const storyboardId = state.storyboardGroups[0]!.id

  state = toggleCharacterStar(state, characterId)
  state = toggleStoryboardStar(state, storyboardId)
  state = toggleAssetGroupStar(state, 'image', '场景')

  assert.equal(state.characters[0]!.starred, true)
  assert.equal(state.storyboardGroups[0]!.starred, true)
  assert.deepEqual(state.starredAssetGroups.image, ['场景'])

  state = renameAssetGroup(state, 'image', '场景', '地图')
  assert.deepEqual(state.starredAssetGroups.image, ['地图'])

  state = toggleAssetGroupStar(state, 'image', '地图')
  assert.deepEqual(state.starredAssetGroups.image, [])
})

test('common assets can be updated and deleted while removing links from characters and storyboards', () => {
  const voice = createPersonalSpaceAsset({ kind: 'voice', name: '问候', linkedCharacterIds: ['c1'], linkedStoryboardIds: ['s1'] })
  const state = {
    ...defaultPersonalSpaceState,
    characters: [{
      id: 'c1',
      name: '商人',
      order: 0,
      portraitAssets: [],
      spriteAssets: [],
      voiceAssets: [{ assetId: voice.id, order: 0 }],
      portraitAssetIds: [],
      spriteAssetIds: [],
      voiceAssetIds: [voice.id],
    }],
    assets: [voice],
    storyboardGroups: [{ id: 's1', name: '开场', voiceEntries: [{ assetId: voice.id, text: '', startOffsetUs: 0, order: 0 }], characterIds: ['c1'], voiceAssetIds: [voice.id] }],
  }

  const updated = updatePersonalSpaceAsset(state, voice.id, { groupName: 'NPC 配音', assetSubtype: 'narration' })
  const deleted = deletePersonalSpaceAsset(updated, voice.id)

  assert.equal(updated.assets[0]!.assetSubtype, 'narration')
  assert.equal(updated.assets[0]!.groupName, 'NPC 配音')
  assert.deepEqual(deleted.assets, [])
  assert.deepEqual(deleted.characters[0]!.voiceAssetIds, [])
  assert.deepEqual(deleted.storyboardGroups[0]!.voiceAssetIds, [])
})

test('deleting a voice asset removes effect voice links that point to it', () => {
  const voice = createPersonalSpaceAsset({ kind: 'voice', name: '问候' })
  const effect = createPersonalSpaceAsset({ kind: 'effect', name: '闪光', linkedVoiceAssetIds: [voice.id] })
  const state = {
    ...defaultPersonalSpaceState,
    assets: [voice, effect],
  }

  const deleted = deletePersonalSpaceAsset(state, voice.id)

  assert.deepEqual(deleted.assets.map((asset) => asset.id), [effect.id])
  assert.deepEqual(deleted.assets[0]!.linkedVoiceAssetIds, [])
})
