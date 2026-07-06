import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canUseTransparentImageExportBackground,
  getDefaultImageExportBackground,
  getExportScaleAfterDimensionChange,
  getExportSizeAfterScaleChange,
  normalizeExportScale,
  normalizeExportSize,
  normalizeImageExportBackground,
  resolveCropDrawPlan,
  resolveExportBaseSize,
  resolveImageExportBackgroundColor,
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

test('image processing workspace defaults alpha export backgrounds to transparent', () => {
  const webp = { format: 'webp-lossless' as const, optimizePng: false }
  const png = { format: 'png' as const, optimizePng: false }

  assert.equal(canUseTransparentImageExportBackground(webp), true)
  assert.deepEqual(getDefaultImageExportBackground(webp), { mode: 'transparent', color: '#000000' })
  assert.deepEqual(getDefaultImageExportBackground(png), { mode: 'transparent', color: '#000000' })
  assert.equal(resolveImageExportBackgroundColor({ mode: 'transparent', color: '#ff00ff' }, webp), null)
})

test('image processing workspace resolves non-alpha export backgrounds to black by default', () => {
  const jpg = { format: 'jpg' as const, optimizePng: false }

  assert.equal(canUseTransparentImageExportBackground(jpg), false)
  assert.deepEqual(getDefaultImageExportBackground(jpg), { mode: 'color', color: '#000000' })
  assert.deepEqual(
    normalizeImageExportBackground({ mode: 'transparent', color: '#12zz90' }, jpg),
    { mode: 'color', color: '#000000' }
  )
  assert.equal(resolveImageExportBackgroundColor({ mode: 'transparent', color: '#ff00ff' }, jpg), '#000000')
})

test('image processing workspace keeps valid color export backgrounds editable', () => {
  const png = { format: 'png' as const, optimizePng: false }
  const jpg = { format: 'jpeg' as const, optimizePng: false }

  assert.deepEqual(
    normalizeImageExportBackground({ mode: 'color', color: '#ABCDEF' }, png),
    { mode: 'color', color: '#abcdef' }
  )
  assert.equal(resolveImageExportBackgroundColor({ mode: 'color', color: '#abcdef' }, png), '#abcdef')
  assert.equal(resolveImageExportBackgroundColor({ mode: 'color', color: '#abcdef' }, jpg), '#abcdef')
})

test('image processing workspace maps expanded crops to source and destination draw rectangles', () => {
  assert.deepEqual(
    resolveCropDrawPlan(
      { x: -10, y: -20, width: 120, height: 100 },
      { width: 100, height: 80 }
    ),
    {
      crop: { x: -10, y: -20, width: 120, height: 100 },
      targetSize: { width: 120, height: 100 },
      sourceRect: { x: 0, y: 0, width: 100, height: 80 },
      destinationRect: { x: 10, y: 20, width: 100, height: 80 },
    }
  )
  assert.deepEqual(
    resolveCropDrawPlan(
      { x: 20, y: 10, width: 120, height: 90 },
      { width: 100, height: 80 },
      { width: 240, height: 180 }
    ),
    {
      crop: { x: 20, y: 10, width: 120, height: 90 },
      targetSize: { width: 240, height: 180 },
      sourceRect: { x: 20, y: 10, width: 80, height: 70 },
      destinationRect: { x: 0, y: 0, width: 160, height: 140 },
    }
  )
  assert.deepEqual(
    resolveCropDrawPlan(
      { x: -200, y: 0, width: 50, height: 50 },
      { width: 100, height: 80 }
    ).sourceRect,
    null
  )
})
