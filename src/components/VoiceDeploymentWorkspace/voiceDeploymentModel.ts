export type HardwareStatus = 'unknown' | 'ready' | 'warning' | 'blocked'
export type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'disconnected'
export type Platform = 'windows' | 'mac' | 'linux'
export type DeviceType = 'nvidia' | 'apple' | 'cpu'
export type ModelVersion = 'VoxCPM2' | 'VoxCPM1.5' | 'VoxCPM-0.5B'

export interface HardwareReport {
  gpuName: string
  vramGb: number
  device: DeviceType
}

export interface HardwareEvaluation {
  status: HardwareStatus
  title: string
  detail: string
  /** 推荐部署的模型版本 */
  recommendedModel: ModelVersion | null
}

export interface GradioApiCallOptions {
  port: number
  text: string
}

export const defaultPort = 8808

// VRAM requirements per model (GB)
export const modelVramRequirements = {
  'VoxCPM2': 8,
  'VoxCPM1.5': 6,
  'VoxCPM-0.5B': 5,
} as const

// 可部署的模型版本元数据：HF 仓库 ID、显存占用、适用说明
export const voxcpmModels: Array<{
  id: ModelVersion
  hfId: string
  vramGb: number
  note: string
}> = [
  { id: 'VoxCPM2', hfId: 'openbmb/VoxCPM2', vramGb: modelVramRequirements['VoxCPM2'], note: '质量最高，适合 8GB 以上显卡' },
  { id: 'VoxCPM1.5', hfId: 'openbmb/VoxCPM1.5', vramGb: modelVramRequirements['VoxCPM1.5'], note: '平衡质量与显存，适合 6GB 显卡' },
  { id: 'VoxCPM-0.5B', hfId: 'openbmb/VoxCPM-0.5B', vramGb: modelVramRequirements['VoxCPM-0.5B'], note: '最轻量，适合 5GB 显卡 / Apple Silicon / CPU' },
]

const scriptBaseUrl = 'https://tools.linjiawen.com/scripts'

export const gpuCheckCommand = 'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits'

/**
 * Parse output of: nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits
 * Returns the card with the most VRAM.
 */
export function parseNvidiaSmiReport(input: string): HardwareReport | null {
  const reports = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [gpuName, memoryMb] = line.split(',').map((p) => p.trim())
      const memoryValue = Number(memoryMb)
      if (!gpuName || !Number.isFinite(memoryValue)) return null
      return { gpuName, vramGb: Math.round((memoryValue / 1024) * 10) / 10, device: 'nvidia' as DeviceType }
    })
    .filter((r): r is HardwareReport => r !== null)

  if (reports.length === 0) return null
  return reports.reduce((best, cur) => (cur.vramGb > best.vramGb ? cur : best))
}

/**
 * Evaluate hardware against VoxCPM's actual requirements:
 * - NVIDIA GPU: ≥5GB VRAM for VoxCPM-0.5B, ≥6GB for VoxCPM1.5, ≥8GB for VoxCPM2
 * - Apple Silicon: MPS backend supported, recommend VoxCPM-0.5B
 * - CPU: supported but slow, recommend VoxCPM-0.5B
 */
export function evaluateHardware(report: HardwareReport | null): HardwareEvaluation {
  if (!report) {
    return {
      status: 'unknown',
      title: '等待环境检测',
      detail: '粘贴 nvidia-smi 检测结果，或选择 Apple Silicon / CPU 模式继续。',
      recommendedModel: null,
    }
  }

  if (report.device === 'apple') {
    return {
      status: 'ready',
      title: 'Apple Silicon — MPS 加速',
      detail: 'VoxCPM 原生支持 Apple Silicon MPS 后端（--device auto）。推荐部署 VoxCPM-0.5B 以获得最流畅的体验。',
      recommendedModel: 'VoxCPM-0.5B',
    }
  }

  if (report.device === 'cpu') {
    return {
      status: 'warning',
      title: 'CPU 模式（速度较慢）',
      detail: 'VoxCPM 支持 CPU 推理，但速度明显慢于 GPU。推荐使用 VoxCPM-0.5B 以缩短生成时间。',
      recommendedModel: 'VoxCPM-0.5B',
    }
  }

  // NVIDIA GPU
  const { vramGb, gpuName } = report
  if (vramGb >= modelVramRequirements['VoxCPM2']) {
    return {
      status: 'ready',
      title: '满足 VoxCPM2 推荐配置',
      detail: `检测到 ${gpuName}，约 ${vramGb}GB 显存（VoxCPM2 需要 ≥8GB，CUDA ≥12.0，PyTorch ≥2.5.0）。`,
      recommendedModel: 'VoxCPM2',
    }
  }
  if (vramGb >= modelVramRequirements['VoxCPM1.5']) {
    return {
      status: 'warning',
      title: '推荐部署 VoxCPM1.5',
      detail: `检测到 ${gpuName}，约 ${vramGb}GB 显存。VoxCPM2 需要 ≥8GB，当前显存更适合 VoxCPM1.5（≥6GB）。`,
      recommendedModel: 'VoxCPM1.5',
    }
  }
  if (vramGb >= modelVramRequirements['VoxCPM-0.5B']) {
    return {
      status: 'warning',
      title: '推荐部署 VoxCPM-0.5B',
      detail: `检测到 ${gpuName}，约 ${vramGb}GB 显存。当前显存仅适合最轻量版本 VoxCPM-0.5B（≥5GB）。`,
      recommendedModel: 'VoxCPM-0.5B',
    }
  }
  return {
    status: 'blocked',
    title: '显存不足，无法部署',
    detail: `检测到 ${gpuName}，约 ${vramGb}GB 显存。VoxCPM 最轻量版本（0.5B）至少需要 5GB 显存。可切换为 CPU 模式继续。`,
    recommendedModel: null,
  }
}

export function validateModelPath(modelPath: string) {
  const value = modelPath.trim()
  if (!value) return { valid: false, message: '请先填写本地模型目录，例如 D:\\models\\VoxCPM2。' }
  return { valid: true, message: '模型路径已填写。' }
}

export function buildOneClickCommand(platform: Platform, modelPath: string, model: ModelVersion = 'VoxCPM2'): string {
  const scriptName = platform === 'windows' ? 'deploy-voxcpm.ps1' : 'deploy-voxcpm.sh'
  const url = `${scriptBaseUrl}/${scriptName}`
  const trimmed = modelPath.trim()

  if (platform === 'windows') {
    const pathArg = trimmed || 'D:\\models\\VoxCPM2'
    return `$f=[IO.Path]::GetTempFileName()+'deploy.ps1'; irm ${url} -OutFile $f; & $f '${pathArg}' '${model}'; Remove-Item $f`
  }
  const pathArg = trimmed || '/data/models/VoxCPM2'
  return `curl -fsSL ${url} | bash -s -- '${pathArg}' '${model}'`
}

/**
 * VoxCPM 的 Gradio 服务通过 gradio_client 调用。
 * 给出 Python 调用示例，具体 predict 参数以本地页面 API 面板为准。
 */
export function buildGradioApiCall({ port, text }: GradioApiCallOptions): string {
  const url = `http://127.0.0.1:${port}`
  return [
    'from gradio_client import Client',
    '',
    `client = Client("${url}")`,
    'result = client.predict(',
    `    text="${text}",`,
    '    api_name="/generate"  # 以本地页面 API 面板显示的 api_name 为准',
    ')',
    'print(result)  # 返回生成的音频文件路径',
  ].join('\n')
}

export function buildServiceUrl(port: number): string {
  return `http://127.0.0.1:${port}`
}
