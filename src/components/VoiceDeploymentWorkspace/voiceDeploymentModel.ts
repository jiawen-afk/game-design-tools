export type HardwareStatus = 'unknown' | 'ready' | 'warning' | 'blocked'
export type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'disconnected'
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

export {
  evaluateHardware,
  modelVramRequirements,
  parseNvidiaSmiReport,
  voxcpmModels,
} from './voiceHardwareModel'

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

export function validateModelPath(modelPath: string) {
  const value = modelPath.trim()
  if (!value) return { valid: true, message: '留空时脚本会使用默认模型目录。' }
  return { valid: true, message: '模型路径已填写。' }
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
