import test from 'node:test'
import assert from 'node:assert/strict'

import { migrateLocalProjectToRemote } from './projectMigrationService'
import {
  createMigrationRepositories,
  createMigrationRows,
  createMigrationVoiceAsset,
  importLocalRows,
} from './projectMigrationServiceMigrationTestHelpers.test'

test('local to remote migration keeps project local when object upload fails', async () => {
  const { local, remote } = await createMigrationRepositories()
  await importLocalRows(local, createMigrationRows([createMigrationVoiceAsset()]))

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
