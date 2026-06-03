export type HardwareStatus = 'unknown' | 'ready' | 'warning' | 'blocked'
export type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'disconnected'
export type Platform = 'windows' | 'mac' | 'linux'

export interface HardwareReport {
  gpuName: string
  vramGb: number
}

export interface HardwareEvaluation {
  status: HardwareStatus
  title: string
  detail: string
}

export interface VllmApiCallOptions {
  port: number
  text: string
  voice?: string
}

export const defaultPort = 8000
export const minimumVramGb = 8
export const recommendedVramGb = 16

// Remote script URLs — the scripts live in the repo and use CN mirrors
const scriptBaseUrl = 'https://raw.githubusercontent.com/jiawen-afk/game-design-tools/master/scripts'

export const gpuCheckCommand = 'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits'

export function parseNvidiaSmiReport(input: string): HardwareReport | null {
  const reports = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [gpuName, memoryMb] = line.split(',').map((part) => part.trim())
      const memoryValue = Number(memoryMb)
      if (!gpuName || !Number.isFinite(memoryValue)) return null
      return { gpuName, vramGb: Math.round((memoryValue / 1024) * 10) / 10 }
    })
    .filter((r): r is HardwareReport => r !== null)

  if (reports.length === 0) return null
  return reports.reduce((best, cur) => (cur.vramGb > best.vramGb ? cur : best))
}

export function evaluateHardware(report: HardwareReport | null): HardwareEvaluation {
  if (!report) {
    return {
      status: 'unknown',
      title: '等待显卡检测',
      detail: '粘贴 nvidia-smi 检测结果后，工作台会判断显存是否满足本地部署。',
    }
  }
  if (report.vramGb < minimumVramGb) {
    return {
      status: 'blocked',
      title: '显存不足',
      detail: `检测到 ${report.gpuName}，约 ${report.vramGb}GB 显存；至少 8GB 才建议部署 VoxCPM。`,
    }
  }
  if (report.vramGb < recommendedVramGb) {
    return {
      status: 'warning',
      title: '可部署但建议控制并发',
      detail: `检测到 ${report.gpuName}，约 ${report.vramGb}GB 显存；建议 16GB 以上以获得更稳定的语音生成体验。`,
    }
  }
  return {
    status: 'ready',
    title: '显卡满足建议配置',
    detail: `检测到 ${report.gpuName}，约 ${report.vramGb}GB 显存，可以进行本地部署。`,
  }
}

export function validateModelPath(modelPath: string) {
  const value = modelPath.trim()
  if (!value) return { valid: false, message: '请先填写本地模型目录，例如 D:\\models\\VoxCPM2。' }
  return { valid: true, message: '模型路径已填写。' }
}

/**
 * Returns a single terminal command the user can run to download and execute
 * the deploy script. Uses CN mirrors inside the script itself.
 */
export function buildOneClickCommand(platform: Platform, modelPath: string): string {
  const scriptName = platform === 'windows' ? 'deploy-voxcpm.ps1' : 'deploy-voxcpm.sh'
  const url = `${scriptBaseUrl}/${scriptName}`
  const pathArg = modelPath.trim() || '/data/models/VoxCPM2'

  if (platform === 'windows') {
    return `irm ${url} | iex -Args '${pathArg}'`
  }
  // mac / linux
  return `curl -fsSL ${url} | bash -s -- '${pathArg}'`
}

export function buildVllmApiCall({ port, text, voice = 'default' }: VllmApiCallOptions): string {
  const url = `http://127.0.0.1:${port}/v1/audio/speech`
  return [
    `curl ${url} \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"model":"openbmb/VoxCPM2","input":"${text}","voice":"${voice}"}' \\`,
    `  --output speech.wav`,
  ].join('\n')
}

export function buildServiceUrl(port: number): string {
  return `http://127.0.0.1:${port}`
}
