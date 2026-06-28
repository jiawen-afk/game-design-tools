import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('local sqlite repository tests stay split by persistence responsibility', () => {
  const source = readFileSync('src/components/ProjectStorage/projectLocalSqliteRepository.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/ProjectStorage/projectLocalSqliteRepositoryProject.test.ts',
    'src/components/ProjectStorage/projectLocalSqliteRepositoryDocument.test.ts',
    'src/components/ProjectStorage/projectLocalSqliteRepositoryDeviceBinding.test.ts',
    'src/components/ProjectStorage/projectLocalSqliteRepositorySchema.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'projectLocalSqliteRepository.test.ts should only keep split guards')
  for (const delegatedToken of [
    'objects/' + '本地项目',
    'replace' + 'DocumentGraph',
    'current-device' + '-db',
    'cover_' + 'resource_id',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
