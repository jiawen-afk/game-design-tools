import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('project space state tests stay split by state boundary', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/projectSpaceState.test.ts', 'utf8')
  const focusedFiles = [
    ['src/components/PersonalSpaceWorkspace/projectSpaceStateDefaults.test.ts', 'empty project space state clones defaults with project-local storage directory and cleared stars'],
    ['src/components/PersonalSpaceWorkspace/projectSpaceStateStorage.test.ts', 'project space state stores independent workbench data per project'],
    ['src/components/PersonalSpaceWorkspace/projectSpaceStateCurrent.test.ts', 'current project space helpers write external workspace changes into the enabled project'],
    ['src/components/PersonalSpaceWorkspace/currentProjectSpaceLocalPersist.test.ts', 'current project persistence syncs external workspace changes to local project storage'],
    ['src/components/PersonalSpaceWorkspace/currentProjectSpaceRemotePersist.test.ts', 'current project persistence syncs external workspace changes to remote project storage'],
    ['src/components/PersonalSpaceWorkspace/currentProjectSpaceRemoteFallback.test.ts', 'project space loader returns cached remote state and named warning when remote export fails'],
  ] as const

  for (const [path, testName] of focusedFiles) {
    const focusedSource = existsSync(path) ? readFileSync(path, 'utf8') : ''

    assert.ok(existsSync(path), `${path} should exist`)
    assert.doesNotMatch(source, new RegExp("test\\('" + testName))
    assert.match(focusedSource, new RegExp("test\\('" + testName))
  }
})
