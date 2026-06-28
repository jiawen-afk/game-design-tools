import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { createMemoryDirectoryHandle } from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'
import { syncProjectSpaceStateToLocalProjectStorage } from './projectMigrationService'
import { createSyncVoiceAsset } from './projectMigrationServiceSyncTestHelpers.test'
import { createMemoryProjectRepository } from './projectSqliteRepository'

test('syncing project snapshot can persist directly to remote repository and object storage', async () => {
  const remote = createMemoryProjectRepository()
  const remoteObjects = createMemoryProjectObjectStorage()
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  await remote.initializeSchema()
  await remote.createRemoteProject({
    id: 'p1',
    name: '远程项目',
    description: '团队资产',
    databaseProvider: 'postgresql',
    databaseProfileId: 'db1',
    storageProfileId: 'kodo1',
    now: '2026-06-23T00:00:00.000Z',
  })
  await directory.writeText('配音/2026-06-23/welcome.wav', 'voice-bytes')
  const voice = createSyncVoiceAsset()
  const state = {
    ...defaultPersonalSpaceState,
    assets: [voice],
  }

  await syncProjectSpaceStateToLocalProjectStorage({
    projectId: 'p1',
    projectName: '远程项目',
    localObjectRoot: '',
    state,
    repository: remote,
    objectStorage: remoteObjects,
    storageProvider: 'qiniu_kodo',
    databaseProvider: 'postgresql',
    remoteDatabaseProfileId: 'db1',
    remoteStorageProfileId: 'kodo1',
    directoryHandle: directory,
    now: '2026-06-23T01:00:00.000Z',
  })

  const remoteRows = await remote.exportProjectRows('p1')
  assert.ok(remoteRows)
  assert.equal(remoteRows.project.mode, 'remote')
  assert.equal(remoteRows.settings.storage_provider, 'qiniu_kodo')
  assert.equal(remoteRows.settings.database_provider, 'postgresql')
  assert.equal(remoteRows.settings.remote_database_profile_id, null)
  assert.equal(remoteRows.settings.remote_storage_profile_id, null)
  assert.equal(remoteRows.settings.local_object_root, null)
  assert.equal(remoteRows.assets.length, 1)
  assert.equal(remoteRows.assets[0]!.id, voice.id)
  assert.equal(await (await remoteObjects.getObject(remoteRows.assets[0]!.primary_object_key)).text(), 'voice-bytes')
})

test('syncing restored remote project rows updates metadata without requiring local object reads', async () => {
  const remote = createMemoryProjectRepository()
  const remoteObjects = createMemoryProjectObjectStorage()
  await remote.initializeSchema()
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['objects/远程项目/audio_wav/r1.wav'],
  })
  const state = {
    ...defaultPersonalSpaceState,
    assets: [{
      ...voice,
      storageResourcePaths: ['objects/远程项目/audio_wav/r1.wav'],
    }],
  }

  await syncProjectSpaceStateToLocalProjectStorage({
    projectId: 'p1',
    projectName: '远程项目',
    localObjectRoot: '',
    state,
    repository: remote,
    objectStorage: remoteObjects,
    storageProvider: 'qiniu_kodo',
    databaseProvider: 'postgresql',
    remoteDatabaseProfileId: 'db1',
    remoteStorageProfileId: 'kodo1',
    directoryHandle: null,
    now: '2026-06-23T01:00:00.000Z',
  })

  const remoteRows = await remote.exportProjectRows('p1')
  assert.ok(remoteRows)
  assert.equal(remoteRows.assets[0]!.id, voice.id)
  assert.equal(remoteRows.assets[0]!.primary_object_key, 'objects/远程项目/audio_wav/r1.wav')
  await assert.rejects(remoteObjects.getObject('objects/远程项目/audio_wav/r1.wav'), /对象不存在/)
})
