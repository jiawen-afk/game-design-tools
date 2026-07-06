import type { SoundEffectRecord, StableAudioGeneratePayload } from './soundEffectModel'

async function readErrorDetail(response: Response) {
  const text = await response.text().catch(() => '')
  if (!text) return ''
  try {
    const data = JSON.parse(text) as { detail?: unknown; message?: unknown }
    if (typeof data.detail === 'string') return data.detail
    if (typeof data.message === 'string') return data.message
  } catch {}
  return text
}

export async function checkStableAudioConnection(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return false
    const data = await response.json().catch(() => null) as { ok?: boolean; ready?: boolean } | null
    if (!data) return true
    return Boolean(data.ok ?? data.ready ?? true) && data.ready !== false
  } catch {
    return false
  }
}

export async function generateStableAudioSound(
  port: number,
  payload: StableAudioGeneratePayload,
): Promise<SoundEffectRecord> {
  const serviceUrl = `http://127.0.0.1:${port}`
  const response = await fetch(`${serviceUrl}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const detail = await readErrorDetail(response)
    throw new Error(detail || `生成音效失败：${response.status}`)
  }
  const record = await response.json() as SoundEffectRecord
  return {
    ...record,
    audioUrl: record.audioUrl.startsWith('/') ? `${serviceUrl}${record.audioUrl}` : record.audioUrl,
  }
}
