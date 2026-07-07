import test from 'node:test'
import assert from 'node:assert/strict'

import { createAudioClipSourceFromImportedFile } from './audioClipModel'
import { exportAudioClip, saveAudioClip } from './audioClipService'
import { concatPcmAudioRanges, type PcmAudioData } from './audioClipEncoding'
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

const soundEffectRecord: SoundEffectRecord = {
  id: 'sound-1',
  name: 'Hit',
  createdAt: '2026-07-07T00:00:00.000Z',
  audioUrl: 'file:///sound.wav',
  audioPath: null,
  prompt: 'hit',
  durationSeconds: 6,
  seed: 1,
  model: 'small-sfx',
}

function readWavInt16Samples(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const byteLength = view.getUint32(40, true)
  return Array.from({ length: byteLength / 2 }, (_, index) => view.getInt16(44 + index * 2, true))
}

test('concatenates pcm ranges in pending-list order', () => {
  const result = concatPcmAudioRanges({
    sampleRate: 10,
    channelData: [new Float32Array([0, 1, 2, 3, 4, 5])],
  }, [
    { startSeconds: 0.3, endSeconds: 0.5 },
    { startSeconds: 0.1, endSeconds: 0.2 },
  ])

  assert.deepEqual(Array.from(result.channelData[0]), [3, 4, 1])
  assert.equal(result.sampleRate, 10)
})

test('saves a clipped voice record through the desktop audio edit bridge', async () => {
  const pcm: PcmAudioData = {
    sampleRate: 4,
    channelData: [new Float32Array([0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25])],
  }
  let savedBytes = 0
  const result = await saveAudioClip({
    source: { sourceKind: 'voice', record: voiceRecord },
    range: { startSeconds: 0.25, endSeconds: 1.25 },
    name: '旁白剪辑',
    desktopApi: {
      saveEditedAudio: async (options) => {
        savedBytes = options.data.byteLength
        return {
          fileName: 'clip.wav',
          audioUrl: 'file:///clip.wav',
          audioPath: 'D:\\clip.wav',
        }
      },
    },
    readSourcePcm: async () => pcm,
    now: () => '2026-07-07T01:00:00.000Z',
    createId: () => 'clip-1',
  })

  assert.equal(result.sourceKind, 'voice')
  assert.equal(result.record.id, 'clip-1')
  assert.equal(result.record.name, '旁白剪辑')
  assert.equal(result.record.audioUrl, 'file:///clip.wav')
  assert.equal(savedBytes, 52)
})

test('saving multiple ranges from a sound effect creates one sound effect record with combined duration', async () => {
  const pcm: PcmAudioData = {
    sampleRate: 10,
    channelData: [new Float32Array([0, 1, 2, 3, 4, 5])],
  }
  const result = await saveAudioClip({
    source: { sourceKind: 'sound-effect', record: soundEffectRecord },
    ranges: [
      { startSeconds: 0.3, endSeconds: 0.5 },
      { startSeconds: 0.1, endSeconds: 0.2 },
    ],
    name: 'Hit edit',
    desktopApi: {
      saveEditedAudio: async () => ({
        fileName: 'out.wav',
        audioUrl: 'file:///out.wav',
        audioPath: 'D:\\out.wav',
      }),
    },
    readSourcePcm: async () => pcm,
    now: () => '2026-07-07T00:00:00.000Z',
    createId: () => 'clip-1',
  })

  assert.equal(result.sourceKind, 'sound-effect')
  assert.equal(result.record.durationSeconds, 0.3)
  assert.equal(result.record.name, 'Hit edit')
})

test('exports multiple pending ranges as one wav in pending-list order', async () => {
  const pcm: PcmAudioData = {
    sampleRate: 10,
    channelData: [new Float32Array([0, 1, 0, 0.5, -0.5, -1])],
  }
  let exportedData: ArrayBuffer | null = null

  const result = await exportAudioClip({
    source: { sourceKind: 'sound-effect', record: soundEffectRecord },
    ranges: [
      { startSeconds: 0.3, endSeconds: 0.5 },
      { startSeconds: 0.1, endSeconds: 0.2 },
    ],
    name: 'Hit export',
    desktopApi: {
      saveEditedAudio: async () => ({
        fileName: 'unused.wav',
        audioUrl: 'file:///unused.wav',
        audioPath: 'D:\\unused.wav',
      }),
      saveEditedAudioAs: async (options) => {
        exportedData = options.data
        return {
          fileName: 'export.wav',
          audioUrl: 'file:///export.wav',
          audioPath: 'D:\\export.wav',
        }
      },
    },
    readSourcePcm: async () => pcm,
  })

  assert.equal(result?.fileName, 'export.wav')
  assert.ok(exportedData)
  assert.deepEqual(readWavInt16Samples(exportedData), [16383, -16384, 32767])
})

test('exports a 0.01 second clipped range', async () => {
  const pcm: PcmAudioData = {
    sampleRate: 100,
    channelData: [new Float32Array([0.5, -0.5, 1])],
  }
  let exportedData: ArrayBuffer | null = null

  const result = await exportAudioClip({
    source: { sourceKind: 'sound-effect', record: soundEffectRecord },
    ranges: [{ startSeconds: 0, endSeconds: 0.01 }],
    name: 'Short hit',
    desktopApi: {
      saveEditedAudio: async () => ({
        fileName: 'unused.wav',
        audioUrl: 'file:///unused.wav',
        audioPath: 'D:\\unused.wav',
      }),
      saveEditedAudioAs: async (options) => {
        exportedData = options.data
        return {
          fileName: 'short.wav',
          audioUrl: 'file:///short.wav',
          audioPath: 'D:\\short.wav',
        }
      },
    },
    readSourcePcm: async () => pcm,
  })

  assert.equal(result?.fileName, 'short.wav')
  assert.ok(exportedData)
  assert.deepEqual(readWavInt16Samples(exportedData), [16383])
})

test('uploaded audio cannot be generated into history', async () => {
  const pcm: PcmAudioData = {
    sampleRate: 4,
    channelData: [new Float32Array([0, 0.5, 1, 0.5, 0])],
  }

  await assert.rejects(
    () => saveAudioClip({
      source: createAudioClipSourceFromImportedFile('door slam.mp3', 'blob:door-slam'),
      ranges: [{ startSeconds: 0, endSeconds: 1 }],
      name: '门响剪辑',
      desktopApi: {
        saveEditedAudio: async () => ({
          fileName: 'clip.wav',
          audioUrl: 'file:///clip.wav',
          audioPath: 'D:\\clip.wav',
        }),
      },
      readSourcePcm: async () => pcm,
      now: () => '2026-07-07T01:00:00.000Z',
      createId: () => 'clip-import-1',
    }),
    /导入音频不能生成到历史/,
  )
})
