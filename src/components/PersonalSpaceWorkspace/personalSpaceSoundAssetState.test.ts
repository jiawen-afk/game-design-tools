import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clonePersonalSpaceState,
  collectPersonalSpaceAsset,
  createPersonalSpaceAsset,
  createSoundAssetFromRecord,
  createPersonalSpaceDerivedState,
  defaultPersonalSpaceState,
  deletePersonalSpaceAsset,
  linkSoundAssetToSprite,
  storageCategoryForAsset,
} from './personalSpaceModel'

test('default personal space state includes sound asset groups', () => {
  const state = clonePersonalSpaceState(defaultPersonalSpaceState)

  assert.deepEqual(state.assetGroups.sound, ['默认分组'])
  assert.deepEqual(state.starredAssetGroups.sound, [])
})

test('creates sound effect assets with sound kind and audio storage category', () => {
  const asset = createSoundAssetFromRecord({
    id: 'sound-record-1',
    name: 'Sword hit',
    audioUrl: 'blob:sound',
    audioPath: null,
    prompt: 'metal sword hit stone',
    durationSeconds: 3,
    model: 'small-sfx',
    sourceKey: 'sound-record:sound-record-1',
  })

  assert.equal(asset.kind, 'sound')
  assert.equal(asset.assetSubtype, 'sound_effect')
  assert.equal(asset.groupName, '默认分组')
  assert.equal(asset.dialogueText, undefined)
  assert.deepEqual(asset.resourcePaths, ['blob:sound'])
  assert.deepEqual(asset.linkedSpriteAssetIds, [])
  assert.equal(asset.sourceKey, 'sound-record:sound-record-1')
  assert.equal(storageCategoryForAsset(asset), '音效')
})

test('derived project-space sections expose independent sound assets', () => {
  const soundAsset = createSoundAssetFromRecord({
    id: 'record-1',
    name: 'Footstep',
    audioUrl: 'blob:step',
    audioPath: null,
    prompt: 'single boot footstep',
    durationSeconds: 2,
    model: 'small-sfx',
  })
  const state = collectPersonalSpaceAsset(defaultPersonalSpaceState, soundAsset)

  const derived = createPersonalSpaceDerivedState(state)

  assert.equal(derived.soundAssets.length, 1)
  assert.equal(derived.assetCounts.sound, 1)
  assert.ok(derived.resourceSections.some((section) => section.kind === 'sound' && section.title === '音效素材'))
})

test('links sound assets to sprites and removes stale sprite links when assets are deleted', () => {
  let state = clonePersonalSpaceState(defaultPersonalSpaceState)
  const sprite = createPersonalSpaceAsset({
    kind: 'sprite',
    name: 'Hero slash',
    resourcePaths: ['sprite.png', 'index.json'],
  })
  const sound = createSoundAssetFromRecord({
    id: 'record-2',
    name: 'Slash sound',
    audioUrl: 'blob:slash',
    audioPath: null,
    prompt: 'sharp blade slash',
    durationSeconds: 2,
    model: 'small-sfx',
  })

  state = collectPersonalSpaceAsset(state, sprite)
  state = collectPersonalSpaceAsset(state, sound)
  state = linkSoundAssetToSprite(state, sound.id, sprite.id)

  assert.deepEqual(state.assets.find((asset) => asset.id === sound.id)?.linkedSpriteAssetIds, [sprite.id])

  state = deletePersonalSpaceAsset(state, sprite.id)

  assert.deepEqual(state.assets.find((asset) => asset.id === sound.id)?.linkedSpriteAssetIds, [])
})
