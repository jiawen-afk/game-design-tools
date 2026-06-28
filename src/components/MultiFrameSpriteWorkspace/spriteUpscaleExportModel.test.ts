import test from 'node:test'
import assert from 'node:assert/strict'

import { requireSpriteModelFunction } from './spriteUpscaleTestHelpers.test'

test('sprite export uses current upscaled frame urls and flow 3 canvas dimensions when upscale is enabled', () => {
  const buildSpriteUpscaleExportPlan = requireSpriteModelFunction('buildSpriteUpscaleExportPlan')
  const visibleFrames = [
    { id: 'a', sourceName: 'walk-1.png', matteUrl: 'blob:a-matte-v1', matteRevision: 1, composedUrl: 'blob:a-v1', composedRevision: 1 },
    { id: 'b', sourceName: 'walk-2.png', matteUrl: 'blob:b-matte-v2', matteRevision: 2, composedUrl: 'blob:b-v2', composedRevision: 2 },
  ]
  const results = {
    a: { frameId: 'a', sourceMatteUrl: 'blob:a-matte-v1', matteRevision: 1, sourceComposedUrl: 'blob:a-v1', composedRevision: 1, url: 'blob:a-upscaled', upscaledSourceUrl: 'blob:a-source-upscaled', width: 1024, height: 768 },
    b: { frameId: 'b', sourceMatteUrl: 'blob:b-matte-v2', matteRevision: 2, sourceComposedUrl: 'blob:b-v2', composedRevision: 2, url: 'blob:b-upscaled', upscaledSourceUrl: 'blob:b-source-upscaled', width: 1024, height: 768 },
  }

  const plan = buildSpriteUpscaleExportPlan(visibleFrames, results, true, 256, 192) as {
    visibleFrames: Array<{ id: string; composedUrl: string }>
    canvasWidth: number
    canvasHeight: number
    usingUpscale: boolean
    missingFrameNames: string[]
  }

  assert.equal(plan.usingUpscale, true)
  assert.equal(plan.canvasWidth, 256)
  assert.equal(plan.canvasHeight, 192)
  assert.deepEqual(plan.visibleFrames.map((frame) => frame.composedUrl), ['blob:a-upscaled', 'blob:b-upscaled'])
  assert.deepEqual(plan.missingFrameNames, [])
})

test('sprite upscale export dimensions come from flow 3 canvas parameters without multiplying scale', () => {
  const buildSpriteUpscaleExportPlan = requireSpriteModelFunction('buildSpriteUpscaleExportPlan')
  const visibleFrames = [
    { id: 'a', sourceName: 'walk-1.png', matteUrl: 'blob:a-matte-v1', matteRevision: 1, composedUrl: 'blob:a-v1', composedRevision: 1 },
  ]
  const results = {
    a: { frameId: 'a', sourceMatteUrl: 'blob:a-matte-v1', matteRevision: 1, sourceComposedUrl: 'blob:a-v1', composedRevision: 1, url: 'blob:a-upscaled', upscaledSourceUrl: 'blob:a-source-upscaled', width: 999, height: 777 },
  }

  const plan = buildSpriteUpscaleExportPlan(visibleFrames, results, true, 320, 240) as {
    canvasWidth: number
    canvasHeight: number
  }

  assert.equal(plan.canvasWidth, 320)
  assert.equal(plan.canvasHeight, 240)
})

test('sprite input and result upscale modes use different export frame sizes', () => {
  const buildSpriteUpscaleExportPlan = requireSpriteModelFunction('buildSpriteUpscaleExportPlan')
  const visibleFrames = [
    { id: 'a', sourceName: 'walk-1.png', matteUrl: 'blob:a-matte-v1', matteRevision: 1, composedUrl: 'blob:a-v1', composedRevision: 1 },
  ]
  const inputResults = {
    a: {
      frameId: 'a',
      mode: 'input',
      scale: 2,
      sourceMatteUrl: 'blob:a-matte-v1',
      matteRevision: 1,
      sourceComposedUrl: 'blob:a-v1',
      composedRevision: 1,
      url: 'blob:a-input-upscaled',
      upscaledSourceUrl: 'blob:a-source-upscaled',
      width: 320,
      height: 240,
    },
  }
  const outputResults = {
    a: {
      frameId: 'a',
      mode: 'output',
      scale: 2,
      sourceMatteUrl: 'blob:a-matte-v1',
      matteRevision: 1,
      sourceComposedUrl: 'blob:a-v1',
      composedRevision: 1,
      url: 'blob:a-output-upscaled',
      width: 640,
      height: 480,
    },
  }

  const inputPlan = buildSpriteUpscaleExportPlan(visibleFrames, inputResults, 'input', 320, 240, 2) as {
    canvasWidth: number
    canvasHeight: number
    visibleFrames: Array<{ composedUrl: string }>
  }
  const outputPlan = buildSpriteUpscaleExportPlan(visibleFrames, outputResults, 'output', 320, 240, 2) as {
    canvasWidth: number
    canvasHeight: number
    visibleFrames: Array<{ composedUrl: string }>
  }

  assert.equal(inputPlan.canvasWidth, 320)
  assert.equal(inputPlan.canvasHeight, 240)
  assert.deepEqual(inputPlan.visibleFrames.map((frame) => frame.composedUrl), ['blob:a-input-upscaled'])
  assert.equal(outputPlan.canvasWidth, 640)
  assert.equal(outputPlan.canvasHeight, 480)
  assert.deepEqual(outputPlan.visibleFrames.map((frame) => frame.composedUrl), ['blob:a-output-upscaled'])
})

test('sprite upscale export treats input and result mode results as mutually exclusive', () => {
  const buildSpriteUpscaleExportPlan = requireSpriteModelFunction('buildSpriteUpscaleExportPlan')
  const visibleFrames = [
    { id: 'a', sourceName: 'walk-1.png', matteUrl: 'blob:a-matte-v1', matteRevision: 1, composedUrl: 'blob:a-v1', composedRevision: 1 },
  ]
  const inputResults = {
    a: {
      frameId: 'a',
      mode: 'input',
      scale: 2,
      sourceMatteUrl: 'blob:a-matte-v1',
      matteRevision: 1,
      sourceComposedUrl: 'blob:a-v1',
      composedRevision: 1,
      url: 'blob:a-input-upscaled',
      upscaledSourceUrl: 'blob:a-source-upscaled',
      width: 320,
      height: 240,
    },
  }

  const plan = buildSpriteUpscaleExportPlan(visibleFrames, inputResults, 'output', 320, 240, 2) as {
    visibleFrames: Array<{ composedUrl: string }>
    missingFrameNames: string[]
  }

  assert.deepEqual(plan.visibleFrames, [])
  assert.deepEqual(plan.missingFrameNames, ['walk-1.png'])
})

test('sprite export refuses stale or missing upscale frames instead of falling back to original frames', () => {
  const buildSpriteUpscaleExportPlan = requireSpriteModelFunction('buildSpriteUpscaleExportPlan')
  const visibleFrames = [
    { id: 'a', sourceName: 'walk-1.png', matteUrl: 'blob:a-matte-v2', matteRevision: 2, composedUrl: 'blob:a-v2', composedRevision: 2 },
    { id: 'b', sourceName: 'walk-2.png', matteUrl: 'blob:b-matte-v1', matteRevision: 1, composedUrl: 'blob:b-v1', composedRevision: 1 },
  ]
  const results = {
    a: { frameId: 'a', sourceMatteUrl: 'blob:a-matte-v1', matteRevision: 1, sourceComposedUrl: 'blob:a-v1', composedRevision: 1, url: 'blob:a-upscaled', upscaledSourceUrl: 'blob:a-source-upscaled', width: 1024, height: 768 },
  }

  const plan = buildSpriteUpscaleExportPlan(visibleFrames, results, true, 256, 192) as {
    visibleFrames: Array<{ composedUrl: string }>
    canvasWidth: number
    canvasHeight: number
    usingUpscale: boolean
    missingFrameNames: string[]
  }

  assert.equal(plan.usingUpscale, true)
  assert.deepEqual(plan.visibleFrames, [])
  assert.equal(plan.canvasWidth, 256)
  assert.equal(plan.canvasHeight, 192)
  assert.deepEqual(plan.missingFrameNames, ['walk-1.png', 'walk-2.png'])
})
