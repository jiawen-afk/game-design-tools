import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveMatteImageSource, shouldInvalidateUpscalePreview } from './imageProcessingModel'

test('image processing workspace resolves the active image source from matte state', () => {
  const draft = { url: 'blob://source', width: 320, height: 180 }
  const processed = { url: 'blob://matte', width: 320, height: 180 }

  assert.equal(resolveMatteImageSource(draft, processed, true), processed)
  assert.equal(resolveMatteImageSource(draft, processed, false), draft)
  assert.equal(resolveMatteImageSource(draft, null, false), draft)
  assert.equal(resolveMatteImageSource(draft, null, true), null)
})

test('image processing upscale preview survives export format changes', () => {
  const previous = {
    crop: { x: 4, y: 8, width: 64, height: 32 },
    exportFormat: 'png' as const,
    processedUrl: 'blob://processed',
    upscaleOptions: {
      model: 'upscayl-standard-4x',
      scale: 4,
      tileSize: 0,
      ttaMode: false,
    },
  }

  assert.equal(shouldInvalidateUpscalePreview(previous, { ...previous, exportFormat: 'webp' }), false)
  assert.equal(shouldInvalidateUpscalePreview(previous, { ...previous, crop: { ...previous.crop, width: 65 } }), true)
})
