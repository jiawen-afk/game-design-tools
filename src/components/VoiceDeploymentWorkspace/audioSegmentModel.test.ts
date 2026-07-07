import { deepEqual, equal } from 'node:assert/strict'
import { test } from 'node:test'

import {
  addPendingSegment,
  createAudioClipOutputRanges,
  createAudioSegmentRegion,
  deleteAudioSegmentRegion,
  reorderPendingSegments,
  reorderPendingSegmentsAroundTarget,
  resolvePendingPreviewSourceTime,
  resolvePendingPlaybackStep,
  syncPendingSegmentsWithRegions,
  updateAudioSegmentRegion,
} from './audioSegmentModel'

test('creates a selected segment inside the nearest available gap', () => {
  const region = createAudioSegmentRegion({
    id: 'segment-1',
    atSeconds: 1,
    durationSeconds: 5,
    existingRegions: [],
  })

  deepEqual(region, {
    id: 'segment-1',
    startSeconds: 1,
    endSeconds: 4,
  })
})

test('clamps a new segment so it does not overlap the next region', () => {
  const region = createAudioSegmentRegion({
    id: 'segment-2',
    atSeconds: 1,
    durationSeconds: 5,
    existingRegions: [{ id: 'existing', startSeconds: 2, endSeconds: 3 }],
  })

  deepEqual(region, {
    id: 'segment-2',
    startSeconds: 1,
    endSeconds: 2,
  })
})

test('creates a short segment in a 0.01 second available gap', () => {
  const region = createAudioSegmentRegion({
    id: 'segment-short',
    atSeconds: 0,
    durationSeconds: 1,
    existingRegions: [{ id: 'existing', startSeconds: 0.01, endSeconds: 1 }],
  })

  deepEqual(region, {
    id: 'segment-short',
    startSeconds: 0,
    endSeconds: 0.01,
  })
})

test('creates the next available segment when the click is inside an existing region', () => {
  const region = createAudioSegmentRegion({
    id: 'segment-3',
    atSeconds: 2,
    durationSeconds: 8,
    existingRegions: [{ id: 'existing', startSeconds: 1, endSeconds: 4 }],
  })

  deepEqual(region, {
    id: 'segment-3',
    startSeconds: 4,
    endSeconds: 7,
  })
})

test('moves a segment only inside its non-overlapping neighbors', () => {
  const regions = updateAudioSegmentRegion([
    { id: 'a', startSeconds: 0, endSeconds: 1 },
    { id: 'b', startSeconds: 2, endSeconds: 3 },
    { id: 'c', startSeconds: 4, endSeconds: 5 },
  ], 'b', { startSeconds: 0.5, endSeconds: 2.5 }, 6)

  deepEqual(regions, [
    { id: 'a', startSeconds: 0, endSeconds: 1 },
    { id: 'b', startSeconds: 1, endSeconds: 2.5 },
    { id: 'c', startSeconds: 4, endSeconds: 5 },
  ])
})

test('clamps a dragged segment before the next neighbor instead of allowing overlap', () => {
  const regions = updateAudioSegmentRegion([
    { id: 'a', startSeconds: 0, endSeconds: 1 },
    { id: 'b', startSeconds: 2, endSeconds: 3 },
    { id: 'c', startSeconds: 4, endSeconds: 5 },
  ], 'b', { startSeconds: 4.2, endSeconds: 5.2 }, 6)

  deepEqual(regions, [
    { id: 'a', startSeconds: 0, endSeconds: 1 },
    { id: 'b', startSeconds: 3, endSeconds: 4 },
    { id: 'c', startSeconds: 4, endSeconds: 5 },
  ])
})

test('clamps a dragged segment after the previous neighbor instead of allowing overlap', () => {
  const regions = updateAudioSegmentRegion([
    { id: 'a', startSeconds: 0, endSeconds: 1 },
    { id: 'b', startSeconds: 2, endSeconds: 3 },
    { id: 'c', startSeconds: 4, endSeconds: 5 },
  ], 'b', { startSeconds: -0.2, endSeconds: 0.8 }, 6)

  deepEqual(regions, [
    { id: 'a', startSeconds: 0, endSeconds: 1 },
    { id: 'b', startSeconds: 1, endSeconds: 2 },
    { id: 'c', startSeconds: 4, endSeconds: 5 },
  ])
})

test('does not add the same region to pending twice', () => {
  const regions = [{ id: 'a', startSeconds: 0, endSeconds: 1 }]
  const first = addPendingSegment([], regions, 'a')
  const second = addPendingSegment(first, regions, 'a')

  deepEqual(second, [{ regionId: 'a', startSeconds: 0, endSeconds: 1 }])
})

test('keeps pending items synced with changed and deleted regions', () => {
  const pending = [
    { regionId: 'a', startSeconds: 0, endSeconds: 1 },
    { regionId: 'b', startSeconds: 2, endSeconds: 3 },
  ]
  const next = syncPendingSegmentsWithRegions(pending, [
    { id: 'b', startSeconds: 2.5, endSeconds: 3.5 },
  ])

  deepEqual(next, [{ regionId: 'b', startSeconds: 2.5, endSeconds: 3.5 }])
})

test('reorders pending segments by drag indexes', () => {
  const pending = [
    { regionId: 'a', startSeconds: 0, endSeconds: 1 },
    { regionId: 'b', startSeconds: 1, endSeconds: 2 },
    { regionId: 'c', startSeconds: 2, endSeconds: 3 },
  ]

  deepEqual(reorderPendingSegments(pending, 0, 2).map((item) => item.regionId), ['b', 'c', 'a'])
  equal(deleteAudioSegmentRegion([{ id: 'a', startSeconds: 0, endSeconds: 1 }], 'a').length, 0)
})

test('creates export ranges from pending segments in pending-list order', () => {
  deepEqual(createAudioClipOutputRanges([
    { regionId: 'late', startSeconds: 10, endSeconds: 11 },
    { regionId: 'early', startSeconds: 1, endSeconds: 2 },
    { regionId: 'middle', startSeconds: 5, endSeconds: 6 },
  ]), [
    { startSeconds: 10, endSeconds: 11 },
    { startSeconds: 1, endSeconds: 2 },
    { startSeconds: 5, endSeconds: 6 },
  ])
})

test('reorders pending segments around a target segment placement', () => {
  const pending = [
    { regionId: 'a', startSeconds: 0, endSeconds: 1 },
    { regionId: 'b', startSeconds: 1, endSeconds: 2 },
    { regionId: 'c', startSeconds: 2, endSeconds: 3 },
    { regionId: 'd', startSeconds: 3, endSeconds: 4 },
  ]

  deepEqual(
    reorderPendingSegmentsAroundTarget(pending, 'a', 'c', 'after').map((item) => item.regionId),
    ['b', 'c', 'a', 'd'],
  )
  deepEqual(
    reorderPendingSegmentsAroundTarget(pending, 'd', 'b', 'before').map((item) => item.regionId),
    ['a', 'd', 'b', 'c'],
  )
  deepEqual(
    reorderPendingSegmentsAroundTarget(pending, 'a', 'missing', 'before'),
    pending,
  )
})

test('resolves pending playback by pending order instead of source timeline order', () => {
  const pending = [
    { regionId: 'late', startSeconds: 10, endSeconds: 11 },
    { regionId: 'early', startSeconds: 1, endSeconds: 2 },
    { regionId: 'middle', startSeconds: 5, endSeconds: 6 },
  ]

  deepEqual(
    resolvePendingPlaybackStep(pending, { active: true, index: 0, loop: false }, 11.01),
    { action: 'play', index: 1 },
  )
  deepEqual(
    resolvePendingPlaybackStep(pending, { active: true, index: 2, loop: true }, 6.01),
    { action: 'play', index: 0 },
  )
  deepEqual(
    resolvePendingPlaybackStep(pending, { active: true, index: 2, loop: false }, 6.01),
    { action: 'stop', seekSeconds: 6 },
  )
  deepEqual(
    resolvePendingPlaybackStep(pending, { active: true, index: 1, loop: false }, 1.5),
    { action: 'continue' },
  )
})

test('maps rendered pending preview time back to source waveform time', () => {
  const pending = [
    { regionId: 'late', startSeconds: 10, endSeconds: 11 },
    { regionId: 'early', startSeconds: 1, endSeconds: 3 },
  ]

  equal(resolvePendingPreviewSourceTime(pending, 0), 10)
  equal(resolvePendingPreviewSourceTime(pending, 0.4), 10.4)
  equal(resolvePendingPreviewSourceTime(pending, 1), 11)
  equal(resolvePendingPreviewSourceTime(pending, 1.25), 1.25)
  equal(resolvePendingPreviewSourceTime(pending, 2.9), 2.9)
  equal(resolvePendingPreviewSourceTime(pending, 3.2), 3)
  equal(resolvePendingPreviewSourceTime([], 0.5), null)
})

test('resolves pending playback stop with the exact segment end time', () => {
  const pending = [
    { regionId: 'clip-a', startSeconds: 0, endSeconds: 1 },
    { regionId: 'clip-b', startSeconds: 4, endSeconds: 6 },
  ]

  deepEqual(
    resolvePendingPlaybackStep(pending, { active: true, index: 1, loop: false }, 6.18),
    { action: 'stop', seekSeconds: 6 },
  )
})

test('waits for non-linear pending playback seeks before evaluating segment end', () => {
  const pending = [
    { regionId: 'late', startSeconds: 10, endSeconds: 11 },
    { regionId: 'early', startSeconds: 1, endSeconds: 2 },
  ]

  deepEqual(
    resolvePendingPlaybackStep(
      pending,
      { active: true, index: 1, loop: false, seekingToSeconds: 1 },
      11.02,
    ),
    { action: 'continue' },
  )
  deepEqual(
    resolvePendingPlaybackStep(
      pending,
      { active: true, index: 1, loop: false, seekingToSeconds: 1 },
      1.02,
    ),
    { action: 'continue', seekSettled: true },
  )
  deepEqual(
    resolvePendingPlaybackStep(pending, { active: true, index: 1, loop: false }, 2.02),
    { action: 'stop', seekSeconds: 2 },
  )
})
