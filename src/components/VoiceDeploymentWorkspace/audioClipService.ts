import {
  createSoundEffectClipRecord,
  createVoiceClipRecord,
  isValidAudioClipRange,
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'
import {
  concatPcmAudioRanges,
  decodeAudioArrayBuffer,
  encodePcmAudioDataToWav,
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
  saveEditedAudioAs?: (options: { fileName: string; data: ArrayBuffer }) => Promise<{
    fileName: string
    audioUrl: string
    audioPath: string | null
  } | null>
  readAudioFile?: (filePath: string) => Promise<{
    name: string
    data: ArrayBuffer
    mimeType: string
  }>
}

export interface SaveAudioClipInput {
  source: AudioClipSource
  range?: AudioClipRange
  ranges?: AudioClipRange[]
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

export type AudioClipExportResult = {
  fileName: string
  audioUrl: string
  audioPath: string | null
} | null

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

function audioClipRangesFromInput(input: Pick<SaveAudioClipInput, 'range' | 'ranges'>) {
  return input.ranges && input.ranges.length > 0
    ? input.ranges
    : input.range
      ? [input.range]
      : []
}

function assertValidAudioClipRanges(ranges: AudioClipRange[]) {
  if (ranges.length === 0 || ranges.some((range) => !isValidAudioClipRange(range))) {
    throw new Error('剪辑片段太短，请重新选择有效声音片段。')
  }
}

function combinedAudioClipRange(ranges: AudioClipRange[]): AudioClipRange {
  const duration = ranges.reduce((sum, range) => sum + Math.max(0, range.endSeconds - range.startSeconds), 0)
  return {
    startSeconds: 0,
    endSeconds: Math.round(duration * 1000) / 1000,
  }
}

export async function renderAudioClipWav(input: SaveAudioClipInput): Promise<Blob> {
  const ranges = audioClipRangesFromInput(input)
  assertValidAudioClipRanges(ranges)
  const pcm = await (input.readSourcePcm ?? ((source, desktopApi) => (
    readSourcePcm(source, desktopApi, input.createAudioContext)
  )))(input.source, input.desktopApi)
  const clippedPcm = concatPcmAudioRanges(pcm, ranges)
  return encodePcmAudioDataToWav(clippedPcm)
}

export async function saveAudioClip(input: SaveAudioClipInput): Promise<AudioClipSaveResult> {
  if (input.source.sourceKind === 'imported-audio') throw new Error('导入音频不能生成到历史，请使用导出到本地或收藏到项目空间。')
  if (!input.desktopApi?.saveEditedAudio) throw new Error('当前桌面运行时不可用，无法保存剪辑音频。')

  const ranges = audioClipRangesFromInput(input)
  const outputRange = combinedAudioClipRange(ranges)
  const wav = await renderAudioClipWav(input)
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
        range: outputRange,
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
      range: outputRange,
      savedAudio: saved,
      now: input.now,
      createId: input.createId,
    }),
  }
}

export async function exportAudioClip(input: SaveAudioClipInput): Promise<AudioClipExportResult> {
  if (!input.desktopApi?.saveEditedAudioAs) throw new Error('当前桌面运行时不可用，无法导出剪辑音频。')
  const wav = await renderAudioClipWav(input)
  return input.desktopApi.saveEditedAudioAs({
    fileName: input.name,
    data: await wav.arrayBuffer(),
  })
}
