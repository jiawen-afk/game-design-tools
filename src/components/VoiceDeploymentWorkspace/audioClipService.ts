import {
  createImportedAudioClipRecord,
  createSoundEffectClipRecord,
  createVoiceClipRecord,
  isValidAudioClipRange,
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'
import {
  decodeAudioArrayBuffer,
  encodePcmAudioDataToWav,
  slicePcmAudioData,
  type PcmAudioData,
} from './audioClipEncoding'

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

interface AudioClipDesktopApi {
  saveEditedAudio(options: { fileName: string; data: ArrayBuffer }): Promise<{
    fileName: string
    audioUrl: string
    audioPath: string | null
  }>
  readAudioFile?: (filePath: string) => Promise<{
    name: string
    data: ArrayBuffer
    mimeType: string
  }>
}

export interface SaveAudioClipInput {
  source: AudioClipSource
  range: AudioClipRange
  name: string
  desktopApi: AudioClipDesktopApi | undefined
  readSourcePcm?: (source: AudioClipSource, desktopApi: AudioClipDesktopApi | undefined) => Promise<PcmAudioData>
  createAudioContext?: () => AudioContext
  now?: () => string
  createId?: () => string
}

export type AudioClipSaveResult =
  | { sourceKind: 'voice'; record: ReturnType<typeof createVoiceClipRecord> }
  | { sourceKind: 'sound-effect'; record: ReturnType<typeof createSoundEffectClipRecord> }

async function readSourceArrayBuffer(source: AudioClipSource, desktopApi: AudioClipDesktopApi | undefined) {
  const sourceUrl = source.record.audioUrl
  if (sourceUrl) {
    try {
      const response = await fetch(sourceUrl)
      if (response.ok) return response.arrayBuffer()
    } catch {}
  }
  if (source.record.audioPath && desktopApi?.readAudioFile) {
    return (await desktopApi.readAudioFile(source.record.audioPath)).data
  }
  throw new Error('源音频不存在或无法读取，无法剪辑。')
}

async function readSourcePcm(
  source: AudioClipSource,
  desktopApi: AudioClipDesktopApi | undefined,
  createAudioContext?: () => AudioContext,
) {
  const AudioContextCtor = typeof window !== 'undefined'
    ? window.AudioContext || window.webkitAudioContext
    : undefined
  const audioContext = createAudioContext?.() ?? (AudioContextCtor ? new AudioContextCtor() : null)
  if (!audioContext) throw new Error('当前浏览器不支持音频解码。')
  return decodeAudioArrayBuffer(await readSourceArrayBuffer(source, desktopApi), audioContext)
}

export async function saveAudioClip(input: SaveAudioClipInput): Promise<AudioClipSaveResult> {
  if (!input.desktopApi?.saveEditedAudio) throw new Error('当前桌面运行时不可用，无法保存剪辑音频。')
  if (!isValidAudioClipRange(input.range)) throw new Error('剪辑片段太短，请重新选择有效声音片段。')

  const pcm = await (input.readSourcePcm ?? ((source, desktopApi) => (
    readSourcePcm(source, desktopApi, input.createAudioContext)
  )))(input.source, input.desktopApi)
  const clippedPcm = slicePcmAudioData(pcm, input.range)
  const wav = encodePcmAudioDataToWav(clippedPcm)
  const saved = await input.desktopApi.saveEditedAudio({
    fileName: input.name,
    data: await wav.arrayBuffer(),
  })

  if (input.source.sourceKind === 'voice') {
    return {
      sourceKind: 'voice',
      record: createVoiceClipRecord({
        source: input.source,
        name: input.name,
        range: input.range,
        savedAudio: saved,
        now: input.now,
        createId: input.createId,
      }),
    }
  }
  if (input.source.sourceKind === 'imported-audio') {
    return {
      sourceKind: 'voice',
      record: createImportedAudioClipRecord({
        source: input.source,
        name: input.name,
        range: input.range,
        savedAudio: saved,
        now: input.now,
        createId: input.createId,
      }),
    }
  }
  return {
    sourceKind: 'sound-effect',
    record: createSoundEffectClipRecord({
      source: input.source,
      name: input.name,
      range: input.range,
      savedAudio: saved,
      now: input.now,
      createId: input.createId,
    }),
  }
}
