import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getExportScaleAfterDimensionChange,
  getExportSizeAfterScaleChange,
  normalizeExportScale,
  normalizeExportSize,
  resolveExportBaseSize,
  resolveImageExportTarget,
  MAX_IMAGE_EXPORT_SCALE,
  MIN_IMAGE_EXPORT_SCALE,
  MIN_IMAGE_EXPORT_SIZE,
} from './imageProcessingModel'

test('image processing workspace normalizes export sizes for image output', () => {
  assert.deepEqual(normalizeExportSize({ width: 120.4, height: 64.6 }), { width: 120, height: 65 })
  assert.deepEqual(normalizeExportSize({ width: 0, height: Number.NaN }, { width: 320, height: 180 }), { width: 320, height: 180 })
})

test('image processing workspace scales export size proportionally from the crop size', () => {
  const baseSize = { width: 320, height: 180 }
  const doubled = getExportSizeAfterScaleChange(baseSize, 2)
  const halved = getExportSizeAfterScaleChange(baseSize, 0.5)
  const clamped = getExportSizeAfterScaleChange(baseSize, 0)

  assert.equal(doubled.width / baseSize.width, doubled.height / baseSize.height)
  assert.equal(halved.width / baseSize.width, halved.height / baseSize.height)
  assert.equal(clamped.width / baseSize.width, clamped.height / baseSize.height)
  assert.equal(clamped.width / baseSize.width, MIN_IMAGE_EXPORT_SCALE)
})

test('image processing workspace keeps export scale at three-decimal precision', () => {
  const scale = 0.1234
  assert.equal(normalizeExportScale(scale), Number(scale.toFixed(3)))
  assert.equal(normalizeExportScale(MIN_IMAGE_EXPORT_SCALE / 100), MIN_IMAGE_EXPORT_SCALE)
})

test('image processing workspace derives export scale from a target width', () => {
  const baseSize = { width: 320, height: 180 }
  const targetWidth = baseSize.width * 2
  const scale = getExportScaleAfterDimensionChange(baseSize, 'width', targetWidth)

  assert.equal(scale, targetWidth / baseSize.width)
  assert.equal(getExportSizeAfterScaleChange(baseSize, scale).width, targetWidth)
})

test('image processing workspace derives export scale from a target height', () => {
  const baseSize = { width: 320, height: 180 }
  const targetHeight = baseSize.height / 2
  const scale = getExportScaleAfterDimensionChange(baseSize, 'height', targetHeight)

  assert.equal(scale, targetHeight / baseSize.height)
  assert.equal(getExportSizeAfterScaleChange(baseSize, scale).height, targetHeight)
})

test('image processing workspace clamps derived export scale to the export limits', () => {
  const baseSize = { width: 320, height: 180 }
  const scale = getExportScaleAfterDimensionChange(baseSize, 'width', 9999)
  const exportSize = getExportSizeAfterScaleChange(baseSize, scale)

  assert.equal(scale, MAX_IMAGE_EXPORT_SCALE)
  assert.equal(exportSize.width / baseSize.width, exportSize.height / baseSize.height)
  assert.equal(exportSize.width / baseSize.width, MAX_IMAGE_EXPORT_SCALE)
})

test('image processing workspace resolves upscale preview as the export base size', () => {
  assert.deepEqual(resolveExportBaseSize({ width: 400, height: 200 }, true, { width: 800, height: 400 }), { width: 800, height: 400 })
  assert.deepEqual(resolveExportBaseSize({ width: 400, height: 200 }, false, { width: 800, height: 400 }), { width: 400, height: 200 })
  assert.deepEqual(resolveExportBaseSize(null, true, null), { width: MIN_IMAGE_EXPORT_SIZE, height: MIN_IMAGE_EXPORT_SIZE })
})

test('image processing workspace resolves export target source and crop', () => {
  const source = { url: 'blob://processed', width: 400, height: 200 }
  const crop = { x: 20, y: 10, width: 120, height: 80 }
  const upscalePreview = { url: 'blob://upscaled', width: 480, height: 320 }

  assert.equal(resolveImageExportTarget(null, crop, false, null), null)
  assert.equal(resolveImageExportTarget(source, null, false, null), null)
  assert.deepEqual(resolveImageExportTarget(source, crop, false, upscalePreview), {
    sourceUrl: 'blob://processed',
    crop,
  })
  assert.deepEqual(resolveImageExportTarget(source, crop, true, upscalePreview), {
    sourceUrl: 'blob://upscaled',
    crop: { x: 0, y: 0, width: 480, height: 320 },
  })
})
