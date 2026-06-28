import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('remote repository PostgreSQL connection tests stay split by error responsibility', () => {
  const source = readFileSync('src/components/ProjectStorage/projectRemoteRepositoryPostgresConnection.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/ProjectStorage/projectRemoteRepositoryPostgresErrorHandling.test.ts',
    'src/components/ProjectStorage/projectRemoteRepositoryPostgresRetry.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'projectRemoteRepositoryPostgresConnection.test.ts should only keep split guards')
  for (const delegatedToken of [
    'swallows late PostgreSQL ' + 'connection error events',
    'retries PostgreSQL ' + 'connect',
    'retries PostgreSQL ' + 'reads',
    'reports exhausted PostgreSQL ' + 'drops',
    'client becomes ' + 'non-queryable',
    'background connection ' + 'error before the next query',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
