import type { GradioFileData } from './voiceDeploymentModel'

export async function checkConnection(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/config`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function uploadReferenceAudio(port: number, file: File): Promise<GradioFileData> {
  const form = new FormData()
  form.append('files', file)
  const res = await fetch(`http://127.0.0.1:${port}/gradio_api/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(`参考音频上传失败：${res.status}`)
  const data = await res.json()
  const first = Array.isArray(data) ? data[0] : data
  if (typeof first === 'string') {
    return { path: first, orig_name: file.name, mime_type: file.type, meta: { _type: 'gradio.FileData' } }
  }
  if (first && typeof first.path === 'string') {
    return {
      path: first.path,
      orig_name: first.orig_name || file.name,
      mime_type: first.mime_type || file.type,
      meta: { _type: 'gradio.FileData' },
    }
  }
  throw new Error('参考音频上传结果无法识别')
}

export async function readGradioEventResult(res: Response): Promise<unknown[]> {
  if (!res.ok) throw new Error(`生成请求失败：${res.status}`)
  if (!res.body) {
    const text = await res.text()
    return parseGradioEventText(text)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
    const blocks = buffer.split(/\n\n/)
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      const parsed = parseGradioEventBlock(block)
      if (!parsed) continue
      if (parsed.event === 'error') throw new Error(String(parsed.data || 'VoxCPM 生成失败'))
      if (parsed.event === 'complete') return Array.isArray(parsed.data) ? parsed.data : [parsed.data]
    }

    if (done) break
  }

  return parseGradioEventText(buffer)
}

function parseGradioEventText(text: string): unknown[] {
  for (const block of text.split(/\n\n/)) {
    const parsed = parseGradioEventBlock(block)
    if (!parsed) continue
    if (parsed.event === 'error') throw new Error(String(parsed.data || 'VoxCPM 生成失败'))
    if (parsed.event === 'complete') return Array.isArray(parsed.data) ? parsed.data : [parsed.data]
  }
  throw new Error('没有收到 VoxCPM 生成结果')
}

function parseGradioEventBlock(block: string): { event: string; data: unknown } | null {
  const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim()
  const dataLine = block.match(/^data:\s*(.*)$/m)?.[1]
  if (!event) return null
  let data: unknown = dataLine ?? null
  if (dataLine) {
    try {
      data = JSON.parse(dataLine)
    } catch {}
  }
  return { event, data }
}

export function normalizeAudioResult(data: unknown[], serviceUrl: string) {
  const first = data[0]
  if (first && typeof first === 'object') {
    const file = first as { url?: string; path?: string; name?: string }
    const url = file.url
      ? file.url.startsWith('http') ? file.url : `${serviceUrl}${file.url}`
      : file.path ? `${serviceUrl}/gradio_api/file=${encodeURIComponent(file.path)}` : ''
    return { audioUrl: url, audioPath: file.path ?? null }
  }
  if (typeof first === 'string') {
    const url = first.startsWith('http') ? first : `${serviceUrl}/gradio_api/file=${encodeURIComponent(first)}`
    return { audioUrl: url, audioPath: first }
  }
  throw new Error('没有找到生成音频文件')
}
