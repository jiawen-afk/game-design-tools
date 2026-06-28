import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  applyCanvasRatioToFrameLayouts,
  applyLayoutPresetToFrames,
  computeRatioSize,
  getPendingComposedFrameIds,
} from './model'

test('public ratio apply button exposes processing state while composed frames update', () => {
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/CanvasPublicParamsPanel.tsx', 'utf8')
  const toolbar = readFileSync('src/components/MultiFrameSpriteWorkspace/LayoutWorkspaceToolbar.tsx', 'utf8')
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const feedbackHook = readFileSync('src/components/MultiFrameSpriteWorkspace/useCanvasRatioApplyFeedback.ts', 'utf8')

  assert.match(panel, /ratioApplying:\s*boolean/)
  assert.match(panel, /loading=\{ratioApplying\}/)
  assert.match(panel, /disabled=\{ratioApplying\}/)
  assert.match(toolbar, /ratioApplying=\{layout\.canvasRatioApplying\}/)
  assert.match(hook, /canvasRatioApplying/)
  assert.match(feedbackHook, /getPendingComposedFrameIds/)
})

test('pending composed frame ids track only ratio targets that still need composing', () => {
  assert.deepEqual(
    getPendingComposedFrameIds(
      [
        { id: 'a', matteUrl: 'blob:a', matteRevision: 2, composedRevision: -1 },
        { id: 'b', matteUrl: 'blob:b', matteRevision: 3, composedRevision: 3 },
        { id: 'c', matteUrl: null, matteRevision: 0, composedRevision: -1 },
      ],
      ['a', 'b', 'c']
    ),
    ['a']
  )
  assert.deepEqual(
    getPendingComposedFrameIds(
      [{ id: 'a', matteUrl: 'blob:a', matteRevision: 2, composedRevision: -1 }],
      []
    ),
    []
  )
})

test('ratio sizing keeps a frame inside the shared canvas', () => {
  assert.deepEqual(computeRatioSize(200, 100, 400, 300, 50, 'height'), {
    width: 300,
    height: 150,
  })
  assert.deepEqual(computeRatioSize(200, 100, 400, 300, 50, 'width'), {
    width: 200,
    height: 100,
  })
})

test('canvas ratio sizing can target all frames or only one frame', () => {
  const frames = [
    { id: 'a', matteWidth: 100, matteHeight: 50, layout: { width: 10, height: 10 }, composedRevision: 3 },
    { id: 'b', matteWidth: 50, matteHeight: 100, layout: { width: 20, height: 20 }, composedRevision: 4 },
  ]

  assert.deepEqual(
    applyCanvasRatioToFrameLayouts(frames, {
      canvasWidth: 200,
      canvasHeight: 200,
      percent: 50,
      basis: 'height',
      targetId: 'a',
    }),
    [
      { id: 'a', matteWidth: 100, matteHeight: 50, layout: { width: 200, height: 100 }, composedRevision: -1 },
      { id: 'b', matteWidth: 50, matteHeight: 100, layout: { width: 20, height: 20 }, composedRevision: 4 },
    ]
  )

  assert.deepEqual(
    applyCanvasRatioToFrameLayouts(frames, {
      canvasWidth: 200,
      canvasHeight: 200,
      percent: 50,
      basis: 'width',
    }).map((frame) => frame.layout),
    [
      { width: 100, height: 50 },
      { width: 100, height: 200 },
    ]
  )
})

test('layout presets update frame layouts without UI state', () => {
  const frames = [
    { id: 'a', matteWidth: 100, matteHeight: 50, layout: { width: 20, height: 10, offsetX: 4, offsetY: -3 }, composedRevision: 2 },
    { id: 'b', matteWidth: 60, matteHeight: 120, layout: { width: 30, height: 60, offsetX: -6, offsetY: 8 }, composedRevision: 3 },
  ]

  assert.deepEqual(
    applyLayoutPresetToFrames(frames, { mode: 'center' }).map((frame) => ({ layout: frame.layout, composedRevision: frame.composedRevision })),
    [
      { layout: { width: 20, height: 10, offsetX: 0, offsetY: 0 }, composedRevision: -1 },
      { layout: { width: 30, height: 60, offsetX: 0, offsetY: 0 }, composedRevision: -1 },
    ]
  )
  assert.deepEqual(
    applyLayoutPresetToFrames(frames, { mode: 'active', activeFrameId: 'a' }).map((frame) => frame.layout),
    [
      { width: 20, height: 10, offsetX: 4, offsetY: -3 },
      { width: 20, height: 10, offsetX: -6, offsetY: 8 },
    ]
  )
  assert.deepEqual(
    applyLayoutPresetToFrames(frames, { mode: 'maxBoth' }).map((frame) => frame.layout),
    [
      { width: 30, height: 60, offsetX: 4, offsetY: -3 },
      { width: 30, height: 60, offsetX: -6, offsetY: 8 },
    ]
  )
  assert.deepEqual(
    applyLayoutPresetToFrames(frames, { mode: 'maxWidth' }).map((frame) => frame.layout),
    [
      { width: 30, height: 15, offsetX: 4, offsetY: -3 },
      { width: 30, height: 60, offsetX: -6, offsetY: 8 },
    ]
  )
  assert.deepEqual(
    applyLayoutPresetToFrames(frames, { mode: 'maxHeight' }).map((frame) => frame.layout),
    [
      { width: 120, height: 60, offsetX: 4, offsetY: -3 },
      { width: 30, height: 60, offsetX: -6, offsetY: 8 },
    ]
  )
})
