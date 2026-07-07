import test from 'node:test'
import assert from 'node:assert/strict'

import {
  encodePcmAudioDataToWav,
  slicePcmAudioData,
  type PcmAudioData,
} from './audioClipEncoding'

function readString(view: DataView, offset: number, length: number) {
  return Array.from({ length }, (_, index) => String.fromCharCode(view.getUint8(offset + index))).join('')
}

test('slices PCM audio data by second range', () => {
  const data: PcmAudioData = {
    sampleRate: 4,
    channelData: [
      new Float32Array([0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25]),
      new Float32Array([0, -0.25, -0.5, -0.75, -1, -0.75, -0.5, -0.25]),
    ],
  }

  const sliced = slicePcmAudioData(data, { startSeconds: 0.25, endSeconds: 1.25 })

  assert.equal(sliced.sampleRate, 4)
  assert.deepEqual(Array.from(sliced.channelData[0]), [0.25, 0.5, 0.75, 1])
  assert.deepEqual(Array.from(sliced.channelData[1]), [-0.25, -0.5, -0.75, -1])
})

test('encodes PCM audio data as a 16 bit WAV blob', async () => {
  const data: PcmAudioData = {
    sampleRate: 4,
    channelData: [
      new Float32Array([0, 1, -1, 0.5]),
      new Float32Array([0, -1, 1, -0.5]),
    ],
  }

  const blob = encodePcmAudioDataToWav(data)
  const bytes = await blob.arrayBuffer()
  const view = new DataView(bytes)

  assert.equal(blob.type, 'audio/wav')
  assert.equal(readString(view, 0, 4), 'RIFF')
  assert.equal(readString(view, 8, 4), 'WAVE')
  assert.equal(readString(view, 12, 4), 'fmt ')
  assert.equal(readString(view, 36, 4), 'data')
  assert.equal(view.getUint16(22, true), 2)
  assert.equal(view.getUint32(24, true), 4)
  assert.equal(view.getUint16(34, true), 16)
  assert.equal(view.getUint32(40, true), 16)
})
