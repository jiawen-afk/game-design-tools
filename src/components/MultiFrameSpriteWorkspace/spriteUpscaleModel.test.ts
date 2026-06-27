import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import * as spriteModel from './model'

type ExportedFunction = (...args: unknown[]) => unknown

function requireModelFunction(name: string): ExportedFunction {
  const exported = spriteModel as Record<string, unknown>
  const fn = exported[name]
  assert.equal(typeof fn, 'function', `${name} should be exported from sprite workspace model`)
  return fn as ExportedFunction
}

test('sprite upscale targets visible composed frames in playback order', () => {
  const getSpriteUpscaleTargetFrames = requireModelFunction('getSpriteUpscaleTargetFrames')
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
  const getCurrentSpriteUpscalePreview = requireModelFunction('getCurrentSpriteUpscalePreview')
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
  const collectStaleSpriteUpscaleResultUrls = requireModelFunction('collectStaleSpriteUpscaleResultUrls')
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

test('sprite export uses current upscaled frame urls and flow 3 canvas dimensions when upscale is enabled', () => {
  const buildSpriteUpscaleExportPlan = requireModelFunction('buildSpriteUpscaleExportPlan')
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
  const buildSpriteUpscaleExportPlan = requireModelFunction('buildSpriteUpscaleExportPlan')
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

test('sprite export refuses stale or missing upscale frames instead of falling back to original frames', () => {
  const buildSpriteUpscaleExportPlan = requireModelFunction('buildSpriteUpscaleExportPlan')
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

test('sprite playback panel exposes batch upscale controls and a side by side upscale preview', () => {
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/PlaybackPanel.tsx', 'utf8')
  const outputPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/OutputWorkspacePanel.tsx', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')

  assert.match(controller, /useSpriteUpscaleWorkspace/)
  assert.match(outputPanel, /upscale=\{playback\.upscale\}/)
  assert.match(panel, /批量高清化/)
  assert.match(panel, /高清化播放/)
  assert.match(panel, /upscale\.previewResult/)
})

test('sprite export receives upscale results so enabled upscale exports cannot use original frames', () => {
  const exportHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteExport.ts', 'utf8')
  const upscaleHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteUpscaleWorkspace.ts', 'utf8')
  const controller = readFileSync('src/components/MultiFrameSpriteWorkspace/useSpriteWorkspaceController.ts', 'utf8')

  assert.match(controller, /upscaleEnabled:\s*upscale\.upscaleEnabled/)
  assert.match(controller, /upscaleResultsByFrameId:\s*upscale\.resultByFrameId/)
  assert.match(controller, /composeStyle:\s*layout\.composeStyle/)
  assert.match(exportHook, /buildSpriteUpscaleExportPlan/)
  assert.match(exportHook, /高清化已开启，请先批量高清化所有可见帧后再导出/)
  assert.match(upscaleHook, /frame\.matteUrl/)
  assert.match(upscaleHook, /composeFrame\(\s*upscaledSourceUrl,\s*canvasWidth,\s*canvasHeight,\s*frame\.layout,\s*composeStyle\s*\)/s)
})

test('sprite playback layout caps the frame playlist at three columns', () => {
  const css = readFileSync('src/components/MultiFrameSpriteWorkspace/workspace.css', 'utf8')

  assert.match(css, /\.playback-workspace-grid\s*{[^}]*grid-template-columns:\s*minmax\(\d+px,\s*\d+px\)\s+minmax\(0,\s*1fr\)/s)
  assert.match(css, /\.playback-frame-list\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(\d+px,\s*1fr\)\)/s)
  assert.doesNotMatch(css, /\.playback-frame-list\s*{[^}]*grid-auto-flow:\s*column/s)
  assert.match(css, /\.playback-preview-pair\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(\d+px,\s*1fr\)\)/s)
})
