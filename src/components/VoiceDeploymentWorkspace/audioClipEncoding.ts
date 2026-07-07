import type { AudioClipRange } from './audioClipModel'

export interface PcmAudioData {
  sampleRate: number
  channelData: Float32Array[]
}

export function audioBufferToPcmAudioData(audioBuffer: AudioBuffer): PcmAudioData {
  return {
    sampleRate: audioBuffer.sampleRate,
    channelData: Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => (
      new Float32Array(audioBuffer.getChannelData(index))
    )),
  }
}

export async function decodeAudioArrayBuffer(
  arrayBuffer: ArrayBuffer,
  audioContext: AudioContext,
): Promise<PcmAudioData> {
  return audioBufferToPcmAudioData(await audioContext.decodeAudioData(arrayBuffer.slice(0)))
}

export function slicePcmAudioData(data: PcmAudioData, range: AudioClipRange): PcmAudioData {
  const startFrame = Math.max(0, Math.floor(range.startSeconds * data.sampleRate))
  const endFrame = Math.max(startFrame, Math.floor(range.endSeconds * data.sampleRate))
  return {
    sampleRate: data.sampleRate,
    channelData: data.channelData.map((channel) => channel.slice(startFrame, Math.min(endFrame, channel.length))),
  }
}

export function concatPcmAudioRanges(data: PcmAudioData, ranges: AudioClipRange[]): PcmAudioData {
  const slices = ranges.map((range) => slicePcmAudioData(data, range))
  const channelCount = Math.max(1, data.channelData.length)
  const totalFrames = slices.reduce((sum, slice) => sum + (slice.channelData[0]?.length ?? 0), 0)
  const channelData = Array.from({ length: channelCount }, () => new Float32Array(totalFrames))

  let offset = 0
  for (const slice of slices) {
    const frameCount = slice.channelData[0]?.length ?? 0
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sourceChannel = slice.channelData[channelIndex] ?? new Float32Array(frameCount)
      channelData[channelIndex].set(sourceChannel, offset)
    }
    offset += frameCount
  }

  return {
    sampleRate: data.sampleRate,
    channelData,
  }
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

function clampSample(value: number) {
  return Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0))
}

export function encodePcmAudioDataToWav(data: PcmAudioData): Blob {
  const channelCount = Math.max(1, data.channelData.length)
  const frameCount = data.channelData[0]?.length ?? 0
  const bytesPerSample = 2
  const blockAlign = channelCount * bytesPerSample
  const byteRate = data.sampleRate * blockAlign
  const dataByteLength = frameCount * blockAlign
  const buffer = new ArrayBuffer(44 + dataByteLength)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataByteLength, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, data.sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataByteLength, true)

  let offset = 44
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = clampSample(data.channelData[channel]?.[frame] ?? 0)
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += bytesPerSample
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}
