import test from 'node:test'
import assert from 'node:assert/strict'

import { scheduleStoryboardVoiceStarts } from './projectStoryboardPlayback'

test('storyboard scheduler delays or overlaps entries using microsecond offsets', () => {
  const schedule = scheduleStoryboardVoiceStarts([
    { id: 'a', durationUs: 1_000_000, startOffsetUs: 0 },
    { id: 'b', durationUs: 800_000, startOffsetUs: -200_000 },
    { id: 'c', durationUs: 500_000, startOffsetUs: 300_000 },
  ])

  assert.deepEqual(schedule, [
    { id: 'a', startAtUs: 0, endAtUs: 1_000_000 },
    { id: 'b', startAtUs: 800_000, endAtUs: 1_600_000 },
    { id: 'c', startAtUs: 1_900_000, endAtUs: 2_400_000 },
  ])
})

test('storyboard scheduler clamps negative starts but keeps later offsets relative to previous end', () => {
  const schedule = scheduleStoryboardVoiceStarts([
    { id: 'a', durationUs: 1_000_000.8, startOffsetUs: -2_000_000 },
    { id: 'b', durationUs: -500, startOffsetUs: -200_000 },
    { id: 'c', durationUs: 250_000, startOffsetUs: 100_000.9 },
  ])

  assert.deepEqual(schedule, [
    { id: 'a', startAtUs: 0, endAtUs: 1_000_000 },
    { id: 'b', startAtUs: 800_000, endAtUs: 800_000 },
    { id: 'c', startAtUs: 900_000, endAtUs: 1_150_000 },
  ])
})
