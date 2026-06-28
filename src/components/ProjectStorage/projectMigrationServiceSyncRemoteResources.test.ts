import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { createMemoryDirectoryHandle } from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'
import { createMemoryProjectAssetCacheStorage, createProjectAssetFingerprint, createProjectAssetManager } from './projectAssetManager'
import { syncProjectSpaceStateToLocalProjectStorage } from './projectMigrationService'
import { createSyncVoiceAsset } from './projectMigrationServiceSyncTestHelpers.test'
import { createMemoryProjectRepository } from './projectSqliteRepository'

test('syncing project snapshot to remote caches uploaded resources through asset manager', async () => {
  const remote = createMemoryProjectRepository()
  const localObjects = createMemoryProjectObjectStorage()
  const remoteObjects = createMemoryProjectObjectStorage()
  const cacheStorage = createMemoryProjectAssetCacheStorage()
  const assetManager = createProjectAssetManager({
    localObjectStorage: localObjects,
    remoteObjectStorage: remoteObjects,
    cacheStorage,
  })
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  await remote.initializeSchema()
  await directory.writeText('配音/2026-06-23/welcome.wav', 'voice-bytes')
  const voice = createSyncVoiceAsset()

  const rows = await syncProjectSpaceStateToLocalProjectStorage({
    projectId: 'p1',
    projectName: '远程项目',
    localObjectRoot: '',
    state: { ...defaultPersonalSpaceState, assets: [voice] },
    repository: remote,
    objectStorage: remoteObjects,
    assetManager,
    storageProvider: 'qiniu_kodo',
    databaseProvider: 'postgresql',
    remoteDatabaseProfileId: 'db1',
    remoteStorageProfileId: 'kodo1',
    directoryHandle: directory,
    now: '2026-06-23T01:00:00.000Z',
  })

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
  assert.equal(await (await remoteObjects.getObject(asset.primary_object_key)).text(), 'voice-bytes')
  assert.equal(await (await cacheStorage.getCachedResource(ref, createProjectAssetFingerprint(ref)))!.text(), 'voice-bytes')
})

test('syncing unchanged remote project resources does not upload duplicate objects', async () => {
  const remote = createMemoryProjectRepository()
  const remoteObjects = createMemoryProjectObjectStorage()
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  const uploadedObjectKeys: string[] = []
  const assetManager = {
    async putResource(ref: { objectKey: string }, blob: Blob) {
      uploadedObjectKeys.push(ref.objectKey)
      await remoteObjects.putObject(ref.objectKey, blob)
    },
    async getResourceBlob() {
      throw new Error('not used')
    },
    async resolveResourceSource() {
      throw new Error('not used')
    },
    async deleteResources() {},
    async deleteProjectCache() {},
  }
  await remote.initializeSchema()
  await directory.writeText('图片/2026-06-23/portrait.png', 'portrait-bytes')
  const portrait = {
    ...createPersonalSpaceAsset({
      kind: 'image',
      assetSubtype: 'portrait',
      name: '主角头像',
      groupName: '角色肖像',
      resourcePaths: ['blob:expired-portrait'],
    }),
    createdAt: '2026-06-23T00:00:00.000Z',
    storageResourcePaths: ['ProjectRoot/图片/2026-06-23/portrait.png'],
  }
  const state = { ...defaultPersonalSpaceState, assets: [portrait] }
  const syncInput = {
    projectId: 'p1',
    projectName: '远程项目',
    localObjectRoot: '',
    state,
    repository: remote,
    objectStorage: remoteObjects,
    assetManager,
    storageProvider: 'qiniu_kodo' as const,
    databaseProvider: 'postgresql' as const,
    remoteDatabaseProfileId: 'db1',
    remoteStorageProfileId: 'kodo1',
    directoryHandle: directory,
  }

  const firstRows = await syncProjectSpaceStateToLocalProjectStorage({
    ...syncInput,
    now: '2026-06-23T01:00:00.000Z',
  })
  const firstObjectKey = firstRows.assets[0]!.primary_object_key
  await syncProjectSpaceStateToLocalProjectStorage({
    ...syncInput,
    now: '2026-06-23T01:05:00.000Z',
  })

  const remoteRows = await remote.exportProjectRows('p1')
  assert.ok(remoteRows)
  assert.deepEqual(uploadedObjectKeys, [firstObjectKey])
  assert.equal(remoteRows.assets[0]!.primary_object_key, firstObjectKey)
})
