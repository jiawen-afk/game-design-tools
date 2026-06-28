import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyWheelZoom,
  getAnchoredWheelZoomTransform,
  getPreviewAnchorFromStagePoint,
  MAX_PREVIEW_ZOOM,
  MIN_PREVIEW_ZOOM,
  PREVIEW_ZOOM_STEP,
} from './imageProcessingModel'

test('image processing workspace zooms with mouse wheel and clamps the result', () => {
  assert.equal(applyWheelZoom(1, -120), 1 + PREVIEW_ZOOM_STEP)
  assert.equal(applyWheelZoom(1, 120), 1 - PREVIEW_ZOOM_STEP)
  assert.equal(applyWheelZoom(MIN_PREVIEW_ZOOM, 120), MIN_PREVIEW_ZOOM)
  assert.equal(applyWheelZoom(MAX_PREVIEW_ZOOM, -120), MAX_PREVIEW_ZOOM)
})

test('image processing workspace anchors wheel zoom around the pointer', () => {
  const pointer = { x: 200, y: 100 }
  const firstPan = {
    x: -pointer.x * PREVIEW_ZOOM_STEP,
    y: -pointer.y * PREVIEW_ZOOM_STEP,
  }

  assert.deepEqual(
    getAnchoredWheelZoomTransform(1, { x: 0, y: 0 }, -120, pointer),
    { zoom: 1 + PREVIEW_ZOOM_STEP, pan: firstPan }
  )
  assert.deepEqual(
    getAnchoredWheelZoomTransform(1 + PREVIEW_ZOOM_STEP, firstPan, 120, pointer),
    { zoom: 1, pan: { x: 0, y: 0 } }
  )
})

test('image processing workspace keeps the same image point under the pointer after repeated anchored zooms', () => {
  const pointerFromImageCenter = { x: 200, y: 100 }
  const first = getAnchoredWheelZoomTransform(1, { x: 0, y: 0 }, -120, pointerFromImageCenter)
  const second = getAnchoredWheelZoomTransform(
    first.zoom,
    first.pan,
    -120,
    pointerFromImageCenter
  )

  assert.equal(second.zoom, 1 + PREVIEW_ZOOM_STEP * 2)
  assert.deepEqual(second.pan, {
    x: -pointerFromImageCenter.x * PREVIEW_ZOOM_STEP * 2,
    y: -pointerFromImageCenter.y * PREVIEW_ZOOM_STEP * 2,
  })
})

test('image processing workspace derives wheel anchor from the untransformed preview rect', () => {
  assert.deepEqual(
    getPreviewAnchorFromStagePoint(
      { x: 520, y: 260 },
      { x: 100, y: 40, width: 640, height: 360 }
    ),
    { x: 100, y: 40 }
  )
})

test('image processing workspace keeps zoom changes bounded for repeated wheel input', () => {
  let zoom = 1
  const zoomInCount = Math.ceil((MAX_PREVIEW_ZOOM - zoom) / PREVIEW_ZOOM_STEP) + 1
  for (let i = 0; i < zoomInCount; i += 1) {
    zoom = applyWheelZoom(zoom, -120)
  }
  assert.equal(zoom, MAX_PREVIEW_ZOOM)
  const zoomOutCount = Math.ceil((MAX_PREVIEW_ZOOM - MIN_PREVIEW_ZOOM) / PREVIEW_ZOOM_STEP) + 1
  for (let i = 0; i < zoomOutCount; i += 1) {
    zoom = applyWheelZoom(zoom, 120)
  }
  assert.equal(zoom, MIN_PREVIEW_ZOOM)
})
