import test from 'node:test'
import assert from 'node:assert/strict'

import { saveAudioClip } from './audioClipService'
import type { PcmAudioData } from './audioClipEncoding'
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
