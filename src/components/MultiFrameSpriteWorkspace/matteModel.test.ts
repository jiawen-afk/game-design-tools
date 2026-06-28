import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('matte model tests stay split by matte responsibility', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/matteModel.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/MultiFrameSpriteWorkspace/matteGroupModel.test.ts',
    'src/components/MultiFrameSpriteWorkspace/matteColorModel.test.ts',
    'src/components/MultiFrameSpriteWorkspace/matteParamModel.test.ts',
    'src/components/MultiFrameSpriteWorkspace/mattePipelineModel.test.ts',
    'src/components/MultiFrameSpriteWorkspace/matteWorkspaceStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'matteModel.test.ts should only keep split guards')
  for (const delegatedToken of [
    'buildMatte' + 'FrameGroups',
    'resolveSpill' + 'Color',
    'applyMatteParams' + 'ToFollowingFrames',
    'queueUnique' + 'FrameId',
    'addVisibleVideo' + 'FramesToWorkspace',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
