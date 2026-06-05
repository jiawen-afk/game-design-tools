import type { VoiceGenerationRecord } from './voiceDeploymentModel'

const recordsStorageKey = 'game-design-tools.voxcpm.records.v1'

export function readStoredRecords(): VoiceGenerationRecord[] {
  try {
    const raw = localStorage.getItem(recordsStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((record) => record && typeof record.id === 'string')
      .map((record) => ({
        id: record.id,
        name: record.name,
        createdAt: record.createdAt,
        audioUrl: record.audioUrl,
        audioPath: record.audioPath,
        params: record.params,
      }))
  } catch {
    return []
  }
}

export function writeStoredRecords(records: VoiceGenerationRecord[]) {
  try {
    localStorage.setItem(recordsStorageKey, JSON.stringify(records.slice(0, 80)))
  } catch {}
}
