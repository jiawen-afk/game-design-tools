import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMultiFrameSpriteIndex,
  applyComposedFrameUrl,
  applyFrameTagSelection,
  applyCanvasRatioToFrameLayouts,
  batchHideSelectedFrames,
  buildSpriteSheetGridCells,
  clearFrameCollection,
  clampPreviewZoom,
  coerceLayoutDefaults,
  coerceMatteDefaults,
  computeAutoSpriteColumns,
  computeHandleResize,
  computeKeyboardOffset,
  computeWheelFrameResize,
  computeRatioSize,
  computeWheelResize,
  filterNewUploadFiles,
  filterVisibleFrames,
  getSpillColorHex,
  getWheelScalingButtonLabel,
  applyMatteParamsToFollowingFrames,
  resolveSpillColor,
} from './model'

test('auto columns make compact sprite sheets', () => {
  assert.equal(computeAutoSpriteColumns(1), 1)
  assert.equal(computeAutoSpriteColumns(5), 3)
  assert.equal(computeAutoSpriteColumns(16), 4)
})

test('sprite sheet grid cells split an uploaded sheet by rows and columns', () => {
  assert.deepEqual(buildSpriteSheetGridCells(96, 64, 2, 3), [
    { index: 0, row: 0, column: 0, x: 0, y: 0, width: 32, height: 32 },
    { index: 1, row: 0, column: 1, x: 32, y: 0, width: 32, height: 32 },
    { index: 2, row: 0, column: 2, x: 64, y: 0, width: 32, height: 32 },
    { index: 3, row: 1, column: 0, x: 0, y: 32, width: 32, height: 32 },
    { index: 4, row: 1, column: 1, x: 32, y: 32, width: 32, height: 32 },
    { index: 5, row: 1, column: 2, x: 64, y: 32, width: 32, height: 32 },
  ])
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

test('corner handle resize preserves aspect ratio when locked', () => {
  assert.deepEqual(
    computeHandleResize({
      startWidth: 120,
      startHeight: 80,
      deltaX: 30,
      deltaY: 10,
      handle: 'se',
      keepAspect: true,
    }),
    { width: 150, height: 100 }
  )
})

test('edge handle resize can change a single axis when aspect ratio is unlocked', () => {
  assert.deepEqual(
    computeHandleResize({
      startWidth: 120,
      startHeight: 80,
      deltaX: 20,
      deltaY: 15,
      handle: 'e',
      keepAspect: false,
    }),
    { width: 140, height: 80 }
  )
})

test('sprite index records frame cells and playback metadata', () => {
  const index = buildMultiFrameSpriteIndex({
    canvasWidth: 64,
    canvasHeight: 48,
    columns: 2,
    fps: 12,
    playbackMode: 'pingpong',
    frames: [
      { id: 'a', sourceName: 'idle.png' },
      { id: 'b', sourceName: 'step.png' },
      { id: 'c', sourceName: 'turn.png' },
    ],
  })

  assert.deepEqual(index, {
    version: '1.0',
    frame_size: { w: 64, h: 48 },
    sheet_size: { w: 128, h: 96 },
    fps: 12,
    playbackMode: 'pingpong',
    frames: [
      { i: 0, id: 'a', name: 'idle.png', x: 0, y: 0, w: 64, h: 48, t: 0 },
      { i: 1, id: 'b', name: 'step.png', x: 64, y: 0, w: 64, h: 48, t: 0.083 },
      { i: 2, id: 'c', name: 'turn.png', x: 0, y: 48, w: 64, h: 48, t: 0.167 },
    ],
  })
})

test('hidden frames are skipped for playback and export lists', () => {
  const frames = [
    { id: 'a', hidden: false },
    { id: 'b', hidden: true },
    { id: 'c' },
  ]

  assert.deepEqual(filterVisibleFrames(frames).map((frame) => frame.id), ['a', 'c'])
})

test('frame tag selection supports single range and toggle gestures', () => {
  const ids = ['a', 'b', 'c', 'd']

  const single = applyFrameTagSelection({
    ids,
    currentSelectedIds: [],
    targetId: 'b',
    anchorId: null,
    gesture: 'single',
  })
  assert.deepEqual(single, { selectedIds: ['b'], anchorId: 'b' })

  const range = applyFrameTagSelection({
    ids,
    currentSelectedIds: single.selectedIds,
    targetId: 'd',
    anchorId: single.anchorId,
    gesture: 'range',
  })
  assert.deepEqual(range, { selectedIds: ['b', 'c', 'd'], anchorId: 'b' })

  const toggleOff = applyFrameTagSelection({
    ids,
    currentSelectedIds: range.selectedIds,
    targetId: 'c',
    anchorId: range.anchorId,
    gesture: 'toggle',
  })
  assert.deepEqual(toggleOff, { selectedIds: ['b', 'd'], anchorId: 'c' })
})

test('batch hide only hides selected frames', () => {
  const frames = [
    { id: 'a', hidden: false },
    { id: 'b', hidden: false },
    { id: 'c', hidden: true },
  ]

  assert.deepEqual(batchHideSelectedFrames(frames, ['a', 'c']), [
    { id: 'a', hidden: true },
    { id: 'b', hidden: false },
    { id: 'c', hidden: true },
  ])
})

test('clear frame collection revokes every frame before returning an empty list', () => {
  const revoked: string[] = []
  const frames = [
    { id: 'a', sourceUrl: 'blob:a-source' },
    { id: 'b', sourceUrl: 'blob:b-source' },
  ]

  assert.deepEqual(clearFrameCollection(frames, (frame) => revoked.push(frame.sourceUrl)), [])
  assert.deepEqual(revoked, ['blob:a-source', 'blob:b-source'])
})

test('composed url replacement does not revoke the new url for unrelated frames', () => {
  const revoked: string[] = []
  const frames = [
    { id: 'a', matteRevision: 1, composedUrl: 'blob:old-a' },
    { id: 'b', matteRevision: 2, composedUrl: 'blob:old-b' },
  ]

  const next = applyComposedFrameUrl(frames, {
    id: 'b',
    matteRevision: 2,
    url: 'blob:new-b',
    revoke: (url) => revoked.push(url),
  })

  assert.equal(next[0]?.composedUrl, 'blob:old-a')
  assert.equal(next[1]?.composedUrl, 'blob:new-b')
  assert.deepEqual(revoked, ['blob:old-b'])
})

test('arrow keys move the selected frame on the requested axis', () => {
  assert.deepEqual(computeKeyboardOffset({ offsetX: 0, offsetY: 0 }, 'ArrowRight', false), { offsetX: 1, offsetY: 0 })
  assert.deepEqual(computeKeyboardOffset({ offsetX: 0, offsetY: 0 }, 'ArrowLeft', true), { offsetX: -10, offsetY: 0 })
  assert.deepEqual(computeKeyboardOffset({ offsetX: 4, offsetY: 8 }, 'ArrowUp', false), { offsetX: 4, offsetY: 7 })
  assert.deepEqual(computeKeyboardOffset({ offsetX: 4, offsetY: 8 }, 'KeyA', false), { offsetX: 4, offsetY: 8 })
})

test('mouse wheel resizes the selected frame proportionally', () => {
  assert.deepEqual(computeWheelResize({ width: 100, height: 50 }, -100, false), { width: 110, height: 55 })
  assert.deepEqual(computeWheelResize({ width: 100, height: 50 }, 100, false), { width: 91, height: 45 })
  assert.deepEqual(computeWheelResize({ width: 100, height: 50 }, -100, true), { width: 125, height: 63 })
})

test('layout wheel resize is ignored until wheel scaling is enabled', () => {
  const current = { width: 100, height: 50 }

  assert.equal(computeWheelFrameResize(current, -100, false, false), null)
  assert.deepEqual(computeWheelFrameResize(current, -100, true, false), { width: 110, height: 55 })
  assert.deepEqual(computeWheelFrameResize(current, -100, true, true), { width: 125, height: 63 })
})

test('wheel scaling button label describes the next action', () => {
  assert.equal(getWheelScalingButtonLabel(false), '开放缩放滚轮')
  assert.equal(getWheelScalingButtonLabel(true), '禁止缩放滚轮')
})

test('preview zoom is clamped to a useful detail range', () => {
  assert.equal(clampPreviewZoom(0.1), 0.25)
  assert.equal(clampPreviewZoom(2.345), 2.35)
  assert.equal(clampPreviewZoom(9), 8)
})

test('upload filtering ignores files that already exist or are pending', () => {
  const a = { name: 'a.png', size: 100, lastModified: 1 } as File
  const b = { name: 'b.png', size: 200, lastModified: 2 } as File
  const c = { name: 'c.png', size: 300, lastModified: 3 } as File
  const pending = new Set([`${b.name}-${b.size}-${b.lastModified}`])

  assert.deepEqual(
    filterNewUploadFiles([a, b, c], {
      existingKeys: new Set([`${a.name}-${a.size}-${a.lastModified}`]),
      pendingKeys: pending,
    }),
    [c]
  )
})

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
})

test('matte params can be applied to all following frames without changing earlier frames', () => {
  const frames = [
    {
      id: 'before',
      matte: {
        keyColor: [1, 2, 3] as [number, number, number],
        tolerance: 1,
        smoothness: 2,
        spill: 3,
        erosion: 4,
        spillColorMode: 'green' as const,
        customSpillHex: '#111111',
      },
    },
    {
      id: 'active',
      matte: {
        keyColor: [10, 20, 30] as [number, number, number],
        tolerance: 11,
        smoothness: 22,
        spill: 33,
        erosion: 44,
        spillColorMode: 'custom' as const,
        customSpillHex: '#abcdef',
      },
    },
    {
      id: 'after-a',
      matte: {
        keyColor: [4, 5, 6] as [number, number, number],
        tolerance: 5,
        smoothness: 6,
        spill: 7,
        erosion: 8,
        spillColorMode: 'blue' as const,
        customSpillHex: '#222222',
      },
    },
    {
      id: 'after-b',
      matte: {
        keyColor: [7, 8, 9] as [number, number, number],
        tolerance: 9,
        smoothness: 10,
        spill: 11,
        erosion: 12,
        spillColorMode: 'magenta' as const,
        customSpillHex: '#333333',
      },
    },
  ]

  const result = applyMatteParamsToFollowingFrames(frames, 'active')

  assert.deepEqual(result.recomputeIds, ['after-a', 'after-b'])
  assert.deepEqual(result.frames[0], frames[0])
  assert.deepEqual(result.frames[1], frames[1])
  assert.deepEqual(result.frames[2]?.matte, frames[1]?.matte)
  assert.deepEqual(result.frames[3]?.matte, frames[1]?.matte)
  assert.notEqual(result.frames[2]?.matte.keyColor, frames[1]?.matte.keyColor)
})

test('layout defaults are clamped for saved public parameters', () => {
  assert.deepEqual(coerceLayoutDefaults({}), {
    canvasWidth: 256,
    canvasHeight: 256,
    ratioPercent: 80,
    ratioBasis: 'height',
  })
  assert.deepEqual(coerceLayoutDefaults({
    canvasWidth: 0,
    canvasHeight: 9000,
    ratioPercent: 500,
    ratioBasis: 'width',
  }), {
    canvasWidth: 1,
    canvasHeight: 4096,
    ratioPercent: 300,
    ratioBasis: 'width',
  })
})

