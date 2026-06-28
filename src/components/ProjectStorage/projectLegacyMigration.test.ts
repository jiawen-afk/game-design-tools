import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('legacy migration tests stay split by migration direction', () => {
  const source = readFileSync('src/components/ProjectStorage/projectLegacyMigration.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/ProjectStorage/projectLegacyMigrationDefaults.test.ts',
    'src/components/ProjectStorage/projectLegacyMigrationRows.test.ts',
    'src/components/ProjectStorage/projectLegacyMigrationRestore.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/').replace(/\./g, '\\.')))
  }

  assert.ok(source.split(/\r?\n/).length <= 80, 'projectLegacyMigration.test.ts should only keep split guards')
  for (const delegatedToken of [
    'creates a default ' + 'local project',
    'converts assets, ' + 'groups, character links',
    'restore project space ' + 'state with groups',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
