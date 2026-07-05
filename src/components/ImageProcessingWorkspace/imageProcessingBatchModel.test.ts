import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createBatchPreviewSignature,
  deriveBatchExportArchiveName,
  deriveBatchExportFileNames,
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

test('image processing batch clamps proportional crop boxes inside the target image', () => {
  const mapped = mapCropBoxToImageSize(
    { x: 190, y: 90, width: 40, height: 30 },
    { width: 200, height: 100 },
    { width: 80, height: 40 },
  )

  assert.deepEqual(mapped, { x: 64, y: 24, width: 16, height: 16 })
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

test('image processing batch preview signatures survive proportional image switching', () => {
  const shared = {
    exportFormat: 'png' as const,
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

  assert.equal(first, switched)
  assert.equal(first, formatChanged)
  assert.notEqual(first, edited)
  assert.notEqual(first, gpuChanged)
  assert.notEqual(first, threadsChanged)
})
