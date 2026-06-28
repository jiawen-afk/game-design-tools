import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('project migration sync tests stay split by storage responsibility', () => {
  const source = readFileSync('src/components/ProjectStorage/projectMigrationServiceSync.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/ProjectStorage/projectMigrationServiceSyncLocal.test.ts',
    'src/components/ProjectStorage/projectMigrationServiceSyncRemote.test.ts',
    'src/components/ProjectStorage/projectMigrationServiceSyncRemoteResources.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'projectMigrationServiceSync.test.ts should only keep split guards')
  for (const delegatedToken of [
    'assignAsset' + 'ToCharacterColumn',
    'voices precede' + ' sprites',
    'qiniu_' + 'kodo',
    'uploadedObject' + 'Keys',
    'cover-' + 'bytes',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
