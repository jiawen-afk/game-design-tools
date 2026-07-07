import type { SoundEffectRecord } from './soundEffectModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'

export const minAudioClipDurationSeconds = 0.05

export interface AudioClipRange {
  startSeconds: number
  endSeconds: number
}

export type AudioClipSource =
  | { sourceKind: 'voice'; record: VoiceGenerationRecord }
  | { sourceKind: 'sound-effect'; record: SoundEffectRecord }

export interface SavedAudioClip {
  audioUrl: string
  audioPath: string | null
}

export interface CreateAudioClipRecordInput<TSource extends AudioClipSource> {
  source: TSource
  name: string
  range: AudioClipRange
  savedAudio: SavedAudioClip
  now?: () => string
  createId?: () => string
}

function cleanNumber(value: number) {
  return Number.isFinite(value) ? value : 0
}

function roundedSeconds(value: number) {
  return Math.round(value * 1000) / 1000
}

export function normalizeAudioClipRange(range: AudioClipRange, durationSeconds: number): AudioClipRange {
  const duration = Math.max(0, cleanNumber(durationSeconds))
  const first = Math.max(0, Math.min(duration, cleanNumber(range.startSeconds)))
  const second = Math.max(0, Math.min(duration, cleanNumber(range.endSeconds)))
  return {
    startSeconds: roundedSeconds(Math.min(first, second)),
    endSeconds: roundedSeconds(Math.max(first, second)),
  }
}

export function isValidAudioClipRange(range: AudioClipRange) {
  return range.endSeconds - range.startSeconds >= minAudioClipDurationSeconds
}

export function formatAudioClipTime(seconds: number) {
  const safeSeconds = Math.max(0, cleanNumber(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const wholeSeconds = Math.floor(safeSeconds % 60)
  const milliseconds = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 1000)
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
}

export function createDefaultAudioClipName(source: AudioClipSource) {
  return `${source.record.name.trim() || '未命名音频'} 剪辑`
}

export function createAudioClipSourceFromVoiceRecord(record: VoiceGenerationRecord): AudioClipSource {
  return { sourceKind: 'voice', record }
}

export function createAudioClipSourceFromSoundEffectRecord(record: SoundEffectRecord): AudioClipSource {
  return { sourceKind: 'sound-effect', record }
}

function createRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizedClipName(name: string, source: AudioClipSource) {
  return name.trim() || createDefaultAudioClipName(source)
}

export function createVoiceClipRecord(
  input: CreateAudioClipRecordInput<{ sourceKind: 'voice'; record: VoiceGenerationRecord }>,
): VoiceGenerationRecord {
  return {
    id: (input.createId ?? createRandomId)(),
    name: normalizedClipName(input.name, input.source),
    createdAt: (input.now ?? (() => new Date().toISOString()))(),
    audioUrl: input.savedAudio.audioUrl,
    audioPath: input.savedAudio.audioPath,
    params: {
      ...input.source.record.params,
      advanced: { ...input.source.record.params.advanced },
    },
  }
}

export function createSoundEffectClipRecord(
  input: CreateAudioClipRecordInput<{ sourceKind: 'sound-effect'; record: SoundEffectRecord }>,
): SoundEffectRecord {
  return {
    id: (input.createId ?? createRandomId)(),
    name: normalizedClipName(input.name, input.source),
    createdAt: (input.now ?? (() => new Date().toISOString()))(),
    audioUrl: input.savedAudio.audioUrl,
    audioPath: input.savedAudio.audioPath,
    prompt: input.source.record.prompt,
    durationSeconds: roundedSeconds(input.range.endSeconds - input.range.startSeconds),
    seed: input.source.record.seed,
    model: input.source.record.model,
  }
}
