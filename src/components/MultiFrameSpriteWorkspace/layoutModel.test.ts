import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('layout model tests stay split by layout responsibility', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/layoutModel.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/MultiFrameSpriteWorkspace/layoutRatioModel.test.ts',
    'src/components/MultiFrameSpriteWorkspace/layoutInteractionModel.test.ts',
    'src/components/MultiFrameSpriteWorkspace/layoutGuideModel.test.ts',
    'src/components/MultiFrameSpriteWorkspace/layoutDefaultsModel.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/').replace(/\./g, '\\.')))
  }

  assert.ok(source.split(/\r?\n/).length <= 80, 'layoutModel.test.ts should only keep split guards')
  for (const delegatedToken of [
    'ratio sizing keeps ' + 'a frame inside',
    'layout presets ' + 'update frame layouts',
    'corner handle resize ' + 'preserves aspect',
    'guide line positions ' + 'clamp to canvas',
    'layout defaults are ' + 'clamped',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
