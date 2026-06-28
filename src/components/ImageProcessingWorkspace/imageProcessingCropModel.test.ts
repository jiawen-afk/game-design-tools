import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clampCropBox,
  getAspectRatioValue,
  getCropBoxAfterAspectRatioChange,
  normalizeCropBox,
} from './imageProcessingModel'

test('image processing workspace clamps crop boxes inside image bounds', () => {
  assert.deepEqual(
    clampCropBox({ x: -20, y: 30, width: 260, height: 180 }, 200, 120, 16),
    { x: 0, y: 30, width: 200, height: 90 }
  )
  assert.deepEqual(
    clampCropBox({ x: 190, y: 110, width: 4, height: 5 }, 200, 120, 16),
    { x: 184, y: 104, width: 16, height: 16 }
  )
  assert.deepEqual(
    clampCropBox({ x: 20, y: 30, width: 260, height: 180 }, 200, 120, 16),
    { x: 20, y: 30, width: 180, height: 90 }
  )
})

test('image processing workspace normalizes crop boxes from drag coordinates', () => {
  assert.deepEqual(
    normalizeCropBox({ x: 120, y: 90, width: -80, height: -50 }, 200, 120, 16),
    { x: 40, y: 40, width: 80, height: 50 }
  )
})

test('image processing workspace reports image aspect ratio values', () => {
  const size = { width: 1920, height: 1080 }
  assert.equal(getAspectRatioValue(size), Number((size.width / size.height).toFixed(4)))
})

test('image processing workspace adjusts crop boxes by aspect ratio', () => {
  assert.deepEqual(
    getCropBoxAfterAspectRatioChange({ x: 10, y: 20, width: 120, height: 80 }, 300, 220, 1),
    { x: 10, y: 20, width: 120, height: 120 }
  )
  assert.deepEqual(
    getCropBoxAfterAspectRatioChange({ x: 10, y: 150, width: 180, height: 40 }, 300, 200, 1),
    { x: 10, y: 150, width: 50, height: 50 }
  )
})
