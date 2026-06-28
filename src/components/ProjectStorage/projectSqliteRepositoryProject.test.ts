import test from 'node:test'
import assert from 'node:assert/strict'

import { defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { createMemoryProjectRepository } from './projectSqliteRepository'

test('local project repository initializes schema idempotently and stores projects', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
  await repository.initializeSchema()

  const project = await repository.createProject({
    name: '本地项目',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(project.project.name, '本地项目')
  assert.equal(project.project.mode, 'local')
  assert.equal(project.project.object_key_prefix, 'objects/本地项目')
  assert.equal(project.settings.database_provider, 'sqlite')
  assert.equal(project.settings.storage_provider, 'local')
  assert.equal(project.settings.local_object_root, 'D:\\GameAssets')
  assert.deepEqual((await repository.listProjects()).map((item) => item.name), ['本地项目'])
})

test('local project repository updates project name and description', async () => {
  const repository = createMemoryProjectRepository()
  const created = await repository.createProject({
    name: '旧项目',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now: '2026-06-23T00:00:00.000Z',
  })

  await repository.updateProject(created.project.id, {
    name: '新项目',
    description: '项目说明',
    updatedAt: '2026-06-24T00:00:00.000Z',
  })

  const updated = await repository.getProject(created.project.id)
  assert.equal(updated!.project.name, '新项目')
  assert.equal(updated!.project.description, '项目说明')
  assert.equal(updated!.project.updated_at, '2026-06-24T00:00:00.000Z')
})

test('local project repository creates remote projects only with remote settings', async () => {
  const repository = createMemoryProjectRepository()
  const created = await repository.createRemoteProject({
    id: 'remote-p1',
    name: '远程项目',
    description: '团队资产',
    databaseProvider: 'mysql',
    databaseProfileId: 'db1',
    storageProfileId: 'kodo1',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(created.project.id, 'remote-p1')
  assert.equal(created.project.mode, 'remote')
  assert.equal(created.project.object_key_prefix, 'objects/远程项目')
  assert.equal(created.settings.storage_provider, 'qiniu_kodo')
  assert.equal(created.settings.database_provider, 'mysql')
  assert.equal(created.settings.local_object_root, null)
  assert.equal(created.settings.remote_database_profile_id, null)
  assert.equal(created.settings.remote_storage_profile_id, null)
})

test('local project repository keeps device profile ids out of shared project settings', async () => {
  const repository = createMemoryProjectRepository()
  const created = await repository.createRemoteProject({
    id: 'remote-p1',
    name: '远程项目',
    description: '团队资产',
    databaseProvider: 'postgresql',
    databaseProfileId: 'db1',
    storageProfileId: 'kodo1',
    now: '2026-06-23T00:00:00.000Z',
  })

  const updated = await repository.updateProject(created.project.id, {
    name: '远程项目',
    description: '团队资产',
    updatedAt: '2026-06-24T00:00:00.000Z',
    databaseProvider: 'mysql',
    databaseProfileId: 'db2',
    storageProfileId: 'kodo2',
  })

  assert.equal(updated!.settings.database_provider, 'mysql')
  assert.equal(updated!.settings.remote_database_profile_id, null)
  assert.equal(updated!.settings.remote_storage_profile_id, null)
  assert.equal(updated!.settings.updated_at, '2026-06-24T00:00:00.000Z')
  assert.equal((await repository.getProject(created.project.id))!.settings.remote_storage_profile_id, null)
})

test('local project repository clears legacy shared device profile ids when renaming remote project', async () => {
  const repository = createMemoryProjectRepository()
  const rows = migratePersonalSpaceStateToProjectRows(defaultPersonalSpaceState, {
    projectId: 'remote-p1',
    projectName: '远程项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: '',
  })
  await repository.importProjectRows({
    ...rows,
    project: {
      ...rows.project,
      mode: 'remote',
    },
    settings: {
      ...rows.settings,
      storage_provider: 'qiniu_kodo',
      database_provider: 'postgresql',
      local_object_root: null,
      remote_database_profile_id: 'old-device-db',
      remote_storage_profile_id: 'old-device-kodo',
    },
  })

  const updated = await repository.updateProject('remote-p1', {
    name: '远程项目新名称',
    description: '团队资产',
    updatedAt: '2026-06-24T00:00:00.000Z',
  })

  assert.equal(updated!.settings.remote_database_profile_id, null)
  assert.equal(updated!.settings.remote_storage_profile_id, null)
  assert.equal((await repository.exportProjectRows('remote-p1'))!.settings.remote_database_profile_id, null)
  assert.equal((await repository.exportProjectRows('remote-p1'))!.settings.remote_storage_profile_id, null)
})
