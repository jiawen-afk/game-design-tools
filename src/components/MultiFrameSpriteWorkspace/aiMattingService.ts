import { getDesktopApi } from '../../desktopApi'

export type MatteMode = 'chroma' | 'ai'
export type AiMattingConnectionStatus = 'idle' | 'checking' | 'connected' | 'disconnected'

export const defaultBirefnetPort = 17860
export const defaultBirefnetModel = 'ZhengPeng7/BiRefNet_HR-matting'

export interface AiMattingResult {
  url: string
  width: number
  height: number
}

export function buildBirefnetServiceUrl(port = defaultBirefnetPort) {
  return `http://127.0.0.1:${port}`
}

export async function checkBirefnetConnection(port = defaultBirefnetPort) {
  const api = getDesktopApi()
  if (api?.checkBirefnetService) {
    try {
      const result = await api.checkBirefnetService(port)
      return result.ok
    } catch {
      return false
    }
  }

  try {
    const response = await fetch(`${buildBirefnetServiceUrl(port)}/ready`, { cache: 'no-store' })
    return response.ok
  } catch {
    return false
  }
}

export async function removeImageBackground(
  sourceUrl: string,
  options: { inputName?: string; port?: number } = {}
): Promise<AiMattingResult> {
  const api = getDesktopApi()
  if (!api) throw new Error('桌面运行时未就绪，无法调用 AI 抠图服务。')
  const sourceResponse = await fetch(sourceUrl)
  if (!sourceResponse.ok) throw new Error('原图读取失败。')
  let result
  try {
    result = await api.removeImageBackground({
      inputName: options.inputName || 'frame.png',
      data: await sourceResponse.arrayBuffer(),
      port: options.port ?? defaultBirefnetPort,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/ECONNREFUSED|ECONNRESET|connect|connection/i.test(message)) {
      throw new Error('BiRefNet 服务未连接，请先启动服务。')
    }
    throw error
  }
  const data = result.data instanceof Uint8Array
    ? result.data.slice().buffer
    : result.data
  const blob = new Blob([data], { type: 'image/png' })
  return {
    url: URL.createObjectURL(blob),
    width: result.width,
    height: result.height,
  }
}
