import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('memory sqlite repository tests stay split by repository responsibility', () => {
  const source = readFileSync('src/components/ProjectStorage/projectSqliteRepository.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/ProjectStorage/projectSqliteRepositoryProject.test.ts',
    'src/components/ProjectStorage/projectSqliteRepositoryRows.test.ts',
    'src/components/ProjectStorage/projectSqliteRepositoryDocument.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'projectSqliteRepository.test.ts should only keep split guards')
  for (const delegatedToken of [
    'createMemory' + 'ProjectRepository',
    'migratePersonal' + 'SpaceStateToProjectRows',
    'document' + 'Collections',
    'remote_database' + '_profile_id',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
