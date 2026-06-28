import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyMatteParamsToAllFrames,
  applyMatteParamsToFollowingFrames,
} from './model'

test('matte params can be applied to all following frames without changing earlier frames', () => {
  const frames = [
    {
      id: 'before',
      matte: {
        keyColor: [1, 2, 3] as [number, number, number],
        tolerance: 1,
        smoothness: 2,
        spill: 3,
        erosion: 4,
        spillColorMode: 'green' as const,
        customSpillHex: '#111111',
      },
    },
    {
      id: 'active',
      matte: {
        keyColor: [10, 20, 30] as [number, number, number],
        tolerance: 11,
        smoothness: 22,
        spill: 33,
        erosion: 44,
        spillColorMode: 'custom' as const,
        customSpillHex: '#abcdef',
      },
    },
    {
      id: 'after-a',
      matte: {
        keyColor: [4, 5, 6] as [number, number, number],
        tolerance: 5,
        smoothness: 6,
        spill: 7,
        erosion: 8,
        spillColorMode: 'blue' as const,
        customSpillHex: '#222222',
      },
    },
    {
      id: 'after-b',
      matte: {
        keyColor: [7, 8, 9] as [number, number, number],
        tolerance: 9,
        smoothness: 10,
        spill: 11,
        erosion: 12,
        spillColorMode: 'magenta' as const,
        customSpillHex: '#333333',
      },
    },
  ]

  const result = applyMatteParamsToFollowingFrames(frames, 'active')

  assert.deepEqual(result.recomputeIds, ['after-a', 'after-b'])
  assert.deepEqual(result.frames[0], frames[0])
  assert.deepEqual(result.frames[1], frames[1])
  assert.deepEqual(result.frames[2]?.matte, frames[1]?.matte)
  assert.deepEqual(result.frames[3]?.matte, frames[1]?.matte)
  assert.notEqual(result.frames[2]?.matte.keyColor, frames[1]?.matte.keyColor)
})

test('first frame matte params can be applied to every frame', () => {
  const frames = [
    {
      id: 'first',
      matte: {
        keyColor: [10, 20, 30] as [number, number, number],
        tolerance: 11,
        smoothness: 22,
        spill: 33,
        erosion: 44,
        spillColorMode: 'custom' as const,
        customSpillHex: '#abcdef',
      },
    },
    {
      id: 'second',
      matte: {
        keyColor: [4, 5, 6] as [number, number, number],
        tolerance: 5,
        smoothness: 6,
        spill: 7,
        erosion: 8,
        spillColorMode: 'blue' as const,
        customSpillHex: '#222222',
      },
    },
    {
      id: 'third',
      matte: {
        keyColor: [7, 8, 9] as [number, number, number],
        tolerance: 9,
        smoothness: 10,
        spill: 11,
        erosion: 12,
        spillColorMode: 'magenta' as const,
        customSpillHex: '#333333',
      },
    },
  ]

  const result = applyMatteParamsToAllFrames(frames, 'first')

  assert.deepEqual(result.recomputeIds, ['first', 'second', 'third'])
  assert.deepEqual(result.frames[0], frames[0])
  assert.deepEqual(result.frames[1]?.matte, frames[0]?.matte)
  assert.deepEqual(result.frames[2]?.matte, frames[0]?.matte)
  assert.notEqual(result.frames[1]?.matte.keyColor, frames[0]?.matte.keyColor)
})
