import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapPreviewPointToImagePixel,
  sampleImagePixel,
} from './imageProcessingModel'

test('image processing workspace maps preview clicks back to source pixels', () => {
  const previewRect = { x: 10, y: 20, width: 200, height: 100 }
  const imageSize = { width: 400, height: 200 }
  const insidePreviewPoint = { x: 60, y: 45 }
  const insidePoint = mapPreviewPointToImagePixel(insidePreviewPoint, previewRect, imageSize)
  const outsidePoint = mapPreviewPointToImagePixel({ x: 260, y: 140 }, previewRect, imageSize)
  const expectedInsideRatio = {
    x: (insidePreviewPoint.x - previewRect.x) / previewRect.width,
    y: (insidePreviewPoint.y - previewRect.y) / previewRect.height,
  }

  assert.equal(insidePoint.x / imageSize.width, expectedInsideRatio.x)
  assert.equal(insidePoint.y / imageSize.height, expectedInsideRatio.y)
  assert.equal(outsidePoint.x, imageSize.width - 1)
  assert.equal(outsidePoint.y, imageSize.height - 1)
})

test('image processing workspace samples rgb values from image data', () => {
  const data = new Uint8ClampedArray([
    12, 34, 56, 255,
    80, 90, 100, 255,
    130, 140, 150, 255,
    200, 210, 220, 255,
  ])
  const imageData = { data, width: 2, height: 2 }
  const topRight = sampleImagePixel(imageData, { x: imageData.width - 1, y: 0 })
  const clampedBottomRight = sampleImagePixel(imageData, { x: 9, y: 9 })

  assert.deepEqual(topRight, Array.from(data.slice(4, 7)))
  assert.deepEqual(clampedBottomRight, Array.from(data.slice(data.length - 4, data.length - 1)))
})
