import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildStableAudioGeneratePayload,
  clampSoundDuration,
  createSoundEffectRecordName,
  defaultSoundEffectParams,
  defaultStableAudioPort,
  stableAudioModels,
} from './soundEffectModel'

test('stable audio model metadata describes the three supported models', () => {
  assert.deepEqual(stableAudioModels.map((model) => model.id), ['small-sfx', 'small-music', 'medium'])
  assert.equal(stableAudioModels.find((model) => model.id === 'small-sfx')?.recommendedUse, '游戏音效、环境声、foley、UI 音')
  assert.equal(stableAudioModels.find((model) => model.id === 'small-music')?.hardware, 'CPU / 轻量设备')
  assert.equal(stableAudioModels.find((model) => model.id === 'medium')?.maxDurationSeconds, 380)
})

test('sound effect defaults prefer small-sfx on port 8818', () => {
  assert.equal(defaultStableAudioPort, 8818)
  assert.equal(defaultSoundEffectParams.model, 'small-sfx')
  assert.equal(defaultSoundEffectParams.durationSeconds, 6)
})

test('duration clamps to the selected model limits', () => {
  assert.equal(clampSoundDuration('small-sfx', 180), 120)
  assert.equal(clampSoundDuration('small-music', 0), 1)
  assert.equal(clampSoundDuration('medium', 500), 380)
})

test('builds stable audio generate payload from params', () => {
  const payload = buildStableAudioGeneratePayload({
    ...defaultSoundEffectParams,
    prompt: 'short magical pickup chime',
    durationSeconds: 8.4,
    seed: 42,
    outputName: 'pickup chime',
  })

  assert.deepEqual(payload, {
    prompt: 'short magical pickup chime',
    durationSeconds: 8,
    seed: 42,
    outputName: 'pickup chime',
  })
})

test('creates concise sound effect record names', () => {
  assert.equal(createSoundEffectRecordName({
    ...defaultSoundEffectParams,
    prompt: 'heavy stone door opening with dust',
  }, 3), '音效 3 · heavy stone')
})
