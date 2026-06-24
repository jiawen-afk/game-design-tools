import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createPersonalSpaceAsset, defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import type {
  CreateLocalProjectInput,
  ProjectWithSettings,
  ProjectRepository,
  CreateRemoteProjectInput,
} from './projectSqliteRepository'

const require = createRequire(import.meta.url)
const {
  createLocalProjectRepository,
} = require('../../../electron/projectLocalRepository.cjs') as {
  createLocalProjectRepository: (databasePath: string) => ProjectRepository
}

test('local sqlite repository persists project rows across repository instances', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'gdt-project-sqlite-'))
  try {
    const databasePath = path.join(tempDir, 'projects.sqlite')
    const repository = createLocalProjectRepository(databasePath)
    await repository.initializeSchema()

    const created = await repository.createProject({
      name: '本地项目',
      description: '本地资产',
      localObjectRoot: 'D:\\GameAssets',
      now: '2026-06-23T00:00:00.000Z',
    } satisfies CreateLocalProjectInput)

    assert.equal(created.project.object_key_prefix, 'objects/本地项目')

    const reopenedAfterCreate = createLocalProjectRepository(databasePath)
    const loadedCreated = await reopenedAfterCreate.getProject(created.project.id)
    assert.equal(loadedCreated?.project.name, '本地项目')
    assert.equal(loadedCreated?.settings.database_provider, 'sqlite')

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

    await reopenedAfterCreate.importProjectRows(rows)

    const reopenedAfterImport = createLocalProjectRepository(databasePath)
    assert.deepEqual(await reopenedAfterImport.exportProjectRows('p1'), rows)
    assert.equal((await reopenedAfterImport.listAssets('p1')).length, 1)

    await reopenedAfterImport.deleteProject('p1')

    const reopenedAfterDelete = createLocalProjectRepository(databasePath)
    assert.equal(await reopenedAfterDelete.getProject('p1'), null)
    assert.deepEqual(await reopenedAfterDelete.listAssets('p1'), [])
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

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
