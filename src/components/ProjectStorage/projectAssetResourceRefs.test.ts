import test from 'node:test'
import assert from 'node:assert/strict'

import { createPersonalSpaceAsset, defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { buildProjectAssetResourceRef, listAssetObjectKeys } from './projectAssetResourceRefs'

test('buildProjectAssetResourceRef maps primary and optional asset resources by role', () => {
  const sprite = {
    ...createPersonalSpaceAsset({
      kind: 'sprite',
      assetSubtype: 'character_sprite',
      name: '行走',
      resourcePaths: ['walk.png', 'index.json'],
    }),
    coverResourcePath: 'walk-cover.png',
    coverStorageResourcePath: 'ProjectRoot/图片/2026-06-23/walk-cover.png',
  }
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [sprite] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  const asset = rows.assets[0]!

  assert.deepEqual(buildProjectAssetResourceRef('remote', asset, 'primary'), {
    projectId: 'p1',
    projectMode: 'remote',
    assetId: asset.id,
    resourceId: asset.primary_resource_id,
    role: 'primary',
    objectKey: asset.primary_object_key,
    mimeType: asset.primary_mime_type,
    sizeBytes: asset.primary_size_bytes,
    hashSha256: asset.primary_hash_sha256,
  })
  assert.deepEqual(buildProjectAssetResourceRef('remote', asset, 'sprite_index'), {
    projectId: 'p1',
    projectMode: 'remote',
    assetId: asset.id,
    resourceId: asset.sprite_index_resource_id,
    role: 'sprite_index',
    objectKey: asset.sprite_index_object_key,
    mimeType: asset.sprite_index_mime_type,
    sizeBytes: asset.sprite_index_size_bytes,
    hashSha256: asset.sprite_index_hash_sha256,
  })
  assert.deepEqual(buildProjectAssetResourceRef('remote', asset, 'cover'), {
    projectId: 'p1',
    projectMode: 'remote',
    assetId: asset.id,
    resourceId: asset.cover_resource_id,
    role: 'cover',
    objectKey: asset.cover_object_key,
    mimeType: asset.cover_mime_type,
    sizeBytes: asset.cover_size_bytes,
    hashSha256: asset.cover_hash_sha256,
  })
})

test('buildProjectAssetResourceRef returns null for missing optional resources and lists existing object keys', () => {
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['welcome.wav'],
  })
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [voice] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  const asset = rows.assets[0]!

  assert.equal(buildProjectAssetResourceRef('local', asset, 'sprite_index'), null)
  assert.equal(buildProjectAssetResourceRef('local', asset, 'cover'), null)
  assert.deepEqual(listAssetObjectKeys(asset), [asset.primary_object_key])
})
