export type DeployMode = 'docker' | 'direct'

export type HardwareStatus = 'unknown' | 'ready' | 'warning' | 'blocked'

export interface HardwareReport {
  gpuName: string
  vramGb: number
}

export interface HardwareEvaluation {
  status: HardwareStatus
  title: string
  detail: string
}

export interface DeployCommandOptions {
  mode: DeployMode
  modelPath: string
  port: number
}

export interface LocalServiceUsage {
  browserUrl: string
  healthCheck: string
  pythonClient: string
}

export const minimumVramGb = 8
export const recommendedVramGb = 16

export function parseNvidiaSmiReport(input: string): HardwareReport | null {
  const reports = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [gpuName, memoryMb] = line.split(',').map((part) => part.trim())
      const memoryValue = Number(memoryMb)

      if (!gpuName || !Number.isFinite(memoryValue)) {
        return null
      }

      return {
        gpuName,
        vramGb: Math.round((memoryValue / 1024) * 10) / 10,
      }
    })
    .filter((report): report is HardwareReport => report !== null)

  if (reports.length === 0) {
    return null
  }

  return reports.reduce((best, current) => (current.vramGb > best.vramGb ? current : best))
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
      title: '可部署但需要控制负载',
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

  if (!value) {
    return {
      valid: false,
      message: '请先填写本地模型目录，例如 D:\\models\\VoxCPM2。',
    }
  }

  return {
    valid: true,
    message: '模型路径已填写。',
  }
}

export function buildDeployCommand({ mode, modelPath, port }: DeployCommandOptions) {
  const normalizedModelPath = modelPath.trim()

  if (mode === 'docker') {
    return [
      'docker run --rm --gpus all',
      `-p ${port}:${port}`,
      `-v '${normalizedModelPath}:/models/VoxCPM2:ro'`,
      "-v '${PWD}/voxcpm-cache:/root/.cache/huggingface'",
      'voxcpm:web-demo',
      'python app.py',
      `--port ${port}`,
      '--device cuda',
      '--model-id /models/VoxCPM2',
    ].join(' ')
  }

  return [
    'python -m pip install -e .',
    'python app.py',
    `--port ${port}`,
    '--device cuda',
    `--model-id '${normalizedModelPath}'`,
  ].join(' && ')
}

export const gpuCheckCommand =
  "nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits"

export function buildLocalServiceUsage(port: number): LocalServiceUsage {
  const browserUrl = `http://127.0.0.1:${port}`

  return {
    browserUrl,
    healthCheck: `curl -I ${browserUrl}`,
    pythonClient: [
      'from gradio_client import Client',
      '',
      `client = Client('${browserUrl}')`,
      '# 打开本地页面的 API 面板，按 VoxCPM 当前接口填写 predict 参数。',
      '# result = client.predict(...)',
    ].join('\n'),
  }
}
