import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('sprite workspace structure tests stay split by workspace boundary', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/workspaceStructure.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/MultiFrameSpriteWorkspace/workspacePlaybackStructure.test.ts',
    'src/components/MultiFrameSpriteWorkspace/workspaceHookStructure.test.ts',
    'src/components/MultiFrameSpriteWorkspace/workspacePanelStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'workspaceStructure.test.ts should only keep split guards')
  for (const delegatedToken of [
    'playback preview ' + 'stays bounded',
    'workspace video styles ' + 'live beside',
    'implementation delegates ' + 'focused responsibilities',
    'entry delegates stateful ' + 'workflows',
    'matte pipeline hook ' + 'owns matte side effects',
    'layout workspace hook ' + 'owns layout',
    'upload workspace hook ' + 'owns image',
    'layout workspace panel ' + 'delegates canvas',
    'upload and matte panels ' + 'own staged',
    'entry only composes ' + 'focused panels',
    'entry delegates controller ' + 'shell',
    'model delegates crop ' + 'and video helpers',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
