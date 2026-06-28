import test from 'node:test'
import assert from 'node:assert/strict'

import { requireSpriteModelFunction } from './spriteUpscaleTestHelpers.test'

test('sprite upscale targets visible composed frames in playback order', () => {
  const getSpriteUpscaleTargetFrames = requireSpriteModelFunction('getSpriteUpscaleTargetFrames')
  const frames = [
    { id: 'a', sourceName: 'walk-1.png', hidden: false, matteUrl: 'blob:a-matte', composedUrl: 'blob:a', composedRevision: 1 },
    { id: 'b', sourceName: 'walk-2.png', hidden: true, matteUrl: 'blob:b-matte', composedUrl: 'blob:b', composedRevision: 1 },
    { id: 'c', sourceName: 'walk-3.png', hidden: false, matteUrl: 'blob:c-matte', composedUrl: null, composedRevision: -1 },
    { id: 'd', sourceName: 'walk-4.png', hidden: false, matteUrl: 'blob:d-matte', composedUrl: 'blob:d', composedRevision: 3 },
    { id: 'e', sourceName: 'walk-5.png', hidden: false, matteUrl: null, composedUrl: 'blob:e', composedRevision: 3 },
  ]

  assert.deepEqual(
    (getSpriteUpscaleTargetFrames(frames) as Array<{ id: string }>).map((frame) => frame.id),
    ['a', 'd']
  )
})

test('sprite upscale preview follows the current playback frame without replacing the original frame', () => {
  const getCurrentSpriteUpscalePreview = requireSpriteModelFunction('getCurrentSpriteUpscalePreview')
  const currentFrame = { id: 'a', matteUrl: 'blob:a-matte-v2', matteRevision: 4, composedUrl: 'blob:a-v2', composedRevision: 2 }
  const results = {
    a: {
      frameId: 'a',
      sourceMatteUrl: 'blob:a-matte-v2',
      matteRevision: 4,
      sourceComposedUrl: 'blob:a-v2',
      composedRevision: 2,
      url: 'blob:a-upscaled',
      upscaledSourceUrl: 'blob:a-source-upscaled',
      width: 512,
      height: 512,
    },
  }

  assert.deepEqual(getCurrentSpriteUpscalePreview(currentFrame, results, true), results.a)
  assert.equal(getCurrentSpriteUpscalePreview(currentFrame, results, false), null)
  assert.equal(
    getCurrentSpriteUpscalePreview({ ...currentFrame, composedUrl: 'blob:a-v3' }, results, true),
    null
  )
  assert.equal(
    getCurrentSpriteUpscalePreview({ ...currentFrame, matteUrl: 'blob:a-matte-v3' }, results, true),
    null
  )
  assert.equal(
    getCurrentSpriteUpscalePreview({ ...currentFrame, composedRevision: 3 }, results, true),
    null
  )
})

test('stale sprite upscale result urls are revoked only when source frames change or disappear', () => {
  const collectStaleSpriteUpscaleResultUrls = requireSpriteModelFunction('collectStaleSpriteUpscaleResultUrls')
  const frames = [
    { id: 'a', hidden: true, matteUrl: 'blob:a-matte-v1', matteRevision: 1, composedUrl: 'blob:a-v1', composedRevision: 1 },
    { id: 'b', hidden: false, matteUrl: 'blob:b-matte-v2', matteRevision: 2, composedUrl: 'blob:b-v2', composedRevision: 2 },
  ]
  const results = {
    a: { frameId: 'a', sourceMatteUrl: 'blob:a-matte-v1', matteRevision: 1, sourceComposedUrl: 'blob:a-v1', composedRevision: 1, url: 'blob:a-upscaled', upscaledSourceUrl: 'blob:a-source-upscaled' },
    b: { frameId: 'b', sourceMatteUrl: 'blob:b-matte-v1', matteRevision: 1, sourceComposedUrl: 'blob:b-v1', composedRevision: 1, url: 'blob:b-upscaled', upscaledSourceUrl: 'blob:b-source-upscaled' },
    c: { frameId: 'c', sourceMatteUrl: 'blob:c-matte-v1', matteRevision: 1, sourceComposedUrl: 'blob:c-v1', composedRevision: 1, url: 'blob:c-upscaled', upscaledSourceUrl: 'blob:c-source-upscaled' },
  }

  assert.deepEqual(collectStaleSpriteUpscaleResultUrls(frames, results), [
    'blob:b-upscaled',
    'blob:b-source-upscaled',
    'blob:c-upscaled',
    'blob:c-source-upscaled',
  ])
})
