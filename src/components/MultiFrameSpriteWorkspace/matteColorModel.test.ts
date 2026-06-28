import test from 'node:test'
import assert from 'node:assert/strict'

import { computeFrameSamplePoint } from './matteColorSampler'
import {
  coerceMatteDefaults,
  computeChromaKeyAlpha,
  getSpillColorHex,
  normalizeHexColor,
  normalizePickerColor,
  resolveSpillColor,
} from './model'

test('spill color options resolve to expected RGB colors', () => {
  assert.deepEqual(resolveSpillColor('key', undefined, [12, 34, 56]), [12, 34, 56])
  assert.deepEqual(resolveSpillColor('green'), [0, 255, 0])
  assert.deepEqual(resolveSpillColor('blue'), [0, 0, 255])
  assert.deepEqual(resolveSpillColor('magenta'), [255, 0, 255])
  assert.deepEqual(resolveSpillColor('custom', '#123abc'), [18, 58, 188])
  assert.deepEqual(resolveSpillColor('custom', 'bad'), [0, 255, 0])
})

test('spill color options expose preview hex values', () => {
  assert.equal(getSpillColorHex('key', undefined, [12, 34, 56]), '#0c2238')
  assert.equal(getSpillColorHex('green'), '#00ff00')
  assert.equal(getSpillColorHex('blue'), '#0000ff')
  assert.equal(getSpillColorHex('magenta'), '#ff00ff')
  assert.equal(getSpillColorHex('custom', '#123abc'), '#123abc')
  assert.equal(getSpillColorHex('custom', 'bad'), '#00ff00')
})

test('matte sample point maps preview clicks into source image bounds', () => {
  assert.deepEqual(
    computeFrameSamplePoint({
      clientX: 75,
      clientY: 140,
      previewRect: { left: 25, top: 100, width: 100, height: 80 },
      sourceWidth: 400,
      sourceHeight: 200,
    }),
    { x: 200, y: 100 }
  )
  assert.deepEqual(
    computeFrameSamplePoint({
      clientX: 999,
      clientY: -50,
      previewRect: { left: 25, top: 100, width: 100, height: 80 },
      sourceWidth: 400,
      sourceHeight: 200,
    }),
    { x: 399, y: 0 }
  )
})

test('chroma key alpha matches FrameRonin tolerance and feather semantics', () => {
  assert.equal(computeChromaKeyAlpha(79, 80, 5), 0)
  assert.equal(computeChromaKeyAlpha(82.5, 80, 5), 0.5)
  assert.equal(computeChromaKeyAlpha(86, 80, 5), 1)
})

test('hex colors normalize picker values without falling back to green', () => {
  assert.equal(normalizeHexColor('#ABCDEF'), '#abcdef')
  assert.equal(normalizeHexColor('123abc'), '#123abc')
  assert.equal(normalizeHexColor('#12abcf80'), '#12abcf')
  assert.equal(normalizeHexColor('rgb(12, 34, 56)'), '#0c2238')
  assert.equal(normalizeHexColor('rgba(12, 34, 56, 0.5)'), '#0c2238')
  assert.equal(normalizeHexColor('bad', '#ffffff'), '#ffffff')
})

test('picker colors prefer stable color object methods', () => {
  assert.equal(normalizePickerColor({ toHexString: () => '#ABCDEF' }, '#00ff00', '#1a1a1a'), '#abcdef')
  assert.equal(normalizePickerColor({ toRgbString: () => 'rgb(12, 34, 56)' }, '#00ff00', '#1a1a1a'), '#0c2238')
  assert.equal(normalizePickerColor({}, 'rgba(12, 34, 56, 0.5)', '#1a1a1a'), '#0c2238')
  assert.equal(normalizePickerColor({}, 'bad', '#1a1a1a'), '#1a1a1a')
})

test('matte defaults are clamped and keep expected fallback values', () => {
  assert.deepEqual(coerceMatteDefaults({}), {
    tolerance: 5,
    smoothness: 5,
    spill: 0,
    erosion: 5,
    spillColorMode: 'key',
    customSpillHex: '#00ff00',
  })
  assert.deepEqual(coerceMatteDefaults({
    tolerance: 120,
    smoothness: -10,
    spill: 44,
    erosion: 6,
    spillColorMode: 'blue',
    customSpillHex: '#123abc',
  }), {
    tolerance: 100,
    smoothness: 0,
    spill: 44,
    erosion: 6,
    spillColorMode: 'blue',
    customSpillHex: '#123abc',
  })
  assert.equal(coerceMatteDefaults({ smoothness: 120 }).smoothness, 50)
})
