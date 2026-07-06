import test from 'node:test'
import assert from 'node:assert/strict'

import {
  centerCropBox,
  clampCropBox,
  getAspectRatioValue,
  getCropBoxAfterAspectRatioChange,
  MAX_IMAGE_EXPORT_SIZE,
  normalizeCropBox,
} from './imageProcessingModel'

test('image processing workspace allows crop boxes to expand outside image bounds', () => {
  assert.deepEqual(
    clampCropBox({ x: -20, y: 30, width: 260, height: 180 }, 200, 120, 16),
    { x: -20, y: 30, width: 260, height: 180 }
  )
  assert.deepEqual(
    clampCropBox({ x: 190, y: 110, width: 4, height: 5 }, 200, 120, 16),
    { x: 190, y: 110, width: 16, height: 16 }
  )
  assert.deepEqual(
    clampCropBox({ x: 20, y: 30, width: MAX_IMAGE_EXPORT_SIZE + 200, height: 180 }, 200, 120, 16),
    { x: 20, y: 30, width: MAX_IMAGE_EXPORT_SIZE, height: 180 }
  )
})

test('image processing workspace normalizes crop boxes from drag coordinates', () => {
  assert.deepEqual(
    normalizeCropBox({ x: 120, y: 90, width: -180, height: -140 }, 200, 120, 16),
    { x: -60, y: -50, width: 180, height: 140 }
  )
})

test('image processing workspace centers crop boxes without changing crop size', () => {
  assert.deepEqual(
    centerCropBox({ x: 0, y: 0, width: 80, height: 40 }, 200, 120, 16),
    { x: 60, y: 40, width: 80, height: 40 }
  )
  assert.deepEqual(
    centerCropBox({ x: 12, y: 24, width: 260, height: 90 }, 200, 120, 16),
    { x: -30, y: 15, width: 260, height: 90 }
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
    { x: 10, y: 150, width: 180, height: 180 }
  )
})
