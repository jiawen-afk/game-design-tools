import test from 'node:test'
import assert from 'node:assert/strict'

import {
  computeAdditiveBlackToAlphaPixel,
  parseFrameRangeSelection,
  resolveAdditiveTargetFrameIds,
} from './model'

const frames = ['frame-1', 'frame-2', 'frame-3', 'frame-4', 'frame-5'].map((id) => ({ id }))

test('additive frame targets resolve current, whole group, and custom selections', () => {
  assert.deepEqual(resolveAdditiveTargetFrameIds({
    mode: 'current',
    frames,
    currentFrameId: 'frame-3',
  }), {
    frameIds: ['frame-3'],
    invalidTokens: [],
    canApply: true,
  })

  assert.deepEqual(resolveAdditiveTargetFrameIds({
    mode: 'group',
    frames,
    currentFrameId: 'frame-3',
  }), {
    frameIds: ['frame-1', 'frame-2', 'frame-3', 'frame-4', 'frame-5'],
    invalidTokens: [],
    canApply: true,
  })

  assert.deepEqual(resolveAdditiveTargetFrameIds({
    mode: 'custom',
    frames,
    currentFrameId: 'frame-3',
    customSelectedFrameIds: ['frame-4', 'frame-missing', 'frame-2', 'frame-2'],
  }), {
    frameIds: ['frame-2', 'frame-4'],
    invalidTokens: [],
    canApply: true,
  })
})

test('additive custom selection cannot apply when no valid frames are selected', () => {
  assert.deepEqual(resolveAdditiveTargetFrameIds({
    mode: 'custom',
    frames,
    currentFrameId: 'frame-3',
    customSelectedFrameIds: ['frame-missing'],
  }), {
    frameIds: [],
    invalidTokens: [],
    canApply: false,
  })
})

test('additive frame range parser clamps, deduplicates, and reports invalid tokens', () => {
  assert.deepEqual(parseFrameRangeSelection('1-3, 3, 12, bad, 0-2, 5-4', 5), {
    frameNumbers: [1, 2, 3, 5],
    invalidTokens: ['bad', '5-4'],
  })
})

test('additive target resolution combines custom checks with range input in frame order', () => {
  assert.deepEqual(resolveAdditiveTargetFrameIds({
    mode: 'custom',
    frames,
    currentFrameId: 'frame-1',
    customSelectedFrameIds: ['frame-5', 'frame-1'],
    customRangeInput: '2-4, nope',
  }), {
    frameIds: ['frame-1', 'frame-2', 'frame-3', 'frame-4', 'frame-5'],
    invalidTokens: ['nope'],
    canApply: true,
  })
})

test('additive black-to-alpha conversion preserves unmasked and bright pixels', () => {
  assert.deepEqual(computeAdditiveBlackToAlphaPixel({
    r: 0,
    g: 0,
    b: 0,
    a: 255,
    masked: true,
    threshold: 0.25,
    strength: 1,
  }), {
    r: 0,
    g: 0,
    b: 0,
    a: 0,
  })

  assert.deepEqual(computeAdditiveBlackToAlphaPixel({
    r: 240,
    g: 120,
    b: 40,
    a: 128,
    masked: true,
    threshold: 0.25,
    strength: 1,
  }), {
    r: 240,
    g: 120,
    b: 40,
    a: 128,
  })

  assert.deepEqual(computeAdditiveBlackToAlphaPixel({
    r: 8,
    g: 16,
    b: 24,
    a: 255,
    masked: false,
    threshold: 0.25,
    strength: 1,
  }), {
    r: 8,
    g: 16,
    b: 24,
    a: 255,
  })
})
