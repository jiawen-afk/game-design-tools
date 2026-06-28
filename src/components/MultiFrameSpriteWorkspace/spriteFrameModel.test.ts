import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('sprite frame model tests stay split by frame responsibility', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/spriteFrameModel.test.ts', 'utf8')
  const focusedFiles = [
    ['src/components/MultiFrameSpriteWorkspace/spriteSheetModel.test.ts', 'sprite index records frame cells and playback metadata'],
    ['src/components/MultiFrameSpriteWorkspace/playbackModel.test.ts', 'playback cursor advances loop and pingpong modes'],
    ['src/components/MultiFrameSpriteWorkspace/frameCompositionModel.test.ts', 'composed url replacement does not revoke the new url for unrelated frames'],
    ['src/components/MultiFrameSpriteWorkspace/spriteUploadFilterModel.test.ts', 'upload filtering ignores files that already exist or are pending'],
    ['src/components/MultiFrameSpriteWorkspace/spriteProjectCollectStructure.test.ts', 'sprite export can be collected into project space with sprite and index resources'],
  ] as const

  for (const [path, testName] of focusedFiles) {
    const focusedSource = existsSync(path) ? readFileSync(path, 'utf8') : ''

    assert.ok(existsSync(path), `${path} should exist`)
    assert.doesNotMatch(source, new RegExp("test\\('" + testName))
    assert.match(focusedSource, new RegExp("test\\('" + testName))
  }
})
