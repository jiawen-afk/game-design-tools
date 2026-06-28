import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  getGuideEmptyStateText,
  getGuideLineEdgeStartPosition,
  getGuideRulerCursor,
  getGuideRulerDragAxis,
  getGuideRulerLabel,
  normalizeGuideLinePosition,
  shouldIgnoreInitialGuideDrag,
} from './model'

test('guide line positions clamp to canvas and delete at the origin', () => {
  assert.equal(normalizeGuideLinePosition(-4, 256), null)
  assert.equal(normalizeGuideLinePosition(0, 256), null)
  assert.equal(normalizeGuideLinePosition(120.6, 256), 121)
  assert.equal(normalizeGuideLinePosition(999, 256), 256)
})

test('ruler drag guide lines start from the canvas edge', () => {
  assert.equal(getGuideLineEdgeStartPosition(), 1)
})

test('initial ruler drags are ignored until the pointer reaches the canvas', () => {
  assert.equal(shouldIgnoreInitialGuideDrag(-4, 256, false), true)
  assert.equal(shouldIgnoreInitialGuideDrag(0, 256, false), true)
  assert.equal(shouldIgnoreInitialGuideDrag(120, 256, false), false)
  assert.equal(shouldIgnoreInitialGuideDrag(-4, 256, true), false)
})

test('guide ruler labels describe the axis users can drag from', () => {
  assert.equal(getGuideRulerLabel('x'), 'X 轴')
  assert.equal(getGuideRulerLabel('y'), 'Y 轴')
})

test('guide rulers create lines in the drag direction users expect', () => {
  assert.equal(getGuideRulerDragAxis('x'), 'y')
  assert.equal(getGuideRulerDragAxis('y'), 'x')
  assert.equal(getGuideRulerCursor('x'), 'ns-resize')
  assert.equal(getGuideRulerCursor('y'), 'ew-resize')
})

test('layout toolbar relies on rulers instead of guide add buttons', () => {
  const toolbar = readFileSync('src/components/MultiFrameSpriteWorkspace/LayoutWorkspaceToolbar.tsx', 'utf8')
  assert.doesNotMatch(toolbar, /getGuideActionLabel/)
  assert.doesNotMatch(toolbar, /添加竖向辅助线/)
  assert.doesNotMatch(toolbar, /添加横向辅助线/)
  assert.match(toolbar, /清空辅助线/)
})

test('guide empty state explains rulers are available before upload', () => {
  assert.equal(getGuideEmptyStateText(), '从顶部或左侧标尺添加辅助线。请先上传图片开始调整。')
})
