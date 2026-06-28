import test from 'node:test'
import assert from 'node:assert/strict'

import { migrateLocalProjectToRemote } from './projectMigrationService'
import {
  createLinkedStoryboardMigrationRows,
  createMigrationRepositories,
  createMigrationRows,
  createMigrationSpriteAsset,
  createMigrationVoiceAsset,
  importLocalRows,
} from './projectMigrationServiceMigrationTestHelpers.test'

test('local to remote migration imports project rows and switches remote settings after upload succeeds', async () => {
  const { local, remote } = await createMigrationRepositories()
  const rows = await importLocalRows(local, createMigrationRows([createMigrationSpriteAsset()]))
  const uploadedKeys: string[] = []

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    uploadObject: async (objectKey) => { uploadedKeys.push(objectKey) },
    remoteDatabaseProfileId: 'db1',
    remoteStorageProfileId: 'kodo1',
    now: '2026-06-23T01:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
  assert.deepEqual(uploadedKeys, [
    rows.assets[0]!.primary_object_key,
    rows.assets[0]!.sprite_index_object_key,
  ])
  const remoteProject = await remote.getProject('p1')
  assert.equal(remoteProject!.project.mode, 'remote')
  assert.equal(remoteProject!.settings.storage_provider, 'qiniu_kodo')
  assert.notEqual(remoteProject!.settings.database_provider, 'sqlite')
  assert.equal(remoteProject!.settings.remote_database_profile_id, null)
  assert.equal(remoteProject!.settings.remote_storage_profile_id, null)
  assert.equal(remoteProject!.settings.local_object_root, null)
  assert.equal((await remote.listAssets('p1')).length, 1)
})

test('local to remote migration persists remote mode back to the local project snapshot', async () => {
  const { local, remote } = await createMigrationRepositories()
  await importLocalRows(local, createMigrationRows([createMigrationVoiceAsset()]))

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    uploadObject: async () => {},
    remoteDatabaseProvider: 'mysql',
    remoteDatabaseProfileId: 'db1',
    remoteStorageProfileId: 'kodo1',
    now: '2026-06-23T01:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
  const localSnapshot = await local.getProject('p1')
  assert.equal(localSnapshot!.project.mode, 'remote')
  assert.equal(localSnapshot!.settings.storage_provider, 'qiniu_kodo')
  assert.equal(localSnapshot!.settings.database_provider, 'mysql')
  assert.equal(localSnapshot!.settings.remote_database_profile_id, null)
  assert.equal(localSnapshot!.settings.remote_storage_profile_id, null)
  assert.equal(localSnapshot!.settings.local_object_root, null)
})

test('local to remote migration preserves project groups, character links, storyboards, and relations', async () => {
  const { local, remote } = await createMigrationRepositories()
  const rows = await importLocalRows(local, createLinkedStoryboardMigrationRows())

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    uploadObject: async () => {},
    now: '2026-06-23T01:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
  const migrated = await remote.exportProjectRows('p1')
  assert.ok(migrated)
  assert.deepEqual(migrated.assetGroups.map((group) => group.name), rows.assetGroups.map((group) => group.name))
  assert.deepEqual(migrated.characters.map((character) => character.name), ['商人'])
  assert.deepEqual(migrated.characterAssetLinks.map((link) => link.column_kind), ['voice'])
  assert.deepEqual(migrated.storyboardGroups.map((storyboard) => storyboard.name), ['开场'])
  assert.equal(migrated.storyboardVoiceEntries[0]!.start_offset_us, -200000)
  assert.deepEqual(migrated.assetRelations.map((relation) => relation.relation_type), ['effect_voice'])
})
