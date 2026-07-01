import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clampPreviewRect,
  fitContainedImageRect,
  getCropBoxFromPreviewRect,
  getDraggedPreviewRect,
  getPreviewRectFromCropBox,
} from './imageProcessingModel'

test('image processing workspace fits the preview image inside its container', () => {
  const wideImage = { width: 960, height: 540 }
  const squareContainer = { width: 400, height: 400 }
  const wideFit = fitContainedImageRect(wideImage, squareContainer)
  assert.equal(wideFit.width, squareContainer.width)
  assert.equal(wideFit.width / wideFit.height, wideImage.width / wideImage.height)
  assert.equal(wideFit.x, 0)
  assert.equal(wideFit.y > 0, true)

  const tallContainer = { width: 640, height: 200 }
  const tallFit = fitContainedImageRect({ width: 320, height: 240 }, tallContainer)
  assert.equal(tallFit.height, tallContainer.height)
  assert.equal(tallFit.x > 0, true)
  assert.equal(tallFit.y, 0)
})

test('image processing workspace clamps preview crop boxes inside the preview rect', () => {
  assert.deepEqual(
    clampPreviewRect({ x: -20, y: 10, width: 520, height: 220 }, { width: 400, height: 300 }),
    { x: 0, y: 10, width: 400, height: 220 }
  )
})

test('image processing workspace derives crop boxes from preview coordinates', () => {
  assert.deepEqual(
    getCropBoxFromPreviewRect(
      { x: 70, y: 60, width: 50, height: 25 },
      { x: 20, y: 20, width: 200, height: 100 },
      { width: 400, height: 200 }
    ),
    { x: 100, y: 80, width: 100, height: 50 }
  )
})

test('image processing workspace projects crop boxes into preview coordinates', () => {
  assert.deepEqual(
    getPreviewRectFromCropBox(
      { x: 100, y: 80, width: 100, height: 50 },
      { x: 20, y: 20, width: 200, height: 100 },
      { width: 400, height: 200 }
    ),
    { x: 70, y: 60, width: 50, height: 25 }
  )
})

test('image processing workspace drags preview crop boxes by handle', () => {
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'move', 12, -8, 16),
    { x: 52, y: 22, width: 120, height: 80 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'tl', 20, 10, 16),
    { x: 60, y: 40, width: 100, height: 70 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'right', -200, 0, 16),
    { x: 40, y: 30, width: 16, height: 80 }
  )
})

test('image processing workspace keeps preview crop aspect ratio while shift-resizing', () => {
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'tl', 20, 0, 16, true),
    { x: 60, y: 43.33333333333333, width: 100, height: 66.66666666666667 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'tr', 20, -40, 16, true),
    { x: 40, y: -10, width: 180, height: 120 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'bl', -60, 40, 16, true),
    { x: -20, y: 30, width: 180, height: 120 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'br', 60, 80, 16, true),
    { x: 40, y: 30, width: 240, height: 160 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'left', -60, 0, 16, true),
    { x: -20, y: -10, width: 180, height: 120 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'top', 0, -40, 16, true),
    { x: -20, y: -10, width: 180, height: 120 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'right', 60, 0, 16, true),
    { x: 40, y: 30, width: 180, height: 120 }
  )
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'bottom', 0, 40, 16, true),
    { x: 40, y: 30, width: 180, height: 120 }
  )
})

test('image processing workspace keeps shift-resized preview crops proportional inside bounds', () => {
  assert.deepEqual(
    getDraggedPreviewRect({ x: 40, y: 30, width: 120, height: 80 }, 'br', 200, 200, 16, true, { width: 200, height: 160 }),
    { x: 40, y: 30, width: 160, height: 106.66666666666667 }
  )
})
