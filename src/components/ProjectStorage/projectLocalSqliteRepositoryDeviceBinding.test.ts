import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { createLocalProjectRepository } from './projectLocalSqliteRepositoryTestHelpers.test'
import type { CreateRemoteProjectInput } from './projectSqliteRepository'

test('local sqlite repository keeps updated device profile ids out of shared settings', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'gdt-project-sqlite-'))
  try {
    const databasePath = path.join(tempDir, 'projects.sqlite')
    const repository = createLocalProjectRepository(databasePath)
    const created = await repository.createRemoteProject({
      id: 'remote-p1',
      name: '远程项目',
      description: '团队资产',
      databaseProvider: 'postgresql',
      databaseProfileId: 'db1',
      storageProfileId: 'kodo1',
      now: '2026-06-23T00:00:00.000Z',
    } satisfies CreateRemoteProjectInput)

    await repository.updateProject(created.project.id, {
      name: '远程项目',
      description: '团队资产',
      updatedAt: '2026-06-24T00:00:00.000Z',
      databaseProvider: 'mysql',
      databaseProfileId: 'db2',
      storageProfileId: 'kodo2',
    })

    const reopened = createLocalProjectRepository(databasePath)
    const updated = await reopened.getProject(created.project.id)
    assert.equal(updated?.settings.database_provider, 'mysql')
    assert.equal(updated?.settings.remote_database_profile_id, null)
    assert.equal(updated?.settings.remote_storage_profile_id, null)
    assert.equal(updated?.settings.updated_at, '2026-06-24T00:00:00.000Z')
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('local sqlite repository persists current-device bindings outside exported project rows', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'gdt-project-sqlite-'))
  try {
    const databasePath = path.join(tempDir, 'projects.sqlite')
    const repository = createLocalProjectRepository(databasePath)
    await repository.initializeSchema()
    await repository.write('remote-p1', {
      databaseProfileId: 'db-current-device',
      storageProfileId: 'kodo-current-device',
    })

    const reopened = createLocalProjectRepository(databasePath)
    assert.deepEqual(await reopened.list(), {
      'remote-p1': {
        databaseProfileId: 'db-current-device',
        storageProfileId: 'kodo-current-device',
      },
    })

    const rows = migratePersonalSpaceStateToProjectRows(defaultPersonalSpaceState, {
      projectId: 'remote-p1',
      projectName: '远程项目',
      now: '2026-06-23T00:00:00.000Z',
      localObjectRoot: '',
    })
    await reopened.importProjectRows({
      ...rows,
      project: { ...rows.project, mode: 'remote' },
      settings: {
        ...rows.settings,
        storage_provider: 'qiniu_kodo',
        database_provider: 'postgresql',
        local_object_root: null,
        remote_database_profile_id: null,
        remote_storage_profile_id: null,
      },
    })

    const exportedRows = await reopened.exportProjectRows('remote-p1')
    assert.ok(exportedRows)
    assert.equal('projectDeviceBindings' in exportedRows, false)

    await reopened.clear('remote-p1')
    assert.deepEqual(await createLocalProjectRepository(databasePath).list(), {})
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('local sqlite repository clears legacy shared device profile ids when renaming remote project', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'gdt-project-sqlite-'))
  try {
    const databasePath = path.join(tempDir, 'projects.sqlite')
    const repository = createLocalProjectRepository(databasePath)
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

    await repository.updateProject('remote-p1', {
      name: '远程项目新名称',
      description: '团队资产',
      updatedAt: '2026-06-24T00:00:00.000Z',
    })

    const reopened = createLocalProjectRepository(databasePath)
    const updated = await reopened.getProject('remote-p1')
    assert.equal(updated?.settings.remote_database_profile_id, null)
    assert.equal(updated?.settings.remote_storage_profile_id, null)
    assert.equal((await reopened.exportProjectRows('remote-p1'))?.settings.remote_database_profile_id, null)
    assert.equal((await reopened.exportProjectRows('remote-p1'))?.settings.remote_storage_profile_id, null)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})
