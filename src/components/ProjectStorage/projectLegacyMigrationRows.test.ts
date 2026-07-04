import test from 'node:test'
import assert from 'node:assert/strict'

import {
  legacyMigrationOptions,
  migrateLegacyFixture,
  semanticIdPrefixPattern,
} from './projectLegacyMigrationTestHelpers.test'
import {
  clonePersonalSpaceState,
  createPersonalSpaceAsset,
  createSoundAssetFromRecord,
  defaultPersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'

test('legacy migration converts assets, groups, character links, storyboard entries, and asset relations', () => {
  const {
    effect,
    migratedCharacter,
    migratedEffect,
    migratedStoryboard,
    migratedVoice,
    rows,
    voice,
  } = migrateLegacyFixture()

  assert.deepEqual(rows.assetGroups.map((group) => [group.kind, group.name, group.starred]), [
    ['image', '默认分组', false],
    ['image', '特效', true],
    ['sprite', '默认分组', false],
    ['voice', '默认分组', false],
    ['sound', '默认分组', false],
  ])

  assert.notEqual(migratedVoice.id, voice.id)
  assert.notEqual(migratedEffect.id, effect.id)
  assert.notEqual(migratedCharacter.id, 'character-old-1')
  assert.notEqual(migratedStoryboard.id, 'storyboard-old-1')
  for (const id of [
    ...rows.assetGroups.map((group) => group.id),
    ...rows.assets.map((asset) => asset.id),
    ...rows.characters.map((character) => character.id),
    ...rows.characterAssetLinks.map((link) => link.id),
    ...rows.storyboardGroups.map((group) => group.id),
    ...rows.storyboardVoiceEntries.map((entry) => entry.id),
    ...rows.assetRelations.map((relation) => relation.id),
  ]) {
    assert.doesNotMatch(id, semanticIdPrefixPattern)
  }

  assert.equal(rows.assets.length, 2)
  assert.equal(migratedEffect.asset_subtype, 'effect')
  assert.equal(migratedEffect.kind, 'image')
  assert.equal(migratedEffect.group_id, rows.assetGroups.find((group) => group.kind === 'image' && group.name === '特效')!.id)
  assert.ok(migratedEffect.cover_object_key)
  assert.equal(migratedEffect.cover_object_key.startsWith('objects/默认项目/image_webp/'), true)
  assert.equal(migratedEffect.cover_file_name, 'fire-cover.webp')
  assert.equal(migratedEffect.cover_mime_type, 'image/webp')
  assert.equal(migratedVoice.dialogue_text, '欢迎来到我的商店。')
  assert.equal(migratedVoice.primary_object_key.startsWith('objects/默认项目/audio_wav/'), true)
  assert.equal(migratedEffect.primary_object_key.startsWith('objects/默认项目/image_png/'), true)

  assert.equal(rows.characterAssetLinks[0]!.character_id, migratedCharacter.id)
  assert.equal(rows.characterAssetLinks[0]!.asset_id, migratedVoice.id)
  assert.equal(rows.characterAssetLinks[0]!.column_kind, 'voice')
  assert.equal(rows.storyboardVoiceEntries[0]!.storyboard_id, migratedStoryboard.id)
  assert.equal(rows.storyboardVoiceEntries[0]!.asset_id, migratedVoice.id)
  assert.equal(rows.storyboardVoiceEntries[0]!.character_id, migratedCharacter.id)
  assert.equal(rows.storyboardVoiceEntries[0]!.start_offset_us, -100000)
  assert.equal(rows.assetRelations[0]!.relation_type, 'effect_voice')
  assert.equal(rows.assetRelations[0]!.source_asset_id, migratedEffect.id)
  assert.equal(rows.assetRelations[0]!.target_asset_id, migratedVoice.id)
})

test('legacy migration exports sound assets and sound-sprite relations', () => {
  const sprite = createPersonalSpaceAsset({
    kind: 'sprite',
    name: 'Hero',
    resourcePaths: ['hero.png', 'hero.index.json'],
  })
  const sound = {
    ...createSoundAssetFromRecord({
      id: 'sound-record-1',
      name: 'Slash',
      audioUrl: '',
      audioPath: 'slash.wav',
      prompt: 'sharp slash',
      durationSeconds: 2,
      model: 'small-sfx',
    }),
    groupName: '打击音',
    linkedSpriteAssetIds: [sprite.id],
  }
  const state = clonePersonalSpaceState({
    ...defaultPersonalSpaceState,
    assetGroups: {
      ...defaultPersonalSpaceState.assetGroups,
      sound: ['默认分组', '打击音'],
    },
    assets: [sprite, sound],
  })

  const rows = migratePersonalSpaceStateToProjectRows(state, {
    ...legacyMigrationOptions,
    preserveSourceIds: true,
  })

  assert.ok(rows.assetGroups.some((group) => group.kind === 'sound' && group.name === '打击音'))
  assert.ok(rows.assets.some((asset) => asset.id === sound.id && asset.kind === 'sound' && asset.asset_subtype === 'sound_effect'))
  assert.deepEqual(rows.assetRelations.map((relation) => ({
    source: relation.source_asset_id,
    target: relation.target_asset_id,
    type: relation.relation_type,
  })), [{ source: sound.id, target: sprite.id, type: 'sound_sprite' }])
})
