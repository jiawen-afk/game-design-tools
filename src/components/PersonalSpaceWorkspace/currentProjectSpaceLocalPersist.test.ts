import test from 'node:test'
import assert from 'node:assert/strict'

import { activeProjectStorageKey } from '../ProjectStorage/projectActiveProject'
import { createMemoryProjectObjectStorage } from '../ProjectStorage/projectLocalObjectStorage'
import { createMemoryProjectRepository } from '../ProjectStorage/projectSqliteRepository'
import { defaultPersonalSpaceState } from './personalSpaceModel'
import { persistCurrentProjectSpaceState } from './currentProjectSpacePersistence'
import { readCurrentProjectSpaceState } from './projectSpaceState'
import { createMemoryStorage } from './currentProjectSpacePersistenceTestHelpers.test'
import { createPersistedVoiceFixture } from './currentProjectSpacePersistTestHelpers.test'

test('current project persistence syncs external workspace changes to local project storage', async () => {
  const storage = createMemoryStorage({ [activeProjectStorageKey]: 'p1' })
  const repository = createMemoryProjectRepository()
  const localObjects = createMemoryProjectObjectStorage()
  const { directory, voice } = await createPersistedVoiceFixture()
  await repository.initializeSchema()
  await repository.createProject({
    name: '本地项目',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now: '2026-06-25T00:00:00.000Z',
  })
  const createdProject = (await repository.listProjects())[0]!
  await repository.updateProject(createdProject.id, {
    name: '本地项目',
    description: '',
    updatedAt: '2026-06-25T00:00:00.000Z',
  })
  storage.setItem(activeProjectStorageKey, createdProject.id)

  const result = await persistCurrentProjectSpaceState({
    ...defaultPersonalSpaceState,
    assets: [voice],
  }, {
    storage,
    localRepository: repository,
    localObjectStorage: localObjects,
    getDirectoryHandle: async () => directory,
    now: () => '2026-06-25T01:00:00.000Z',
  })

  assert.equal(result.synced, true)
  assert.equal(result.projectId, createdProject.id)
  assert.deepEqual(readCurrentProjectSpaceState(storage).assets.map((asset) => asset.name), ['欢迎'])
  const rows = await repository.exportProjectRows(createdProject.id)
  assert.ok(rows)
  assert.equal(rows.assets.length, 1)
  assert.equal(await (await localObjects.getObject(rows.assets[0]!.primary_object_key)).text(), 'voice-bytes')
})
