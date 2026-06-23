import test from 'node:test'
import assert from 'node:assert/strict'

import { createPersonalSpaceAsset, defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
import { createMemoryProjectObjectStorage } from './projectLocalObjectStorage'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { hardDeleteProjectWithObjects, migrateLocalProjectToRemote } from './projectMigrationService'
import { createMemoryProjectRepository } from './projectSqliteRepository'

test('local to remote migration keeps project local when object upload fails', async () => {
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

  const result = await migrateLocalProjectToRemote({
    projectId: 'p1',
    localRepository: local,
    remoteRepository: remote,
    uploadObject: async () => { throw new Error('upload failed') },
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(result.status, 'failed')
  assert.equal((await local.getProject('p1'))!.project.mode, 'local')
  assert.deepEqual(await remote.listProjects(), [])
})

test('local to remote migration imports project rows and switches remote settings after upload succeeds', async () => {
  const local = createMemoryProjectRepository()
  const remote = createMemoryProjectRepository()
  await local.initializeSchema()
  await remote.initializeSchema()
  const sprite = createPersonalSpaceAsset({
    kind: 'sprite',
    assetSubtype: 'character_sprite',
    name: '行走',
    resourcePaths: ['walk.png', 'index.json'],
  })
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [sprite] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  await local.importProjectRows(rows)
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
    rows.assets[0]!.sprite_index_object_key,
  ])
  const remoteProject = await remote.getProject('p1')
  assert.equal(remoteProject!.project.mode, 'remote')
  assert.equal(remoteProject!.settings.storage_provider, 'qiniu_kodo')
  assert.notEqual(remoteProject!.settings.database_provider, 'sqlite')
  assert.equal(remoteProject!.settings.local_object_root, null)
  assert.equal((await remote.listAssets('p1')).length, 1)
})

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
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(result.deletedProject, true)
  assert.deepEqual(result.cleanupTasks.map((task) => task.object_key), [objectKey])
  assert.deepEqual(await repository.listProjects(), [])
})
