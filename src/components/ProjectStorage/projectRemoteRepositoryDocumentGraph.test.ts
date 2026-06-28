import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('remote repository document graph tests stay split by query responsibility', () => {
  const source = readFileSync('src/components/ProjectStorage/projectRemoteRepositoryDocumentGraph.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const helperPath = 'src/components/ProjectStorage/projectRemoteRepositoryDocumentGraphTestHelpers.test.ts'
  const focusedSuites = [
    'src/components/ProjectStorage/projectRemoteRepositoryDocumentGraphWrite.test.ts',
    'src/components/ProjectStorage/projectRemoteRepositoryDocumentGraphRead.test.ts',
  ]

  assert.ok(existsSync(helperPath), `${helperPath} should exist`)
  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'projectRemoteRepositoryDocumentGraph.test.ts should only keep split guards')
  for (const delegatedToken of [
    'replaces document graph ' + 'rows with parameterized',
    'initializes schema and ' + 'retries when document collection',
    'batches document graph ' + 'row upserts',
    'reads document source content ' + 'and projects collection graph',
    'searches document nodes ' + 'and deletes collections',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
