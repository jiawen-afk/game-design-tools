import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('project storage repository structure tests stay split by repository responsibility', () => {
  const source = readFileSync('src/projectStorageRepositoryStructure.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/projectStorageRemoteRepositoryStructure.test.ts',
    'src/projectStorageLocalRepositoryStructure.test.ts',
    'src/projectStorageLocalRepositoryBridgeStructure.test.ts',
    'src/projectStorageElectronDocumentRepositoryStructure.test.ts',
    'src/projectStorageMemoryDocumentRepositoryStructure.test.ts',
    'src/projectStorageMemoryRepositoryStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'projectStorageRepositoryStructure.test.ts should only keep split guards')
  for (const delegatedToken of [
    'createDesktop' + 'RemoteProject' + 'Repository',
    'projectLocal' + 'Database',
    'projectDocument' + 'GraphModel',
    'MemoryProject' + 'DocumentStore',
    'Project' + 'Repository',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
