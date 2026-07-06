import {
  defaultSoundEffectParams,
  stableAudioModelIds,
  type SoundEffectRecord,
  type StableAudioModelId,
} from './soundEffectModel'

const soundEffectRecordsStorageKey = 'game-design-tools.stable-audio.records.v1'

function stableAudioModelId(value: unknown): StableAudioModelId {
  return typeof value === 'string' && stableAudioModelIds.includes(value as StableAudioModelId)
    ? value as StableAudioModelId
    : defaultSoundEffectParams.model
}

function normalizeStoredSoundEffectRecord(record: Record<string, unknown>): SoundEffectRecord | null {
  if (typeof record.id !== 'string') return null
  return {
    id: record.id,
    name: typeof record.name === 'string' && record.name.trim() ? record.name : '未命名音效',
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    audioUrl: typeof record.audioUrl === 'string' ? record.audioUrl : '',
    audioPath: typeof record.audioPath === 'string' ? record.audioPath : null,
    prompt: typeof record.prompt === 'string' ? record.prompt : '',
    durationSeconds: Math.max(1, Math.round(Number(record.durationSeconds) || 1)),
    seed: Number.isFinite(record.seed) ? Number(record.seed) : null,
    model: stableAudioModelId(record.model),
  }
}

export function readStoredSoundEffectRecords(): SoundEffectRecord[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(soundEffectRecordsStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((record) => (
        record && typeof record === 'object'
          ? normalizeStoredSoundEffectRecord(record as Record<string, unknown>)
          : null
      ))
      .filter((record): record is SoundEffectRecord => Boolean(record))
      .slice(0, 80)
  } catch {
    return []
  }
}

export function writeStoredSoundEffectRecords(records: SoundEffectRecord[]) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(soundEffectRecordsStorageKey, JSON.stringify(records.slice(0, 80)))
  } catch {}
}
