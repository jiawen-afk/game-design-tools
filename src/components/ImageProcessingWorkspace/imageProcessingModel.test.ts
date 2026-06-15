import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyWheelZoom,
  clampCropBox,
  deriveExportFileName,
  getAspectRatioValue,
  getExportScaleAfterDimensionChange,
  getExportSizeAfterScaleChange,
  resolveExportBaseSize,
  getAnchoredWheelZoomTransform,
  getExportFormatInfo,
  getCropBoxAfterAspectRatioChange,
  isSupportedImageFile,
  mapPreviewPointToImagePixel,
  normalizeCropBox,
  normalizeExportScale,
  normalizeExportSize,
  clampPreviewRect,
  fitContainedImageRect,
  getDraggedPreviewRect,
  getCropBoxFromPreviewRect,
  getPreviewRectFromCropBox,
  sampleImagePixel,
  getPreviewAnchorFromStagePoint,
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

test('image processing workspace reports image aspect ratio values', () => {
  assert.equal(getAspectRatioValue({ width: 1920, height: 1080 }), 1.7778)
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

test('image processing workspace scales export size proportionally from the crop size', () => {
  assert.deepEqual(getExportSizeAfterScaleChange({ width: 320, height: 180 }, 2), { width: 640, height: 360 })
  assert.deepEqual(getExportSizeAfterScaleChange({ width: 320, height: 180 }, 0.5), { width: 160, height: 90 })
  assert.deepEqual(getExportSizeAfterScaleChange({ width: 320, height: 180 }, 0), { width: 32, height: 18 })
})

test('image processing workspace keeps export scale at three-decimal precision', () => {
  assert.equal(normalizeExportScale(0.1234), 0.123)
  assert.equal(normalizeExportScale(0.0001), 0.1)
})

test('image processing workspace derives export scale from a target width', () => {
  const scale = getExportScaleAfterDimensionChange({ width: 320, height: 180 }, 'width', 640)

  assert.equal(scale, 2)
  assert.deepEqual(getExportSizeAfterScaleChange({ width: 320, height: 180 }, scale), { width: 640, height: 360 })
})

test('image processing workspace derives export scale from a target height', () => {
  const scale = getExportScaleAfterDimensionChange({ width: 320, height: 180 }, 'height', 90)

  assert.equal(scale, 0.5)
  assert.deepEqual(getExportSizeAfterScaleChange({ width: 320, height: 180 }, scale), { width: 160, height: 90 })
})

test('image processing workspace clamps derived export scale to the export limits', () => {
  const scale = getExportScaleAfterDimensionChange({ width: 320, height: 180 }, 'width', 9999)

  assert.equal(scale, 16)
  assert.deepEqual(getExportSizeAfterScaleChange({ width: 320, height: 180 }, scale), { width: 5120, height: 2880 })
})

test('image processing workspace resolves upscale preview as the export base size', () => {
  assert.deepEqual(resolveExportBaseSize({ width: 400, height: 200 }, true, { width: 800, height: 400 }), { width: 800, height: 400 })
  assert.deepEqual(resolveExportBaseSize({ width: 400, height: 200 }, false, { width: 800, height: 400 }), { width: 400, height: 200 })
  assert.deepEqual(resolveExportBaseSize(null, true, null), { width: 1, height: 1 })
})

test('image processing workspace zooms with mouse wheel and clamps the result', () => {
  assert.equal(applyWheelZoom(1, -120), 1.1)
  assert.equal(applyWheelZoom(1, 120), 0.9)
  assert.equal(applyWheelZoom(0.1, 120), 0.1)
  assert.equal(applyWheelZoom(3, -120), 3)
})

test('image processing workspace anchors wheel zoom around the pointer', () => {
  assert.deepEqual(
    getAnchoredWheelZoomTransform(1, { x: 0, y: 0 }, -120, { x: 200, y: 100 }),
    { zoom: 1.1, pan: { x: -20, y: -10 } }
  )
  assert.deepEqual(
    getAnchoredWheelZoomTransform(1.1, { x: -20, y: -10 }, 120, { x: 200, y: 100 }),
    { zoom: 1, pan: { x: 0, y: 0 } }
  )
})

test('image processing workspace keeps the same image point under the pointer after repeated anchored zooms', () => {
  const pointerFromImageCenter = { x: 200, y: 100 }
  const first = getAnchoredWheelZoomTransform(1, { x: 0, y: 0 }, -120, pointerFromImageCenter)
  const second = getAnchoredWheelZoomTransform(
    first.zoom,
    first.pan,
    -120,
    pointerFromImageCenter
  )

  assert.deepEqual(second, { zoom: 1.2, pan: { x: -40, y: -20 } })
})

test('image processing workspace derives wheel anchor from the untransformed preview rect', () => {
  assert.deepEqual(
    getPreviewAnchorFromStagePoint(
      { x: 520, y: 260 },
      { x: 100, y: 40, width: 640, height: 360 }
    ),
    { x: 100, y: 40 }
  )
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
  assert.equal(zoom, 0.1)
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
