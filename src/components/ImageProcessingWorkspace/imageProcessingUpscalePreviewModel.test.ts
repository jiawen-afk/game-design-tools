import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldInvalidateUpscalePreview } from './imageProcessingModel'

test('image processing workspace keeps an upscale preview until its source inputs change', () => {
  const previewInputs = {
    crop: { x: 12, y: 8, width: 320, height: 180 },
    exportFormat: 'png' as const,
    processedUrl: 'processed://source',
    upscaleOptions: { model: 'upscayl-standard-4x' as const, scale: 4, tileSize: 0, ttaMode: false },
  }

  assert.equal(shouldInvalidateUpscalePreview(previewInputs, previewInputs), false)
  assert.equal(shouldInvalidateUpscalePreview(previewInputs, { ...previewInputs, crop: { ...previewInputs.crop, width: 300 } }), true)
  assert.equal(shouldInvalidateUpscalePreview(previewInputs, { ...previewInputs, exportFormat: 'webp' }), true)
  assert.equal(shouldInvalidateUpscalePreview(previewInputs, { ...previewInputs, processedUrl: 'processed://next' }), true)
  assert.equal(shouldInvalidateUpscalePreview(previewInputs, { ...previewInputs, upscaleOptions: { ...previewInputs.upscaleOptions, model: 'digital-art-4x' } }), true)
})
