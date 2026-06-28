import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('current project space persistence tests stay split by storage mode', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/currentProjectSpacePersistence.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/PersonalSpaceWorkspace/currentProjectSpaceLocalLoad.test.ts',
    'src/components/PersonalSpaceWorkspace/currentProjectSpaceRemoteLoad.test.ts',
    'src/components/PersonalSpaceWorkspace/currentProjectSpaceLocalPersist.test.ts',
    'src/components/PersonalSpaceWorkspace/currentProjectSpaceRemotePersist.test.ts',
    'src/components/PersonalSpaceWorkspace/currentProjectSpaceRemoteFallback.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/').replace(/\./g, '\\.')))
  }

  assert.ok(source.split(/\r?\n/).length <= 80, 'currentProjectSpacePersistence.test.ts should only keep split guards')
  for (const delegatedToken of [
    'remote project load ' + 'still returns remote data',
    'local project load ' + 'restores workspace state',
    'remote project load ' + 'reports cover object keys',
    'current project persistence syncs external workspace changes ' + 'to local project storage',
    'current project persistence syncs external workspace changes ' + 'to remote project storage',
    'project space loader returns cached remote state ' + 'and named warning',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
