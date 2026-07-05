import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clampPreviewZoom,
  coerceFrameLayoutPatch,
  computeHandleResize,
  computeKeyboardOffset,
  computePointerCanvasDelta,
  computeWheelFrameResize,
  computeWheelResize,
  getLayoutFramePreviewUrl,
  getLayoutFrameSilhouettePreviewLayers,
  getWheelScalingButtonLabel,
  shouldStopLayoutDragFromPointer,
} from './model'

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

test('frame layout patches drop non-finite drag geometry before render state updates', () => {
  assert.deepEqual(
    coerceFrameLayoutPatch({
      width: Number.NaN,
      height: Number.POSITIVE_INFINITY,
      offsetX: Number.NEGATIVE_INFINITY,
      offsetY: 12.6,
    }),
    { offsetY: 13 }
  )
  assert.deepEqual(coerceFrameLayoutPatch({ width: 0.2, height: 6.4, offsetX: -3.2 }), {
    width: 1,
    height: 6,
    offsetX: -3,
  })
})

test('pointer drag deltas are converted from rendered canvas pixels to logical canvas pixels', () => {
  assert.deepEqual(
    computePointerCanvasDelta({
      startClientX: 50,
      startClientY: 80,
      clientX: 75,
      clientY: 110,
      canvasRect: { width: 500, height: 300 },
      canvasWidth: 1000,
      canvasHeight: 600,
    }),
    { x: 50, y: 60 }
  )
})

test('layout drag stops when a mouse pointer no longer has a pressed button', () => {
  assert.equal(shouldStopLayoutDragFromPointer({ pointerType: 'mouse', buttons: 0 }), true)
  assert.equal(shouldStopLayoutDragFromPointer({ pointerType: 'mouse', buttons: 1 }), false)
  assert.equal(shouldStopLayoutDragFromPointer({ pointerType: 'touch', buttons: 0 }), false)
})

test('layout frame adjustment previews the matte frame and derives style layers for strokes', () => {
  assert.equal(
    getLayoutFramePreviewUrl({ matteUrl: 'blob:matte', composedUrl: 'blob:composed' }),
    'blob:matte'
  )
  assert.equal(
    getLayoutFramePreviewUrl({ matteUrl: null, composedUrl: 'blob:composed' }),
    undefined
  )

  const layers = getLayoutFrameSilhouettePreviewLayers({
    strokeColor: '#ff3300',
    strokeWidth: 1,
    outlineColor: '#101820',
    outlineWidth: 2,
  })

  assert.equal(layers.length, 32)
  assert.equal(layers.filter((layer) => layer.kind === 'outline').length, 24)
  assert.equal(layers.filter((layer) => layer.kind === 'stroke').length, 8)
  assert.deepEqual(layers[0], { kind: 'outline', id: 'outline-1-1-0', color: '#101820', offsetX: 1, offsetY: 0 })
  assert.deepEqual(layers[23], { kind: 'outline', id: 'outline-3--3--3', color: '#101820', offsetX: -3, offsetY: -3 })
  assert.deepEqual(layers[24], { kind: 'stroke', id: 'stroke-1-1-0', color: '#ff3300', offsetX: 1, offsetY: 0 })
})

test('layout frame style preview omits zero-width stroke and outline layers', () => {
  assert.deepEqual(
    getLayoutFrameSilhouettePreviewLayers({
      strokeColor: '#ff3300',
      strokeWidth: 0,
      outlineColor: '#101820',
      outlineWidth: 0,
    }),
    []
  )
})
