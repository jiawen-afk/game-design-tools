import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { createMemoryProjectAssetCacheStorage, createProjectAssetFingerprint, createProjectAssetManager } from './projectAssetManager'
import { hardDeleteProjectWithObjects } from './projectMigrationService'
import { createMemoryProjectRepository } from './projectSqliteRepository'

test('hard delete records cleanup failures for object deletion', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
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
  await repository.importProjectRows(rows)
  const objectKey = rows.assets[0]!.primary_object_key
  const storage = createMemoryProjectObjectStorage({ failDeleteKeys: new Set([objectKey]) })

  const result = await hardDeleteProjectWithObjects({
    projectId: 'p1',
    repository,
    objectStorage: storage,
    storageProvider: 'qiniu_kodo',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(result.deletedProject, true)
  assert.deepEqual(result.cleanupTasks.map((task) => task.storage_provider), ['qiniu_kodo'])
  assert.deepEqual(result.cleanupTasks.map((task) => task.object_key), [objectKey])
  assert.deepEqual((await repository.listCleanupTasks('p1')).map((task) => task.object_key), [objectKey])
  assert.deepEqual(await repository.listProjects(), [])
})

test('hard deleting a remote project can also remove the migrated local snapshot', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  await local.initializeSchema()
  await remote.initializeSchema()
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
  await local.importProjectRows(rows)
  await remote.importProjectRows({
    ...rows,
    project: { ...rows.project, mode: 'remote' },
    settings: {
      ...rows.settings,
      storage_provider: 'qiniu_kodo',
      database_provider: 'postgresql',
      local_object_root: null,
      remote_database_profile_id: 'db1',
      remote_storage_profile_id: 'kodo1',
    },
  })
  const storage = createMemoryProjectObjectStorage()

  await hardDeleteProjectWithObjects({
    projectId: 'p1',
    repository: remote,
    localRepository: local,
    objectStorage: storage,
    storageProvider: 'qiniu_kodo',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.deepEqual(await remote.listProjects(), [])
  assert.deepEqual(await local.listProjects(), [])
})

test('hard deleting a project clears project asset cache', async () => {
  const repository = createMemoryProjectRepository()
  const storage = createMemoryProjectObjectStorage()
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const assetManager = createProjectAssetManager({
    localObjectStorage: storage,
    remoteObjectStorage: storage,
    cacheStorage,
  })
  await repository.initializeSchema()
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
  await repository.importProjectRows(rows)
  const asset = rows.assets[0]!
  const ref = {
    projectId: 'p1',
    projectMode: 'remote' as const,
    assetId: asset.id,
    resourceId: asset.primary_resource_id,
    role: 'primary' as const,
    objectKey: asset.primary_object_key,
    mimeType: asset.primary_mime_type,
    sizeBytes: asset.primary_size_bytes,
    hashSha256: asset.primary_hash_sha256,
  }
  await cacheStorage.putCachedResource(ref, createProjectAssetFingerprint(ref), new Blob(['cache']))

  await hardDeleteProjectWithObjects({
    projectId: 'p1',
    repository,
    objectStorage: storage,
    assetManager,
    storageProvider: 'qiniu_kodo',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(await cacheStorage.getCachedResource(ref, createProjectAssetFingerprint(ref)), null)
})
