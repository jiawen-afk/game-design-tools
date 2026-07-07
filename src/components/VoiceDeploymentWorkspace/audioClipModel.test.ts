import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createAudioClipSourceFromSoundEffectRecord,
  createAudioClipSourceFromVoiceRecord,
  createDefaultAudioClipName,
  createSoundEffectClipRecord,
  createVoiceClipRecord,
  formatAudioClipTime,
  isValidAudioClipRange,
  normalizeAudioClipRange,
} from './audioClipModel'
import type { SoundEffectRecord } from './soundEffectModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'

const voiceRecord: VoiceGenerationRecord = {
  id: 'voice-1',
  name: '旁白',
  createdAt: '2026-07-07T00:00:00.000Z',
  audioUrl: 'file:///voice.wav',
  audioPath: 'D:\\voice.wav',
  params: {
    mode: 'blind-box',
    text: '你好',
    controlInstruction: '',
    promptText: '',
    referenceAudioName: '',
    referenceAudioPath: null,
    advanced: { cfgValue: 2, normalize: false, denoise: false, ditSteps: 10 },
  },
}

const soundRecord: SoundEffectRecord = {
  id: 'sound-1',
  name: '挥剑',
  createdAt: '2026-07-07T00:00:00.000Z',
  audioUrl: 'file:///sound.wav',
  audioPath: 'D:\\sound.wav',
  prompt: 'sword slash',
  durationSeconds: 6,
  seed: 42,
  model: 'small-sfx',
}

test('normalizes clip ranges into source duration bounds', () => {
  assert.deepEqual(normalizeAudioClipRange({ startSeconds: -2, endSeconds: 99 }, 12), {
    startSeconds: 0,
    endSeconds: 12,
  })
  assert.deepEqual(normalizeAudioClipRange({ startSeconds: 8, endSeconds: 3 }, 12), {
    startSeconds: 3,
    endSeconds: 8,
  })
})

test('rejects selected ranges shorter than the minimum clip duration', () => {
  assert.equal(isValidAudioClipRange({ startSeconds: 1, endSeconds: 1.01 }), false)
  assert.equal(isValidAudioClipRange({ startSeconds: 1, endSeconds: 1.08 }), true)
})

test('formats clip times as minute second millisecond labels', () => {
  assert.equal(formatAudioClipTime(65.432), '01:05.432')
})

test('derives default clip output names from source records', () => {
  assert.equal(createDefaultAudioClipName({ sourceKind: 'voice', record: voiceRecord }), '旁白 剪辑')
  assert.equal(createDefaultAudioClipName({ sourceKind: 'sound-effect', record: soundRecord }), '挥剑 剪辑')
})

test('creates voice clip records with preserved voice params and saved audio refs', () => {
  const clipped = createVoiceClipRecord({
    source: { sourceKind: 'voice', record: voiceRecord },
    name: '旁白短句',
    range: { startSeconds: 1, endSeconds: 2.5 },
    savedAudio: { audioUrl: 'file:///clip.wav', audioPath: 'D:\\clip.wav' },
    now: () => '2026-07-07T01:00:00.000Z',
    createId: () => 'clip-voice-1',
  })

  assert.equal(clipped.id, 'clip-voice-1')
  assert.equal(clipped.name, '旁白短句')
  assert.equal(clipped.audioUrl, 'file:///clip.wav')
  assert.equal(clipped.audioPath, 'D:\\clip.wav')
  assert.deepEqual(clipped.params, voiceRecord.params)
})

test('creates sound effect clip records with preserved generation metadata and clipped duration', () => {
  const clipped = createSoundEffectClipRecord({
    source: { sourceKind: 'sound-effect', record: soundRecord },
    name: '挥剑短响',
    range: { startSeconds: 1, endSeconds: 2.25 },
    savedAudio: { audioUrl: 'file:///clip.wav', audioPath: 'D:\\clip.wav' },
    now: () => '2026-07-07T01:00:00.000Z',
    createId: () => 'clip-sound-1',
  })

  assert.equal(clipped.id, 'clip-sound-1')
  assert.equal(clipped.name, '挥剑短响')
  assert.equal(clipped.durationSeconds, 1.25)
  assert.equal(clipped.prompt, soundRecord.prompt)
  assert.equal(clipped.seed, soundRecord.seed)
  assert.equal(clipped.model, soundRecord.model)
})

test('creates editor sources from voice and sound effect records', () => {
  assert.deepEqual(createAudioClipSourceFromVoiceRecord(voiceRecord), {
    sourceKind: 'voice',
    record: voiceRecord,
  })
  assert.deepEqual(createAudioClipSourceFromSoundEffectRecord(soundRecord), {
    sourceKind: 'sound-effect',
    record: soundRecord,
  })
})
