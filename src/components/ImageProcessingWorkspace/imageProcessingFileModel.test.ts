import test from 'node:test'
import assert from 'node:assert/strict'

import {
  deriveExportFileName,
  getExportFormatInfo,
  isSupportedImageFile,
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

test('image processing workspace derives export filenames from source image names', () => {
  assert.equal(deriveExportFileName('hero.walk.png', 'webp'), 'hero.walk-processed.webp')
  assert.equal(deriveExportFileName('bad/name?.jpg', 'png'), 'bad_name_-processed.png')
  assert.equal(deriveExportFileName('', 'jpeg'), 'image-processed.jpeg')
})
