import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getKodoObject,
  kodoProfile,
  validPayload,
} from './projectKodoStorageTestHelpers.test'

test('kodo object reads return object bytes and mime type', async () => {
  const events: string[] = []

  const result = await getKodoObject(kodoProfile(validPayload), 'objects/默认项目/audio_wav/r1.wav', {
    createClient: async () => ({
      statObject: async (objectKey) => {
        events.push(`stat:${objectKey}`)
        return { mimeType: 'audio/wav' }
      },
      getObject: async (objectKey) => {
        events.push(`get:${objectKey}`)
        return Buffer.from('voice')
      },
    }),
  })

  assert.equal(result.mimeType, 'audio/wav')
  assert.equal(result.data.toString('utf8'), 'voice')
  assert.deepEqual(events, [
    'stat:objects/默认项目/audio_wav/r1.wav',
    'get:objects/默认项目/audio_wav/r1.wav',
  ])
})
