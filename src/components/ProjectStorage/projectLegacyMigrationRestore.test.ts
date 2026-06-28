import test from 'node:test'
import assert from 'node:assert/strict'

import { restoreProjectRowsToPersonalSpaceState } from './projectLegacyMigration'
import { migrateLegacyFixture } from './projectLegacyMigrationTestHelpers.test'

test('project rows restore project space state with groups, assets, links, storyboards, and relations', () => {
  const {
    migratedCharacter,
    migratedEffect,
    migratedStoryboard,
    migratedVoice,
    rows,
  } = migrateLegacyFixture({
    effectCoverStorageResourcePath: 'ProjectRoot/图片/2026-06-23/fire-cover.png',
  })

  const restored = restoreProjectRowsToPersonalSpaceState(rows)

  assert.equal(restored.settings.storageDirectory, 'D:\\GameAssets')
  assert.deepEqual(restored.assetGroups, {
    image: ['默认分组', '特效'],
    sprite: ['默认分组'],
    voice: ['默认分组'],
  })
  assert.deepEqual(restored.starredAssetGroups, { image: ['特效'], sprite: [], voice: [] })
  assert.deepEqual(restored.assets.map((asset) => [
    asset.id,
    asset.name,
    asset.kind,
    asset.assetSubtype,
    asset.groupName,
    asset.dialogueText ?? '',
    asset.resourcePaths,
    asset.storageResourcePaths,
    asset.linkedCharacterIds,
    asset.linkedStoryboardIds,
    asset.linkedVoiceAssetIds,
    asset.coverResourcePath ?? '',
    asset.coverStorageResourcePath ?? '',
    asset.coverProjectResourceId ?? '',
    asset.coverProjectResourceSize ?? null,
    asset.coverProjectResourceHash ?? null,
    asset.coverProjectResourceMimeType ?? '',
  ]), [
    [
      migratedVoice.id,
      '欢迎',
      'voice',
      'character_voice',
      '默认分组',
      '欢迎来到我的商店。',
      [migratedVoice.primary_object_key],
      [migratedVoice.primary_object_key],
      [migratedCharacter.id],
      [migratedStoryboard.id],
      [],
      '',
      '',
      '',
      null,
      null,
      '',
    ],
    [
      migratedEffect.id,
      '火球',
      'image',
      'effect',
      '特效',
      '',
      [migratedEffect.primary_object_key],
      [migratedEffect.primary_object_key],
      [],
      [],
      [migratedVoice.id],
      migratedEffect.cover_object_key,
      migratedEffect.cover_object_key,
      migratedEffect.cover_resource_id,
      migratedEffect.cover_size_bytes,
      migratedEffect.cover_hash_sha256,
      migratedEffect.cover_mime_type,
    ],
  ])
  assert.deepEqual(restored.characters, [{
    id: migratedCharacter.id,
    name: '商人',
    order: 0,
    starred: true,
    portraitAssets: [],
    spriteAssets: [],
    voiceAssets: [{ assetId: migratedVoice.id, order: 0 }],
    portraitAssetIds: [],
    spriteAssetIds: [],
    voiceAssetIds: [migratedVoice.id],
  }])
  assert.deepEqual(restored.storyboardGroups, [{
    id: migratedStoryboard.id,
    name: '开场',
    starred: true,
    voiceEntries: [{ assetId: migratedVoice.id, text: '欢迎', startOffsetUs: -100000, order: 0 }],
    characterIds: [migratedCharacter.id],
    voiceAssetIds: [migratedVoice.id],
  }])
})
