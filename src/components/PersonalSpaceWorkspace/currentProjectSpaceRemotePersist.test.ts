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

test('current project persistence syncs external workspace changes to remote project storage', async () => {
  const storage = createMemoryStorage({ [activeProjectStorageKey]: 'p1' })
  const localRepository = createMemoryProjectRepository()
  const remoteRepository = createMemoryProjectRepository()
  const localObjects = createMemoryProjectObjectStorage()
  const remoteObjects = createMemoryProjectObjectStorage()
  const { directory, voice } = await createPersistedVoiceFixture()
  await localRepository.initializeSchema()
  await remoteRepository.initializeSchema()
  await remoteRepository.createRemoteProject({
    id: 'p1',
    name: '远程项目',
    description: '',
    databaseProvider: 'postgresql',
    databaseProfileId: 'db-current',
    storageProfileId: 'kodo-current',
    now: '2026-06-25T00:00:00.000Z',
  })

  const result = await persistCurrentProjectSpaceState({
    ...defaultPersonalSpaceState,
    assets: [voice],
  }, {
    storage,
    localRepository,
    remoteRepository,
    localObjectStorage: localObjects,
    remoteObjectStorage: remoteObjects,
    getDirectoryHandle: async () => directory,
    now: () => '2026-06-25T01:00:00.000Z',
  })

  assert.equal(result.synced, true)
  assert.equal(result.projectId, 'p1')
  assert.deepEqual(readCurrentProjectSpaceState(storage).assets.map((asset) => asset.name), ['欢迎'])
  const rows = await remoteRepository.exportProjectRows('p1')
  assert.ok(rows)
  assert.equal(rows.project.mode, 'remote')
  assert.equal(rows.assets.length, 1)
  assert.equal(await (await remoteObjects.getObject(rows.assets[0]!.primary_object_key)).text(), 'voice-bytes')
})
