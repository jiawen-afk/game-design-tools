import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('project migration service migration tests stay split by migration responsibility', () => {
  const source = readFileSync('src/components/ProjectStorage/projectMigrationServiceMigration.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/ProjectStorage/projectMigrationServiceMigrationFailure.test.ts',
    'src/components/ProjectStorage/projectMigrationServiceMigrationRows.test.ts',
    'src/components/ProjectStorage/projectMigrationServiceMigrationObjects.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'projectMigrationServiceMigration.test.ts should only keep split guards')
  for (const delegatedToken of [
    'upload ' + 'fails',
    'switches remote ' + 'settings',
    'copies object ' + 'bytes',
    'caches uploaded remote ' + 'resources',
    'preserves project ' + 'groups',
    'cover ' + 'resources',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
