import test from 'node:test'
import assert from 'node:assert/strict'

import type { StoryboardGroup } from './personalSpaceModel'
import {
  orderedStoryboardVoiceAssetIds,
  storyboardVoiceEntriesForPreview,
} from './storyboardVoiceDrag'

const storyboard: StoryboardGroup = {
  id: 'story-1',
  name: '开场',
  characterIds: [],
  voiceAssetIds: ['voice-a', 'voice-b', 'voice-c'],
  voiceEntries: [
    { assetId: 'voice-b', text: '第二句', startOffsetUs: 0, order: 1 },
    { assetId: 'voice-a', text: '第一句', startOffsetUs: 0, order: 0 },
    { assetId: 'voice-c', text: '第三句', startOffsetUs: 0, order: 2 },
  ],
}

test('storyboard voice drag helpers derive stable ordered asset ids', () => {
  assert.deepEqual(orderedStoryboardVoiceAssetIds(storyboard), ['voice-a', 'voice-b', 'voice-c'])
  assert.deepEqual(orderedStoryboardVoiceAssetIds(undefined), [])
})

test('storyboard voice preview entries follow preview order and ignore stale ids', () => {
  const visibleEntries = storyboardVoiceEntriesForPreview(storyboard, ['voice-c', 'voice-missing', 'voice-a'])

  assert.deepEqual(visibleEntries.map((entry) => entry.assetId), ['voice-c', 'voice-a'])
})

test('storyboard voice preview entries fall back to stored order', () => {
  const visibleEntries = storyboardVoiceEntriesForPreview(storyboard)

  assert.deepEqual(visibleEntries.map((entry) => entry.assetId), ['voice-a', 'voice-b', 'voice-c'])
})
