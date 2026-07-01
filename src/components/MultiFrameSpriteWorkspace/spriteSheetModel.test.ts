import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMultiFrameSpriteIndex,
  buildSpriteSheetGridCells,
  computeAutoSpriteColumns,
} from './spriteSheetModel'

test('auto columns make compact sprite sheets', () => {
  const assertCompactColumns = (frameCount: number) => {
    const columns = computeAutoSpriteColumns(frameCount)

    assert.equal(Number.isInteger(columns), true)
    assert.equal(columns > 0, true)
    assert.equal(columns * columns >= frameCount, true)
    if (columns > 1) {
      assert.equal((columns - 1) * (columns - 1) < frameCount, true)
    }
  }

  assertCompactColumns(1)
  assertCompactColumns(5)
  assertCompactColumns(16)
})

test('sprite sheet grid cells split an uploaded sheet by rows and columns', () => {
  assert.deepEqual(buildSpriteSheetGridCells(96, 64, 2, 3), [
    { index: 0, row: 0, column: 0, x: 0, y: 0, width: 32, height: 32 },
    { index: 1, row: 0, column: 1, x: 32, y: 0, width: 32, height: 32 },
    { index: 2, row: 0, column: 2, x: 64, y: 0, width: 32, height: 32 },
    { index: 3, row: 1, column: 0, x: 0, y: 32, width: 32, height: 32 },
    { index: 4, row: 1, column: 1, x: 32, y: 32, width: 32, height: 32 },
    { index: 5, row: 1, column: 2, x: 64, y: 32, width: 32, height: 32 },
  ])
})

test('sprite index records frame cells and playback metadata', () => {
  const index = buildMultiFrameSpriteIndex({
    canvasWidth: 64,
    canvasHeight: 48,
    columns: 2,
    fps: 12,
    playbackMode: 'pingpong',
    image: 'sprite.webp',
    format: 'webp',
    frames: [
      { id: 'a', sourceName: 'idle.png' },
      { id: 'b', sourceName: 'step.png' },
      { id: 'c', sourceName: 'turn.png' },
    ],
  })

  assert.deepEqual(index, {
    version: '1.0',
    image: 'sprite.webp',
    format: 'webp',
    frame_size: { w: 64, h: 48 },
    sheet_size: { w: 128, h: 96 },
    fps: 12,
    playbackMode: 'pingpong',
    frames: [
      { i: 0, id: 'a', name: 'idle.png', x: 0, y: 0, w: 64, h: 48, t: 0 },
      { i: 1, id: 'b', name: 'step.png', x: 64, y: 0, w: 64, h: 48, t: 0.083 },
      { i: 2, id: 'c', name: 'turn.png', x: 0, y: 48, w: 64, h: 48, t: 0.167 },
    ],
  })
})
