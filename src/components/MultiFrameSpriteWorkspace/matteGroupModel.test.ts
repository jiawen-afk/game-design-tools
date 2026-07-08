import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyMatteParamsToFrameGroup,
  buildMatteFrameGroups,
  getInitialMatteFrameIds,
  getNextMatteGroupName,
  resolveMatteGroupFrameSelection,
  removeMatteFrameGroup,
} from './model'

test('initial matte processing primes the first frame for every import group', () => {
  assert.deepEqual(getInitialMatteFrameIds({ existingFrameCount: 0, createdIds: ['a', 'b', 'c'] }), ['a'])
  assert.deepEqual(getInitialMatteFrameIds({ existingFrameCount: 3, createdIds: ['d', 'e'] }), ['d'])
  assert.deepEqual(getInitialMatteFrameIds({ existingFrameCount: 0, createdIds: [] }), [])
})

test('matte import groups are named by import order and source type', () => {
  const frames = [
    { id: 'a', matteGroupId: 'g1', matteGroupName: '1-视频处理' },
    { id: 'b', matteGroupId: 'g1', matteGroupName: '1-视频处理' },
    { id: 'c', matteGroupId: 'g2', matteGroupName: '2-精灵图处理' },
  ]

  assert.equal(getNextMatteGroupName(frames, 'video'), '3-视频处理')
  assert.equal(getNextMatteGroupName(frames, 'spriteSheet'), '3-精灵图处理')
  assert.equal(getNextMatteGroupName(frames, 'imageBatch'), '3-批量图片')
  assert.equal(
    getNextMatteGroupName([{ matteGroupId: 'g9', matteGroupName: '9-批量图片' }], 'video'),
    '10-视频处理'
  )
})

test('matte workspace shows the first frame of each import group', () => {
  const frames = [
    { id: 'a', matteGroupId: 'g1', matteGroupName: '1-视频处理' },
    { id: 'b', matteGroupId: 'g1', matteGroupName: '1-视频处理' },
    { id: 'c', matteGroupId: 'g2', matteGroupName: '2-精灵图处理' },
    { id: 'd', matteGroupId: 'g2', matteGroupName: '2-精灵图处理' },
  ]

  const groups = buildMatteFrameGroups(frames)

  assert.deepEqual(groups.map((group) => group.name), ['1-视频处理', '2-精灵图处理'])
  assert.deepEqual(groups.map((group) => group.firstFrame.id), ['a', 'c'])
  assert.deepEqual(groups.map((group) => group.frameCount), [2, 2])
})

test('matte workspace can select a preview frame within each import group', () => {
  const frames = [
    { id: 'a', matteGroupId: 'g1', matteGroupName: '1-精灵图处理' },
    { id: 'b', matteGroupId: 'g1', matteGroupName: '1-精灵图处理' },
    { id: 'c', matteGroupId: 'g1', matteGroupName: '1-精灵图处理' },
  ]
  const [group] = buildMatteFrameGroups(frames)

  assert.equal(resolveMatteGroupFrameSelection(group!, 1).frame.id, 'b')
  assert.equal(resolveMatteGroupFrameSelection(group!, 1).frameNumber, 2)
  assert.equal(resolveMatteGroupFrameSelection(group!, 1).canPrevious, true)
  assert.equal(resolveMatteGroupFrameSelection(group!, 1).canNext, true)
  assert.equal(resolveMatteGroupFrameSelection(group!, 99).frame.id, 'a')
  assert.equal(resolveMatteGroupFrameSelection(group!, -1).frame.id, 'a')
})

test('matte group removal deletes every frame in the import group', () => {
  const frames = [
    { id: 'a', matteGroupId: 'g1', matteGroupName: '1-批量图片' },
    { id: 'b', matteGroupId: 'g1', matteGroupName: '1-批量图片' },
    { id: 'c', matteGroupId: 'g2', matteGroupName: '2-精灵图处理' },
  ]

  assert.deepEqual(removeMatteFrameGroup(frames, 'g1'), [frames[2]])
  assert.equal(removeMatteFrameGroup(frames, 'missing'), frames)
})

test('matte params apply only to frames in the same import group', () => {
  const sourceMatte = {
    keyColor: [1, 2, 3] as [number, number, number],
    tolerance: 30,
    smoothness: 40,
    spill: 50,
    spillColorMode: 'custom' as const,
    customSpillHex: '#123456',
    erosion: 2,
  }
  const otherMatte = {
    ...sourceMatte,
    keyColor: [9, 9, 9] as [number, number, number],
    tolerance: 9,
  }
  const frames = [
    { id: 'a', matteGroupId: 'g1', matte: sourceMatte },
    { id: 'b', matteGroupId: 'g1', matte: otherMatte },
    { id: 'c', matteGroupId: 'g2', matte: otherMatte },
  ]

  const result = applyMatteParamsToFrameGroup(frames, 'a')

  assert.deepEqual(result.recomputeIds, ['a', 'b'])
  assert.deepEqual(result.frames[1]?.matte, sourceMatte)
  assert.deepEqual(result.frames[2]?.matte, otherMatte)
})
