import test from 'node:test'
import assert from 'node:assert/strict'

import { createPersonalSpaceAsset, defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
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
  assert.equal(project.project.object_key_prefix, `objects/${project.project.id}`)
  assert.equal(project.settings.database_provider, 'sqlite')
  assert.equal(project.settings.storage_provider, 'local')
  assert.equal(project.settings.local_object_root, 'D:\\GameAssets')
  assert.deepEqual((await repository.listProjects()).map((item) => item.name), ['本地项目'])
})

test('local project repository imports migrated rows and hard deletes project rows', async () => {
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
  assert.equal((await repository.getProject('p1'))!.project.name, '默认项目')
  assert.equal((await repository.listAssets('p1')).length, 1)

  await repository.deleteProject('p1')
  assert.deepEqual(await repository.listProjects(), [])
  assert.equal(await repository.getProject('p1'), null)
  assert.deepEqual(await repository.listAssets('p1'), [])
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
