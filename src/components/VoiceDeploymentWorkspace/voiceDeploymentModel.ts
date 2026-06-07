export type HardwareStatus = 'unknown' | 'ready' | 'warning' | 'blocked'
export type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'disconnected'
export type Platform = 'windows' | 'mac' | 'linux'
export type DeviceType = 'nvidia' | 'apple' | 'cpu'
export type ModelVersion = 'VoxCPM2' | 'VoxCPM1.5' | 'VoxCPM-0.5B'
export type DownloadSource = 'auto' | 'hf' | 'ms'
export type VoiceGenerationMode = 'blind-box' | 'voice-design' | 'reference-clone' | 'high-similarity-clone'

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

export interface VoiceAdvancedParams {
  cfgValue: number
  normalize: boolean
  denoise: boolean
  ditSteps: number
}

export interface VoiceGenerationParams {
  mode: VoiceGenerationMode
  text: string
  controlInstruction: string
  promptText: string
  referenceAudioName: string
  referenceAudioPath: string | null
  advanced: VoiceAdvancedParams
}

export interface VoiceGenerationRecord {
  id: string
  name: string
  createdAt: string
  audioUrl: string
  audioPath: string | null
  params: VoiceGenerationParams
}

export interface GradioFileData {
  path: string
  orig_name?: string
  mime_type?: string
  meta: { _type: 'gradio.FileData' }
}

export interface GradioGeneratePayload {
  data: [
    string,
    string,
    GradioFileData | null,
    boolean,
    string,
    number,
    boolean,
    boolean,
    number,
  ]
}

export const defaultPort = 8808

export const voiceModeMeta: Array<{
  id: VoiceGenerationMode
  label: string
  note: string
}> = [
  { id: 'blind-box', label: '声音盲盒', note: '只输入台词，让 VoxCPM 随机生成一个可用音色，适合快速找灵感。' },
  { id: 'voice-design', label: '声音设计', note: '用自然语言描述年龄、情绪、语速、质感等声音特征，不需要参考音频。' },
  { id: 'reference-clone', label: '参考音频克隆', note: '上传参考音频，主要复刻音色，可继续用描述微调语气或风格。' },
  { id: 'high-similarity-clone', label: '高相似度克隆', note: '上传参考音频并填写对应文本，按音频续写方式保留更多细节。' },
]

export const defaultVoiceGenerationParams: VoiceGenerationParams = {
  mode: 'blind-box',
  text: '你好，欢迎来到我们的游戏世界。',
  controlInstruction: '',
  promptText: '',
  referenceAudioName: '',
  referenceAudioPath: null,
  advanced: {
    cfgValue: 2,
    normalize: false,
    denoise: false,
    ditSteps: 10,
  },
}

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

// 模型下载源元数据。host 仅用于 UI 文案展示，真正的测速主机写死在部署脚本里。
export interface DownloadSourceMeta {
  id: DownloadSource
  label: string
  host: string
  note: string
}

export const downloadSources: DownloadSourceMeta[] = [
  {
    id: 'auto',
    label: '自动测速',
    host: '',
    note: '脚本启动时对两个源做延迟探测，自动选延迟低的下载。',
  },
  {
    id: 'hf',
    label: 'HF 镜像',
    host: 'hf-mirror.com',
    note: '通过 hf-mirror.com（HuggingFace 国内镜像）下载，由 app.py 自动拉取。',
  },
  {
    id: 'ms',
    label: 'ModelScope',
    host: 'modelscope.cn',
    note: '通过 modelscope.cn 下载到本地目录后再启动，国内通常更稳。',
  },
]

// 延迟探测的诚实标注：延迟低 ≠ 下载快。UI 与测试共用此文案，避免漂移。
export const latencyDisclaimer =
  '测速基于连接延迟，不等于实际下载吞吐量。若自动选择的源下载偏慢，可手动切换另一个源。'

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
      detail: 'VoxCPM 原生支持 Apple Silicon MPS 后端，启动时自动选择。推荐部署 VoxCPM-0.5B 以获得最流畅的体验。',
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
  if (!value) return { valid: true, message: '留空时脚本会使用默认模型目录。' }
  return { valid: true, message: '模型路径已填写。' }
}

export function buildOneClickCommand(
  platform: Platform,
  modelPath: string,
  model: ModelVersion = 'VoxCPM2',
  source: DownloadSource = 'auto',
): string {
  const scriptName = platform === 'windows' ? 'deploy-voxcpm.ps1' : 'deploy-voxcpm.sh'
  const url = `${scriptBaseUrl}/${scriptName}`
  const trimmed = modelPath.trim()

  if (platform === 'windows') {
    const pathArg = trimmed || 'D:\\models\\VoxCPM2'
    return `$f=[IO.Path]::GetTempFileName()+'deploy.ps1'; irm ${url} -OutFile $f; & $f '${pathArg}' '${model}' '${source}'; Remove-Item $f`
  }
  const pathArg = trimmed || '/data/models/VoxCPM2'
  return `curl -fsSL ${url} | bash -s -- '${pathArg}' '${model}' '${source}'`
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

export function createVoiceRecordName(params: VoiceGenerationParams, index: number, characterName = ''): string {
  const mode = voiceModeMeta.find((item) => item.id === params.mode)?.label ?? '语音'
  const text = params.text.trim().replace(/\s+/g, ' ')
  const suffix = text ? ` · ${text.slice(0, 12)}` : ''
  const prefix = characterName.trim() ? `${characterName.trim()} · ` : ''
  return `${prefix}${mode} ${index}${suffix}`
}

export function cloneVoiceParams(params: VoiceGenerationParams): VoiceGenerationParams {
  return {
    ...params,
    advanced: { ...params.advanced },
  }
}

export function buildReferenceFileData(params: VoiceGenerationParams): GradioFileData | null {
  if (!params.referenceAudioPath) return null
  return {
    path: params.referenceAudioPath,
    orig_name: params.referenceAudioName || undefined,
    meta: { _type: 'gradio.FileData' },
  }
}

export function buildGradioGeneratePayload(params: VoiceGenerationParams): GradioGeneratePayload {
  const usePromptText = params.mode === 'high-similarity-clone'
  const canUseControl = params.mode === 'voice-design' || params.mode === 'reference-clone'
  return {
    data: [
      params.text,
      canUseControl ? params.controlInstruction : '',
      buildReferenceFileData(params),
      usePromptText,
      usePromptText ? params.promptText : '',
      params.advanced.cfgValue,
      params.advanced.normalize,
      params.advanced.denoise,
      params.advanced.ditSteps,
    ],
  }
}

export function updateRecordName(records: VoiceGenerationRecord[], id: string, name: string): VoiceGenerationRecord[] {
  const trimmed = name.trim()
  if (!trimmed) return records
  return records.map((record) => (record.id === id ? { ...record, name: trimmed } : record))
}

export function deleteVoiceRecord(records: VoiceGenerationRecord[], id: string): VoiceGenerationRecord[] {
  return records.filter((record) => record.id !== id)
}

export function clearVoiceRecords(records: VoiceGenerationRecord[]): VoiceGenerationRecord[] {
  void records
  return []
}

export function prepareCloneFromRecord(
  currentParams: VoiceGenerationParams,
  record: VoiceGenerationRecord,
): VoiceGenerationParams {
  return {
    ...cloneVoiceParams(currentParams),
    mode: 'reference-clone',
    referenceAudioName: record.name,
    referenceAudioPath: record.audioPath,
  }
}
