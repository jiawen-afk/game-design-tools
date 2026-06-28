import test from 'node:test'
import assert from 'node:assert/strict'

import { coerceLayoutDefaults } from './model'

test('layout defaults are clamped for saved public parameters', () => {
  assert.deepEqual(coerceLayoutDefaults({}), {
    canvasWidth: 256,
    canvasHeight: 256,
    ratioPercent: 80,
    ratioBasis: 'height',
    strokeColor: '#ffffff',
    strokeWidth: 0,
    outlineColor: '#1a1a1a',
    outlineWidth: 0,
  })
  assert.deepEqual(coerceLayoutDefaults({
    canvasWidth: 0,
    canvasHeight: 9000,
    ratioPercent: 500,
    ratioBasis: 'width',
    strokeColor: '#ABCDEF',
    strokeWidth: 200,
    outlineColor: '123abc',
    outlineWidth: -4,
  }), {
    canvasWidth: 1,
    canvasHeight: 4096,
    ratioPercent: 300,
    ratioBasis: 'width',
    strokeColor: '#abcdef',
    strokeWidth: 128,
    outlineColor: '#123abc',
    outlineWidth: 0,
  })
})
