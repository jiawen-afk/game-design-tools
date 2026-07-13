import test from 'node:test'
import assert from 'node:assert/strict'

import {
  areImageProcessingBatchSettingsEqual,
  cloneImageProcessingBatchSettings,
  createBatchPreviewSignature,
  createDefaultImageProcessingBatchSettings,
  createImageProcessingBatchSettingsSignature,
  deriveBatchExportArchiveName,
  deriveBatchExportFileNames,
  deriveBatchExportFileNamesBySettings,
  mapImageProcessingBatchSettingsToSize,
  mapCropBoxToImageSize,
} from './imageProcessingModel'

test('image processing batch maps the active crop box proportionally to another image size', () => {
  const mapped = mapCropBoxToImageSize(
    { x: 50, y: 20, width: 80, height: 40 },
    { width: 200, height: 100 },
    { width: 1000, height: 500 },
  )

  assert.deepEqual(mapped, { x: 250, y: 100, width: 400, height: 200 })
})

test('image processing batch keeps proportional crop boxes expandable in the target image', () => {
  const mapped = mapCropBoxToImageSize(
    { x: 190, y: 90, width: 40, height: 30 },
    { width: 200, height: 100 },
    { width: 80, height: 40 },
  )

  assert.deepEqual(mapped, { x: 76, y: 36, width: 16, height: 16 })
})

test('image processing batch derives unique exported file names from source names', () => {
  assert.deepEqual(
    deriveBatchExportFileNames(['hero.png', 'hero.jpg', 'slash/name.webp'], { format: 'webp-lossless', optimizePng: false }),
    ['hero-processed.webp', 'hero-2-processed.webp', 'slash_name-processed.webp'],
  )
})

test('image processing batch derives a zip archive name for multi-image export', () => {
  assert.equal(deriveBatchExportArchiveName('hero.png'), 'hero-processed-images.zip')
  assert.equal(deriveBatchExportArchiveName(''), 'images-processed-images.zip')
})

test('image processing batch settings are independent deep clones', () => {
  const original = createDefaultImageProcessingBatchSettings({ width: 200, height: 100 })
  const cloned = cloneImageProcessingBatchSettings(original)

  cloned.matte.keyColor[0] = 255
  cloned.exportEncoding.format = 'png'
  cloned.exportBackground.color = '#ff00ff'
  cloned.upscaleOptions.gpuId = '1'
  cloned.upscaleOutputScale = 0.5
  cloned.crop.x = 40

  assert.deepEqual(original.matte.keyColor, [0, 255, 0])
  assert.equal(original.exportEncoding.format, 'webp-lossless')
  assert.equal(original.exportBackground.color, '#000000')
  assert.equal(original.upscaleOptions.gpuId, '0')
  assert.equal(original.upscaleOutputScale, 1)
  assert.equal(original.crop.x, 0)
  assert.equal(areImageProcessingBatchSettingsEqual(original, cloned), false)
  assert.equal(
    areImageProcessingBatchSettingsEqual(original, cloneImageProcessingBatchSettings(original)),
    true,
  )
})

test('image processing batch settings map only the crop when applied to another image size', () => {
  const source = createDefaultImageProcessingBatchSettings({ width: 200, height: 100 })
  source.crop = { x: 20, y: 10, width: 80, height: 40 }
  source.matteMode = 'ai'
  source.exportEncoding = { format: 'png', optimizePng: true }
  source.exportScale = 2
  source.upscaleEnabled = true
  source.upscaleOutputScale = 0.5
  source.upscaleOptions = { ...source.upscaleOptions, gpuId: '1', scale: 2 }

  const mapped = mapImageProcessingBatchSettingsToSize(
    source,
    { width: 200, height: 100 },
    { width: 1000, height: 500 },
  )

  assert.deepEqual(mapped.crop, { x: 100, y: 50, width: 400, height: 200 })
  assert.equal(mapped.matteMode, 'ai')
  assert.deepEqual(mapped.exportEncoding, { format: 'png', optimizePng: true })
  assert.equal(mapped.exportScale, 2)
  assert.equal(mapped.upscaleEnabled, true)
  assert.equal(mapped.upscaleOutputScale, 0.5)
  assert.equal(mapped.upscaleOptions.gpuId, '1')
  assert.notEqual(mapped.matte, source.matte)
  assert.notEqual(mapped.upscaleOptions, source.upscaleOptions)
})

test('image processing batch derives each exported file extension from its own settings', () => {
  assert.deepEqual(
    deriveBatchExportFileNamesBySettings([
      { sourceName: 'hero.png', exportEncoding: { format: 'png', optimizePng: false } },
      { sourceName: 'hero.jpg', exportEncoding: { format: 'webp-lossless', optimizePng: false } },
      { sourceName: 'slash/name.webp', exportEncoding: { format: 'jpg', optimizePng: false } },
    ]),
    ['hero-processed.png', 'hero-processed.webp', 'slash_name-processed.jpg'],
  )
})

test('image processing batch export names avoid natural suffix and case-insensitive collisions', () => {
  const png = { format: 'png' as const, optimizePng: false }
  assert.deepEqual(
    deriveBatchExportFileNamesBySettings([
      { sourceName: 'hero.png', exportEncoding: png },
      { sourceName: 'Hero.jpg', exportEncoding: png },
      { sourceName: 'hero-2.webp', exportEncoding: png },
      { sourceName: 'hero.png', exportEncoding: { format: 'webp-lossless', optimizePng: false } },
    ]),
    [
      'hero-processed.png',
      'Hero-2-processed.png',
      'hero-2-2-processed.png',
      'hero-processed.webp',
    ],
  )
})

test('image processing batch settings signatures track each complete per-image profile', () => {
  const first = createDefaultImageProcessingBatchSettings({ width: 200, height: 100 })
  first.crop = { x: 20, y: 10, width: 80, height: 40 }
  first.exportScale = 2
  first.upscaleEnabled = true
  first.upscaleOutputScale = 0.5
  const proportional = mapImageProcessingBatchSettingsToSize(
    first,
    { width: 200, height: 100 },
    { width: 1000, height: 500 },
  )
  const formatChanged = cloneImageProcessingBatchSettings(proportional)
  formatChanged.exportEncoding.format = 'png'
  const backgroundChanged = cloneImageProcessingBatchSettings(proportional)
  backgroundChanged.exportBackground = { mode: 'color', color: '#ff00ff' }
  const upscaleDisabled = cloneImageProcessingBatchSettings(proportional)
  upscaleDisabled.upscaleEnabled = false
  const outputScaleChanged = cloneImageProcessingBatchSettings(proportional)
  outputScaleChanged.upscaleOutputScale = 1

  const firstSignature = createImageProcessingBatchSettingsSignature(first, { width: 200, height: 100 })
  const proportionalSignature = createImageProcessingBatchSettingsSignature(proportional, { width: 1000, height: 500 })

  assert.equal(firstSignature, proportionalSignature)
  assert.notEqual(
    proportionalSignature,
    createImageProcessingBatchSettingsSignature(formatChanged, { width: 1000, height: 500 }),
  )
  assert.notEqual(
    proportionalSignature,
    createImageProcessingBatchSettingsSignature(backgroundChanged, { width: 1000, height: 500 }),
  )
  assert.notEqual(
    proportionalSignature,
    createImageProcessingBatchSettingsSignature(upscaleDisabled, { width: 1000, height: 500 }),
  )
  assert.notEqual(
    proportionalSignature,
    createImageProcessingBatchSettingsSignature(outputScaleChanged, { width: 1000, height: 500 }),
  )
})

test('image processing batch preview signatures survive proportional image switching', () => {
  const shared = {
    exportFormat: 'png' as const,
    exportBackgroundColor: null,
    exportScale: 2,
    matte: {
      keyColor: [0, 255, 0] as [number, number, number],
      tolerance: 5,
      smoothness: 5,
      spill: 0,
      spillColorMode: 'key' as const,
      customSpillHex: '#00ff00',
      erosion: 5,
    },
    matteEnabled: true,
    matteMode: 'chroma' as const,
    upscaleOptions: {
      model: 'upscayl-standard-4x' as const,
      scale: 4,
      tileSize: 0,
      ttaMode: false,
      gpuId: '0' as const,
      threadProfile: 'balanced' as const,
    },
  }

  const first = createBatchPreviewSignature({
    ...shared,
    crop: { x: 20, y: 10, width: 80, height: 40 },
    sourceSize: { width: 200, height: 100 },
  })
  const switched = createBatchPreviewSignature({
    ...shared,
    crop: { x: 100, y: 50, width: 400, height: 200 },
    sourceSize: { width: 1000, height: 500 },
  })
  const edited = createBatchPreviewSignature({
    ...shared,
    crop: { x: 110, y: 50, width: 400, height: 200 },
    sourceSize: { width: 1000, height: 500 },
  })
  const formatChanged = createBatchPreviewSignature({
    ...shared,
    exportFormat: 'webp',
    crop: { x: 100, y: 50, width: 400, height: 200 },
    sourceSize: { width: 1000, height: 500 },
  })
  const backgroundChanged = createBatchPreviewSignature({
    ...shared,
    exportBackgroundColor: '#000000',
    crop: { x: 100, y: 50, width: 400, height: 200 },
    sourceSize: { width: 1000, height: 500 },
  })
  const gpuChanged = createBatchPreviewSignature({
    ...shared,
    upscaleOptions: { ...shared.upscaleOptions, gpuId: '1' },
    crop: { x: 100, y: 50, width: 400, height: 200 },
    sourceSize: { width: 1000, height: 500 },
  })
  const threadsChanged = createBatchPreviewSignature({
    ...shared,
    upscaleOptions: { ...shared.upscaleOptions, threadProfile: 'throughput' },
    crop: { x: 100, y: 50, width: 400, height: 200 },
    sourceSize: { width: 1000, height: 500 },
  })
  const matteModeChanged = createBatchPreviewSignature({
    ...shared,
    matteMode: 'ai',
    crop: { x: 100, y: 50, width: 400, height: 200 },
    sourceSize: { width: 1000, height: 500 },
  })

  assert.equal(first, switched)
  assert.equal(first, formatChanged)
  assert.notEqual(first, backgroundChanged)
  assert.notEqual(first, edited)
  assert.notEqual(first, gpuChanged)
  assert.notEqual(first, threadsChanged)
  assert.notEqual(first, matteModeChanged)
})
