import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyWheelZoom,
  clampCropBox,
  deriveExportFileName,
  getAspectRatioValue,
  getExportSizeAfterAspectRatioChange,
  getExportSizeAfterDimensionChange,
  getExportFormatInfo,
  isSupportedImageFile,
  mapPreviewPointToImagePixel,
  normalizeCropBox,
  normalizeExportSize,
  clampPreviewRect,
  fitContainedImageRect,
  getDraggedPreviewRect,
  getCropBoxFromPreviewRect,
  getPreviewRectFromCropBox,
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

test('image processing workspace normalizes export sizes for image output', () => {
  assert.deepEqual(normalizeExportSize({ width: 120.4, height: 64.6 }), { width: 120, height: 65 })
  assert.deepEqual(normalizeExportSize({ width: 0, height: Number.NaN }, { width: 320, height: 180 }), { width: 320, height: 180 })
})

test('image processing workspace links export dimensions when aspect ratio is locked', () => {
  const current = { width: 320, height: 180 }

  assert.deepEqual(getExportSizeAfterDimensionChange(current, 'width', 640, true), { width: 640, height: 360 })
  assert.deepEqual(getExportSizeAfterDimensionChange(current, 'height', 90, true), { width: 160, height: 90 })
  assert.deepEqual(getExportSizeAfterDimensionChange(current, 'width', 640, false), { width: 640, height: 180 })
})

test('image processing workspace exposes editable export aspect ratio', () => {
  assert.equal(getAspectRatioValue({ width: 1920, height: 1080 }), 1.7778)
  assert.deepEqual(getExportSizeAfterAspectRatioChange({ width: 320, height: 180 }, 1), { width: 320, height: 320 })
  assert.deepEqual(getExportSizeAfterAspectRatioChange({ width: 320, height: 180 }, 2), { width: 320, height: 160 })
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

test('image processing workspace fits the preview image inside its container', () => {
  assert.deepEqual(
    fitContainedImageRect({ width: 960, height: 540 }, { width: 400, height: 400 }),
    { x: 0, y: 87.5, width: 400, height: 225 }
  )
  assert.deepEqual(
    fitContainedImageRect({ width: 320, height: 240 }, { width: 640, height: 200 }),
    { x: 186.66666666666666, y: 0, width: 266.6666666666667, height: 200 }
  )
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
