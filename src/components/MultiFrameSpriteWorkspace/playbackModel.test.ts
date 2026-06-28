import test from 'node:test'
import assert from 'node:assert/strict'

import {
  advancePlaybackCursor,
  applyFrameTagSelection,
  applyFrameVisibilityStride,
  batchHideSelectedFrames,
  buildPlaybackFrameIds,
  clearFrameCollection,
  countPlayableFrames,
  filterLivePlaybackFrameIds,
  filterVisibleFrames,
} from './playbackModel'

test('hidden frames are skipped for playback and export lists', () => {
  const frames = [
    { id: 'a', hidden: false },
    { id: 'b', hidden: true },
    { id: 'c' },
  ]

  assert.deepEqual(filterVisibleFrames(frames).map((frame) => frame.id), ['a', 'c'])
})

test('playback frame ids are snapshotted from visible composed frames', () => {
  const frames = [
    { id: 'a', hidden: false, composedUrl: 'blob:a' },
    { id: 'b', hidden: false, composedUrl: null },
    { id: 'c', hidden: true, composedUrl: 'blob:c' },
    { id: 'd', hidden: false, composedUrl: 'blob:d' },
  ]

  assert.deepEqual(buildPlaybackFrameIds(frames), ['a', 'd'])
  assert.deepEqual(buildPlaybackFrameIds(frames, ['d', 'a', 'missing']), ['a', 'd'])
})

test('live playback helpers avoid repeated scans during playback', () => {
  const frames = [
    { id: 'a', hidden: false, composedUrl: 'blob:a' },
    { id: 'b', hidden: true, composedUrl: 'blob:b' },
    { id: 'c', hidden: false, composedUrl: null },
    { id: 'd', hidden: false, composedUrl: 'blob:d' },
  ]

  assert.equal(countPlayableFrames(frames), 2)
  assert.deepEqual(filterLivePlaybackFrameIds(frames, ['d', 'b', 'missing', 'a']), ['d', 'a'])
})

test('playback cursor advances loop and pingpong modes', () => {
  assert.deepEqual(advancePlaybackCursor(0, 3, 'loop', 1), { index: 1, direction: 1 })
  assert.deepEqual(advancePlaybackCursor(2, 3, 'loop', 1), { index: 0, direction: 1 })
  assert.deepEqual(advancePlaybackCursor(1, 3, 'pingpong', 1), { index: 2, direction: 1 })
  assert.deepEqual(advancePlaybackCursor(2, 3, 'pingpong', 1), { index: 1, direction: -1 })
  assert.deepEqual(advancePlaybackCursor(0, 3, 'pingpong', -1), { index: 1, direction: 1 })
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

test('frame visibility stride keeps the first frame in each group and hides the rest', () => {
  const frames = [
    { id: 'a', hidden: true },
    { id: 'b', hidden: false },
    { id: 'c', hidden: false },
    { id: 'd', hidden: false },
    { id: 'e', hidden: true },
    { id: 'f', hidden: false },
  ]

  assert.deepEqual(applyFrameVisibilityStride(frames, 1), [
    { id: 'a', hidden: false },
    { id: 'b', hidden: false },
    { id: 'c', hidden: false },
    { id: 'd', hidden: false },
    { id: 'e', hidden: false },
    { id: 'f', hidden: false },
  ])
  assert.deepEqual(applyFrameVisibilityStride(frames, 2), [
    { id: 'a', hidden: false },
    { id: 'b', hidden: true },
    { id: 'c', hidden: false },
    { id: 'd', hidden: true },
    { id: 'e', hidden: false },
    { id: 'f', hidden: true },
  ])
  assert.deepEqual(applyFrameVisibilityStride(frames, 3), [
    { id: 'a', hidden: false },
    { id: 'b', hidden: true },
    { id: 'c', hidden: true },
    { id: 'd', hidden: false },
    { id: 'e', hidden: true },
    { id: 'f', hidden: true },
  ])
  assert.deepEqual(applyFrameVisibilityStride(frames, 4), [
    { id: 'a', hidden: false },
    { id: 'b', hidden: true },
    { id: 'c', hidden: true },
    { id: 'd', hidden: true },
    { id: 'e', hidden: false },
    { id: 'f', hidden: true },
  ])
  assert.deepEqual(applyFrameVisibilityStride(frames, 99), applyFrameVisibilityStride(frames, 4))
  assert.deepEqual(applyFrameVisibilityStride(frames, 0), applyFrameVisibilityStride(frames, 1))
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
