export type StableAudioModelId = 'small-sfx' | 'small-music' | 'medium'
export type StableAudioConnectionStatus = 'idle' | 'checking' | 'connected' | 'disconnected'

export interface StableAudioModelMeta {
  id: StableAudioModelId
  label: string
  hardware: string
  parameterCount: string
  maxDurationSeconds: number
  recommendedUse: string
  note: string
}

export interface SoundEffectParams {
  model: StableAudioModelId
  prompt: string
  durationSeconds: number
  seed: number | null
  outputName: string
}

export interface SoundEffectRecord {
  id: string
  name: string
  createdAt: string
  audioUrl: string
  audioPath: string | null
  prompt: string
  durationSeconds: number
  seed: number | null
  model: StableAudioModelId
}

export const defaultStableAudioPort = 8818

export const stableAudioModels: StableAudioModelMeta[] = [
  {
    id: 'small-sfx',
    label: 'Small SFX',
    hardware: 'CPU / 轻量设备',
    parameterCount: '433M',
    maxDurationSeconds: 120,
    recommendedUse: '游戏音效、环境声、foley、UI 音',
    note: '默认推荐。专门面向音效，适合本地快速生成短声音资产。',
  },
  {
    id: 'small-music',
    label: 'Small Music',
    hardware: 'CPU / 轻量设备',
    parameterCount: '433M',
    maxDurationSeconds: 120,
    recommendedUse: '短音乐、loop、转场音乐',
    note: '专门面向音乐。适合生成短配乐和循环段，不作为音效默认模型。',
  },
  {
    id: 'medium',
    label: 'Medium',
    hardware: 'CUDA GPU',
    parameterCount: '1.4B',
    maxDurationSeconds: 380,
    recommendedUse: '更长、更高质量的音频',
    note: '质量和时长更好，但需要 CUDA GPU 和更完整的本机推理环境。',
  },
]

export const defaultSoundEffectParams: SoundEffectParams = {
  model: 'small-sfx',
  prompt: 'short fantasy sword slash impact',
  durationSeconds: 6,
  seed: null,
  outputName: '',
}

export function clampSoundDuration(model: StableAudioModelId, seconds: number) {
  const meta = stableAudioModels.find((item) => item.id === model) ?? stableAudioModels[0]!
  return Math.max(1, Math.min(meta.maxDurationSeconds, Math.round(Number(seconds) || 1)))
}

export function buildStableAudioGeneratePayload(params: SoundEffectParams) {
  return {
    prompt: params.prompt.trim(),
    durationSeconds: clampSoundDuration(params.model, params.durationSeconds),
    seed: Number.isFinite(params.seed) ? params.seed : null,
    outputName: params.outputName.trim(),
  }
}

export function createSoundEffectRecordName(params: SoundEffectParams, index: number) {
  const prompt = params.prompt.trim().replace(/\s+/g, ' ')
  const suffix = prompt ? ` · ${prompt.slice(0, 11)}` : ''
  return `${params.outputName.trim() || `音效 ${index}`}${suffix}`
}
