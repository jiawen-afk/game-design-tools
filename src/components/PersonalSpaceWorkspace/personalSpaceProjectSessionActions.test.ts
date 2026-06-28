import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('personal space project session action tests stay split by session workflow', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceProjectSessionActions.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/PersonalSpaceWorkspace/personalSpaceProjectSessionRefresh.test.ts',
    'src/components/PersonalSpaceWorkspace/personalSpaceProjectSessionEnable.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'personalSpaceProjectSessionActions.test.ts should only keep split guards')
  for (const delegatedToken of [
    'refreshing active project ' + 'state reloads',
    'enabling a remote project ' + 'without cached state',
    'createRepository' + 'Stub',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
