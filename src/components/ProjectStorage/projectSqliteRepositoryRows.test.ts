import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { createMemoryProjectRepository } from './projectSqliteRepository'

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

test('local project repository keeps cleanup tasks after hard deleting project rows', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
  const rows = migratePersonalSpaceStateToProjectRows(defaultPersonalSpaceState, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  const cleanupTask = {
    id: 'cleanup-1',
    project_id: 'p1',
    storage_provider: 'local' as const,
    object_key: 'objects/默认项目/audio_wav/welcome.wav',
    status: 'pending' as const,
    error_message: 'delete failed',
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
  }

  await repository.importProjectRows(rows)
  await repository.addCleanupTasks([cleanupTask])
  await repository.deleteProject('p1')

  assert.equal(await repository.getProject('p1'), null)
  assert.deepEqual(await repository.listCleanupTasks('p1'), [cleanupTask])
})

test('local project repository exports the complete project row set', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['welcome.wav'],
  })
  let state = addCharacterProfile({ ...defaultPersonalSpaceState, assets: [voice] }, '商人')
  state = addStoryboardGroup(state, '开场')
  state = assignAssetToCharacterColumn(state, state.characters[0]!.id, voice.id, 'voice')
  state = assignVoiceToStoryboardGroup(state, state.storyboardGroups[0]!.id, voice.id, '欢迎')
  const rows = migratePersonalSpaceStateToProjectRows(state, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })

  await repository.importProjectRows(rows)

  assert.deepEqual(await repository.exportProjectRows('p1'), rows)
})
