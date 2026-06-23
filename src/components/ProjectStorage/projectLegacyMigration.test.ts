import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
  type PersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'

const semanticIdPrefixPattern = /^(asset|character|storyboard|group|link|relation)[_-]/

test('legacy migration creates a default local project and project settings', () => {
  const migrated = migratePersonalSpaceStateToProjectRows(defaultPersonalSpaceState, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })

  assert.equal(migrated.project.id, 'p1')
  assert.equal(migrated.project.mode, 'local')
  assert.equal(migrated.project.object_key_prefix, 'objects/默认项目')
  assert.equal(migrated.settings.database_provider, 'sqlite')
  assert.equal(migrated.settings.storage_provider, 'local')
  assert.equal(migrated.settings.local_object_root, 'D:\\GameAssets')
})

test('legacy migration converts assets, groups, character links, storyboard entries, and asset relations', () => {
  const voice = {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      assetSubtype: 'character_voice',
      name: '欢迎',
      dialogueText: '欢迎来到我的商店。',
      resourcePaths: ['D:\\voice\\welcome.wav'],
    }),
    storageResourcePaths: ['ProjectRoot/配音/2026-06-23/audio.wav'],
  }
  const effect = {
    ...createPersonalSpaceAsset({
      kind: 'image',
      assetSubtype: 'effect',
      name: '火球',
      groupName: '特效',
      resourcePaths: ['D:\\image\\fire.png'],
      linkedVoiceAssetIds: [voice.id],
    }),
    storageResourcePaths: ['ProjectRoot/图片/2026-06-23/fire.png'],
  }
  const state: PersonalSpaceState = {
    ...defaultPersonalSpaceState,
    assetGroups: { image: ['默认分组', '特效'], sprite: ['默认分组'], voice: ['默认分组'] },
    starredAssetGroups: { image: ['特效'], sprite: [], voice: [] },
    assets: [voice, effect],
    characters: [{
      id: 'character-old-1',
      name: '商人',
      order: 0,
      starred: true,
      portraitAssets: [],
      spriteAssets: [],
      voiceAssets: [{ assetId: voice.id, order: 0 }],
      portraitAssetIds: [],
      spriteAssetIds: [],
      voiceAssetIds: [voice.id],
    }],
    storyboardGroups: [{
      id: 'storyboard-old-1',
      name: '开场',
      starred: true,
      voiceEntries: [{ assetId: voice.id, text: '欢迎', startOffsetUs: -100000, order: 0 }],
      characterIds: ['character-old-1'],
      voiceAssetIds: [voice.id],
    }],
  }

  const migrated = migratePersonalSpaceStateToProjectRows(state, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })

  assert.deepEqual(migrated.assetGroups.map((group) => [group.kind, group.name, group.starred]), [
    ['image', '默认分组', false],
    ['image', '特效', true],
    ['sprite', '默认分组', false],
    ['voice', '默认分组', false],
  ])

  const migratedVoice = migrated.assets.find((asset) => asset.name === voice.name)!
  const migratedEffect = migrated.assets.find((asset) => asset.name === effect.name)!
  const migratedCharacter = migrated.characters[0]!
  const migratedStoryboard = migrated.storyboardGroups[0]!

  assert.notEqual(migratedVoice.id, voice.id)
  assert.notEqual(migratedEffect.id, effect.id)
  assert.notEqual(migratedCharacter.id, 'character-old-1')
  assert.notEqual(migratedStoryboard.id, 'storyboard-old-1')
  for (const id of [
    ...migrated.assetGroups.map((group) => group.id),
    ...migrated.assets.map((asset) => asset.id),
    ...migrated.characters.map((character) => character.id),
    ...migrated.characterAssetLinks.map((link) => link.id),
    ...migrated.storyboardGroups.map((group) => group.id),
    ...migrated.storyboardVoiceEntries.map((entry) => entry.id),
    ...migrated.assetRelations.map((relation) => relation.id),
  ]) {
    assert.doesNotMatch(id, semanticIdPrefixPattern)
  }

  assert.equal(migrated.assets.length, 2)
  assert.equal(migratedEffect.asset_subtype, 'effect')
  assert.equal(migratedEffect.kind, 'image')
  assert.equal(migratedEffect.group_id, migrated.assetGroups.find((group) => group.kind === 'image' && group.name === '特效')!.id)
  assert.equal(migratedVoice.dialogue_text, '欢迎来到我的商店。')
  assert.equal(migratedVoice.primary_object_key.startsWith('objects/默认项目/audio_wav/'), true)
  assert.equal(migratedEffect.primary_object_key.startsWith('objects/默认项目/image_png/'), true)

  assert.equal(migrated.characterAssetLinks[0]!.character_id, migratedCharacter.id)
  assert.equal(migrated.characterAssetLinks[0]!.asset_id, migratedVoice.id)
  assert.equal(migrated.characterAssetLinks[0]!.column_kind, 'voice')
  assert.equal(migrated.storyboardVoiceEntries[0]!.storyboard_id, migratedStoryboard.id)
  assert.equal(migrated.storyboardVoiceEntries[0]!.asset_id, migratedVoice.id)
  assert.equal(migrated.storyboardVoiceEntries[0]!.character_id, migratedCharacter.id)
  assert.equal(migrated.storyboardVoiceEntries[0]!.start_offset_us, -100000)
  assert.equal(migrated.assetRelations[0]!.relation_type, 'effect_voice')
  assert.equal(migrated.assetRelations[0]!.source_asset_id, migratedEffect.id)
  assert.equal(migrated.assetRelations[0]!.target_asset_id, migratedVoice.id)
})
