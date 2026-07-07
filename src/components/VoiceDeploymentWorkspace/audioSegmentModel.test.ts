import { deepEqual, equal } from 'node:assert/strict'
import { test } from 'node:test'

import {
  addPendingSegment,
  createAudioSegmentRegion,
  deleteAudioSegmentRegion,
  reorderPendingSegments,
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
