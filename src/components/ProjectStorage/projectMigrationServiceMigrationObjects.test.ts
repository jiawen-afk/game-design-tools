import test from 'node:test'
import assert from 'node:assert/strict'

import { createMemoryProjectAssetCacheStorage, createProjectAssetFingerprint, createProjectAssetManager } from './projectAssetManager'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'
import { migrateLocalProjectToRemote } from './projectMigrationService'
import {
  createMigrationImageAssetWithCover,
  createMigrationRepositories,
  createMigrationRows,
  createMigrationVoiceAsset,
  importLocalRows,
} from './projectMigrationServiceMigrationTestHelpers.test'

test('local to remote migration copies object bytes from local storage to remote storage', async () => {
  const { local, remote } = await createMigrationRepositories()
  const localObjects = createMemoryProjectObjectStorage()
  const remoteObjects = createMemoryProjectObjectStorage()
  const rows = await importLocalRows(local, createMigrationRows([createMigrationVoiceAsset()]))
  const objectKey = rows.assets[0]!.primary_object_key
  await localObjects.putObject(objectKey, new Blob(['voice-bytes'], { type: 'audio/wav' }))

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    sourceObjectStorage: localObjects,
    remoteObjectStorage: remoteObjects,
    now: '2026-06-23T01:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
  assert.equal(await (await remoteObjects.getObject(objectKey)).text(), 'voice-bytes')
})

test('local to remote migration caches uploaded remote resources through asset manager', async () => {
  const { local, remote } = await createMigrationRepositories()
  const localObjects = createMemoryProjectObjectStorage()
  const remoteObjects = createMemoryProjectObjectStorage()
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const assetManager = createProjectAssetManager({
    localObjectStorage: localObjects,
    remoteObjectStorage: remoteObjects,
    cacheStorage,
  })
  const rows = await importLocalRows(local, createMigrationRows([createMigrationVoiceAsset()]))
  const asset = rows.assets[0]!
  await localObjects.putObject(asset.primary_object_key, new Blob(['voice-bytes'], { type: 'audio/wav' }))

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    sourceObjectStorage: localObjects,
    remoteObjectStorage: remoteObjects,
    assetManager,
    now: '2026-06-23T01:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
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
  assert.equal(await (await cacheStorage.getCachedResource(ref, createProjectAssetFingerprint(ref)))!.text(), 'voice-bytes')
})

test('local to remote migration uploads cover resources with primary resources', async () => {
  const { local, remote } = await createMigrationRepositories()
  const rows = await importLocalRows(local, createMigrationRows([createMigrationImageAssetWithCover()]))
  const uploadedKeys: string[] = []

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    uploadObject: async (objectKey) => { uploadedKeys.push(objectKey) },
    now: '2026-06-23T01:00:00.000Z',
  })

  assert.equal(result.status, 'succeeded')
  assert.deepEqual(uploadedKeys, [
    rows.assets[0]!.primary_object_key,
    rows.assets[0]!.cover_object_key,
  ])
})
