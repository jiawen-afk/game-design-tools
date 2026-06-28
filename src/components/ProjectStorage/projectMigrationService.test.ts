import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('project migration service tests live in focused files', () => {
  const source = readFileSync('src/components/ProjectStorage/projectMigrationService.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const migrationPath = 'src/components/ProjectStorage/projectMigrationServiceMigration.test.ts'
  const syncPath = 'src/components/ProjectStorage/projectMigrationServiceSync.test.ts'
  const syncLocalPath = 'src/components/ProjectStorage/projectMigrationServiceSyncLocal.test.ts'
  const syncRemotePath = 'src/components/ProjectStorage/projectMigrationServiceSyncRemote.test.ts'
  const syncRemoteResourcesPath = 'src/components/ProjectStorage/projectMigrationServiceSyncRemoteResources.test.ts'
  const deletePath = 'src/components/ProjectStorage/projectMigrationServiceDelete.test.ts'
  const migrationSource = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : ''
  const syncSource = existsSync(syncPath) ? readFileSync(syncPath, 'utf8') : ''
  const syncLocalSource = existsSync(syncLocalPath) ? readFileSync(syncLocalPath, 'utf8') : ''
  const deleteSource = existsSync(deletePath) ? readFileSync(deletePath, 'utf8') : ''

  for (const path of [migrationPath, syncPath, syncLocalPath, syncRemotePath, syncRemoteResourcesPath, deletePath]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectMigrationServiceMigration\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectMigrationServiceSync\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectMigrationServiceSyncLocal\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectMigrationServiceSyncRemote\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectMigrationServiceSyncRemoteResources\.test\.ts/)
  assert.match(packageSource, /src\/components\/ProjectStorage\/projectMigrationServiceDelete\.test\.ts/)
  assert.doesNotMatch(source, new RegExp("test\\('" + 'local to remote migration keeps project local'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'syncing the active project snapshot before migration'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'hard delete records cleanup failures'))
  assert.match(migrationSource, new RegExp("test\\('" + 'project migration service migration tests stay split'))
  assert.match(syncSource, new RegExp("test\\('" + 'project migration sync tests stay split'))
  assert.match(syncLocalSource, new RegExp("test\\('" + 'syncing the active project snapshot before migration'))
  assert.match(deleteSource, new RegExp("test\\('" + 'hard delete records cleanup failures'))
})
