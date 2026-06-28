import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('sprite upscale tests stay split by model and workspace responsibility', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/spriteUpscaleModel.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/MultiFrameSpriteWorkspace/spriteUpscalePreviewModel.test.ts',
    'src/components/MultiFrameSpriteWorkspace/spriteUpscaleExportModel.test.ts',
    'src/components/MultiFrameSpriteWorkspace/spriteUpscaleWorkspaceStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/').replace(/\./g, '\\.')))
  }

  assert.ok(source.split(/\r?\n/).length <= 80, 'spriteUpscaleModel.test.ts should only keep split guards')
  for (const delegatedToken of [
    'targets visible composed ' + 'frames in playback order',
    'preview follows the ' + 'current playback frame',
    'stale sprite upscale ' + 'result urls',
    'export uses current ' + 'upscaled frame urls',
    'input and result upscale ' + 'modes use different',
    'playback panel exposes ' + 'batch upscale controls',
    'playback layout caps ' + 'the frame playlist',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
