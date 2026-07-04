import type { SoundEffectRecord } from './soundEffectModel'

export async function checkStableAudioConnection(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`)
    return response.ok
  } catch {
    return false
  }
}

export async function generateStableAudioSound(
  port: number,
  payload: { prompt: string; durationSeconds: number; seed: number | null; outputName: string },
): Promise<SoundEffectRecord> {
  const serviceUrl = `http://127.0.0.1:${port}`
  const response = await fetch(`${serviceUrl}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`生成音效失败：${response.status}`)
  const record = await response.json() as SoundEffectRecord
  return {
    ...record,
    audioUrl: record.audioUrl.startsWith('/') ? `${serviceUrl}${record.audioUrl}` : record.audioUrl,
  }
}
