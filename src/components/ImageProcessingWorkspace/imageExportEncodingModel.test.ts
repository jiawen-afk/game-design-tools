import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getImageExportEncodingInfo,
  normalizeImageExportEncoding,
  type ImageExportEncodingSettings,
} from './imageProcessingModel'

test('image export encoding defaults WebP to bundled lossless alpha output', () => {
  const settings = normalizeImageExportEncoding(undefined)
  assert.deepEqual(settings, { format: 'webp-lossless', optimizePng: false })
  assert.deepEqual(getImageExportEncodingInfo(settings), {
    extension: 'webp',
    mimeType: 'image/webp',
    preservesAlpha: true,
    requiresDesktopEncoding: true,
    desktopEncoder: 'cwebp-lossless',
  })
})

test('image export encoding can keep PNG output and optionally optimize with oxipng', () => {
  const png = normalizeImageExportEncoding({ format: 'png', optimizePng: true })
  assert.deepEqual(png, { format: 'png', optimizePng: true })
  assert.deepEqual(getImageExportEncodingInfo(png), {
    extension: 'png',
    mimeType: 'image/png',
    preservesAlpha: true,
    requiresDesktopEncoding: true,
    desktopEncoder: 'oxipng',
  })
})

test('image export encoding keeps JPG out of optional lossless optimization', () => {
  const jpg: ImageExportEncodingSettings = { format: 'jpg', optimizePng: true }
  assert.deepEqual(getImageExportEncodingInfo(jpg), {
    extension: 'jpg',
    mimeType: 'image/jpeg',
    preservesAlpha: false,
    requiresDesktopEncoding: false,
    desktopEncoder: null,
  })
})
