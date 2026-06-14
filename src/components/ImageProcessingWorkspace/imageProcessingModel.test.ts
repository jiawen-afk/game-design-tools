import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyWheelZoom,
  clampCropBox,
  deriveExportFileName,
  getExportFormatInfo,
  isSupportedImageFile,
  mapPreviewPointToImagePixel,
  normalizeCropBox,
  sampleImagePixel,
} from './imageProcessingModel'

test('image processing workspace accepts common raster image formats', () => {
  assert.equal(isSupportedImageFile({ name: 'hero.PNG', type: 'image/png' }), true)
  assert.equal(isSupportedImageFile({ name: 'portrait.webp', type: 'image/webp' }), true)
  assert.equal(isSupportedImageFile({ name: 'photo.jpeg', type: 'image/jpeg' }), true)
  assert.equal(isSupportedImageFile({ name: 'photo.jpg', type: '' }), true)
  assert.equal(isSupportedImageFile({ name: 'notes.txt', type: 'text/plain' }), false)
  assert.equal(isSupportedImageFile({ name: 'vector.svg', type: 'image/svg+xml' }), false)
})

test('image processing workspace maps export formats to mime and alpha behavior', () => {
  assert.deepEqual(getExportFormatInfo('png'), { extension: 'png', mimeType: 'image/png', preservesAlpha: true })
  assert.deepEqual(getExportFormatInfo('webp'), { extension: 'webp', mimeType: 'image/webp', preservesAlpha: true })
  assert.deepEqual(getExportFormatInfo('jpg'), { extension: 'jpg', mimeType: 'image/jpeg', preservesAlpha: false })
  assert.deepEqual(getExportFormatInfo('jpeg'), { extension: 'jpeg', mimeType: 'image/jpeg', preservesAlpha: false })
})

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

test('image processing workspace derives export filenames from source image names', () => {
  assert.equal(deriveExportFileName('hero.walk.png', 'webp'), 'hero.walk-processed.webp')
  assert.equal(deriveExportFileName('bad/name?.jpg', 'png'), 'bad_name_-processed.png')
  assert.equal(deriveExportFileName('', 'jpeg'), 'image-processed.jpeg')
})

test('image processing workspace zooms with mouse wheel and clamps the result', () => {
  assert.equal(applyWheelZoom(1, -120), 1.1)
  assert.equal(applyWheelZoom(1, 120), 0.9)
  assert.equal(applyWheelZoom(0.5, 120), 0.5)
  assert.equal(applyWheelZoom(3, -120), 3)
})

test('image processing workspace keeps zoom changes bounded for repeated wheel input', () => {
  let zoom = 1
  for (let i = 0; i < 20; i += 1) {
    zoom = applyWheelZoom(zoom, -120)
  }
  assert.equal(zoom, 3)
  for (let i = 0; i < 40; i += 1) {
    zoom = applyWheelZoom(zoom, 120)
  }
  assert.equal(zoom, 0.5)
})

test('image processing workspace maps preview clicks back to source pixels', () => {
  assert.deepEqual(
    mapPreviewPointToImagePixel(
      { x: 60, y: 40 },
      { x: 10, y: 20, width: 200, height: 100 },
      { width: 400, height: 200 }
    ),
    { x: 100, y: 40 }
  )
  assert.deepEqual(
    mapPreviewPointToImagePixel(
      { x: 260, y: 140 },
      { x: 10, y: 20, width: 200, height: 100 },
      { width: 400, height: 200 }
    ),
    { x: 399, y: 199 }
  )
})

test('image processing workspace samples rgb values from image data', () => {
  const data = new Uint8ClampedArray([
    12, 34, 56, 255,
    80, 90, 100, 255,
    130, 140, 150, 255,
    200, 210, 220, 255,
  ])
  assert.deepEqual(sampleImagePixel({ data, width: 2, height: 2 }, { x: 1, y: 0 }), [80, 90, 100])
  assert.deepEqual(sampleImagePixel({ data, width: 2, height: 2 }, { x: 9, y: 9 }), [200, 210, 220])
})
