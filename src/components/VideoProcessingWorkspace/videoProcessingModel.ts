import {
  getVideoOutputFormatDefinition,
  isVideoOutputFormat,
  type VideoOutputFormat,
} from './videoProcessingOutputFormatModel'

export type VideoQualityPreset = 'high' | 'balanced' | 'extreme'
export type VideoQualityMode = 'quality' | 'target-size'
export type VideoAudioMode = 'keep' | 'mute'
export type VideoAudioBitrate = 64 | 96 | 128 | 160
export type VideoJobPhase =
  | 'checking'
  | 'queued'
  | 'probing'
  | 'decoding'
  | 'upscaling'
  | 'encoding-pass-1'
  | 'encoding-pass-2'
  | 'encoding'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'canceled'

export interface VideoMediaProbe {
  path: string
  name: string
  size: number
  durationSeconds: number
  videoDurationSeconds: number
  width: number
  height: number
  averageFps: number
  videoCodec: string
  pixelFormat: string
  hasAudio: boolean
  audioCodec: string
  audioChannels: number
  audioSampleRate: number
}

export interface VideoProcessingSettings {
  outputFormat: VideoOutputFormat
  percent: number
  width: number
  height: number
  qualityMode: VideoQualityMode
  qualityPreset: VideoQualityPreset
  targetMb: number | null
  targetFps: number
  audioMode: VideoAudioMode
  audioKbps: VideoAudioBitrate
  upscaylModel: string
  gpuId: string
  tileSize: number
  ttaMode: boolean
  threadProfile: 'balanced' | 'low-memory' | 'throughput'
}

export interface VideoProcessingJob {
  id: string
  input: VideoMediaProbe
  settings: VideoProcessingSettings
  phase: VideoJobPhase
  progress: number
  message: string
  error: string
  outputPath: string
  outputSize: number
}

export interface VideoRuntimeAvailability {
  ffmpegInstalled: boolean
  upscaylInstalled: boolean
}

export type VideoJobAction =
  | { type: 'progress'; phase: VideoJobPhase; percent: number; message: string }
  | { type: 'complete'; outputPath: string; outputSize: number }
  | { type: 'fail'; error: string }
  | { type: 'cancel' }
  | { type: 'retry'; nextId: string }
  | { type: 'replace-settings'; settings: VideoProcessingSettings }

export const THEORA_QUALITY: Record<VideoQualityPreset, number> = {
  high: 8,
  balanced: 6,
  extreme: 4,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function normalizeEvenDimension(value: number) {
  const rounded = Math.max(2, Math.round(Number.isFinite(value) ? value : 2))
  return rounded % 2 === 0 ? rounded : rounded + 1
}

function normalizePercent(value: number) {
  return roundTo(clamp(value, 25, 400), 2)
}

export function deriveResizeFromPercent(sourceWidth: number, sourceHeight: number, percent: number) {
  const normalizedPercent = normalizePercent(percent)
  return {
    percent: normalizedPercent,
    width: normalizeEvenDimension(sourceWidth * normalizedPercent / 100),
    height: normalizeEvenDimension(sourceHeight * normalizedPercent / 100),
  }
}

export function deriveResizeFromWidth(sourceWidth: number, sourceHeight: number, width: number) {
  const normalizedWidth = normalizeEvenDimension(width)
  return deriveResizeFromPercent(sourceWidth, sourceHeight, normalizedWidth / Math.max(1, sourceWidth) * 100)
}

export function deriveResizeFromHeight(sourceWidth: number, sourceHeight: number, height: number) {
  const normalizedHeight = normalizeEvenDimension(height)
  return deriveResizeFromPercent(sourceWidth, sourceHeight, normalizedHeight / Math.max(1, sourceHeight) * 100)
}

export function getUpscaleScaleForPercent(percent: number): 2 | 3 | 4 | null {
  const normalizedPercent = normalizePercent(percent)
  if (normalizedPercent <= 100) return null
  if (normalizedPercent <= 200) return 2
  if (normalizedPercent <= 300) return 3
  return 4
}

export function calculateTargetVideoBitrateKbps(input: {
  targetMb: number
  durationSeconds: number
  audioKbps: number
}) {
  const targetMb = Number(input.targetMb)
  const durationSeconds = Number(input.durationSeconds)
  if (!Number.isFinite(targetMb) || targetMb <= 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('目标文件大小和视频时长必须大于 0。')
  }
  const usableBits = targetMb * 1024 * 1024 * 8 * 0.96
  const totalKbps = Math.floor(usableBits / durationSeconds / 1000)
  const videoKbps = totalKbps - Math.max(0, Number(input.audioKbps) || 0)
  if (videoKbps < 128) {
    throw new Error('目标文件大小过小，视频码率将低于 128 kbps。')
  }
  return videoKbps
}

function fileBaseName(fileName: string) {
  const normalized = String(fileName || 'video').replace(/\\/g, '/')
  const name = normalized.slice(normalized.lastIndexOf('/') + 1)
  const extensionIndex = name.lastIndexOf('.')
  return extensionIndex > 0 ? name.slice(0, extensionIndex) : name
}

function safeFileNamePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim() || 'video'
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(roundTo(value, 2))
}

export type VideoOutputNamingMode =
  | { mode: 'quality'; preset: VideoQualityPreset }
  | { mode: 'target-size'; targetMb: number }

export function buildVideoOutputName(
  sourceName: string,
  percent: number,
  mode: VideoOutputNamingMode,
  outputFormat: VideoOutputFormat,
) {
  const baseName = safeFileNamePart(fileBaseName(sourceName))
  const scaleLabel = `${formatNumber(normalizePercent(percent))}pct`
  const compressionLabel = mode.mode === 'quality'
    ? mode.preset
    : `target-${formatNumber(mode.targetMb)}mb`
  const extension = getVideoOutputFormatDefinition(outputFormat).extension
  return `${baseName}_${scaleLabel}_${compressionLabel}.${extension}`
}

export function resolveCollisionFreeOutputName(fileName: string, existingNames: Set<string>) {
  if (!existingNames.has(fileName)) return fileName
  const extensionIndex = fileName.toLowerCase().lastIndexOf('.ogv')
  const baseName = extensionIndex >= 0 ? fileName.slice(0, extensionIndex) : fileName
  for (let suffix = 2; suffix < Number.MAX_SAFE_INTEGER; suffix += 1) {
    const candidate = `${baseName}-${suffix}.ogv`
    if (!existingNames.has(candidate)) return candidate
  }
  throw new Error('无法生成不重复的输出文件名。')
}

export function toVideoFileUrl(filePath: string) {
  const normalized = String(filePath || '').replace(/\\/g, '/')
  const encoded = normalized
    .split('/')
    .map((part, index) => index === 0 && /^[A-Za-z]:$/.test(part) ? part : encodeURIComponent(part))
    .join('/')
  if (/^[A-Za-z]:\//.test(normalized)) return `file:///${encoded}`
  if (normalized.startsWith('//')) return `file:${encoded}`
  if (normalized.startsWith('/')) return `file://${encoded}`
  return encoded
}

export function getVideoParentDirectory(filePath: string) {
  const value = String(filePath || '')
  const separatorIndex = Math.max(value.lastIndexOf('\\'), value.lastIndexOf('/'))
  return separatorIndex > 0 ? value.slice(0, separatorIndex) : value
}

export function defaultVideoProcessingSettings(probe: VideoMediaProbe): VideoProcessingSettings {
  const resize = deriveResizeFromPercent(probe.width, probe.height, 100)
  return {
    ...resize,
    outputFormat: 'ogv',
    qualityMode: 'quality',
    qualityPreset: 'balanced',
    targetMb: null,
    targetFps: roundTo(clamp(probe.averageFps, 1, Math.max(1, probe.averageFps)), 3),
    audioMode: probe.hasAudio ? 'keep' : 'mute',
    audioKbps: 96,
    upscaylModel: 'upscayl-standard-4x',
    gpuId: 'auto',
    tileSize: 128,
    ttaMode: false,
    threadProfile: 'balanced',
  }
}

export function validateVideoProcessingSettings(
  probe: VideoMediaProbe,
  settings: VideoProcessingSettings,
  runtime: VideoRuntimeAvailability,
) {
  const errors: string[] = []
  if (!isVideoOutputFormat(settings.outputFormat)) errors.push('请选择受支持的视频导出格式。')
  if (!runtime.ffmpegInstalled) errors.push('请先安装视频处理运行包。')
  if (settings.percent > 100 && !runtime.upscaylInstalled) {
    errors.push('超过 100% 的任务必须安装 Upscayl GPU 运行包。')
  }
  if (settings.percent < 25 || settings.percent > 400) {
    errors.push('分辨率比例必须在 25% 到 400% 之间。')
  }
  if (settings.width < 2 || settings.height < 2 || settings.width % 2 !== 0 || settings.height % 2 !== 0) {
    errors.push('目标宽高必须是大于 0 的偶数。')
  }
  if (!Number.isFinite(settings.targetFps) || settings.targetFps < 1) {
    errors.push('目标帧率必须大于或等于 1。')
  } else if (settings.targetFps > probe.averageFps) {
    errors.push('目标帧率不能高于源视频帧率。')
  }
  if (!probe.hasAudio && settings.audioMode !== 'mute') {
    errors.push('源视频没有音轨，请选择静音导出。')
  }
  if (settings.qualityMode === 'target-size') {
    if (settings.targetMb === null || !Number.isFinite(settings.targetMb) || settings.targetMb <= 0) {
      errors.push('请输入大于 0 的目标文件大小。')
    } else {
      try {
        calculateTargetVideoBitrateKbps({
          targetMb: settings.targetMb,
          durationSeconds: probe.durationSeconds,
          audioKbps: settings.audioMode === 'mute' ? 0 : settings.audioKbps,
        })
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error))
      }
    }
  }
  return errors
}

export function videoJobReducer(job: VideoProcessingJob, action: VideoJobAction): VideoProcessingJob {
  if (action.type === 'progress') {
    return {
      ...job,
      phase: action.phase,
      progress: clamp(action.percent, 0, 100),
      message: action.message,
      error: '',
    }
  }
  if (action.type === 'complete') {
    return {
      ...job,
      phase: 'completed',
      progress: 100,
      message: '处理完成',
      error: '',
      outputPath: action.outputPath,
      outputSize: action.outputSize,
    }
  }
  if (action.type === 'fail') {
    return { ...job, phase: 'failed', message: '处理失败', error: action.error }
  }
  if (action.type === 'cancel') {
    return { ...job, phase: 'canceled', message: '已取消', error: '' }
  }
  if (action.type === 'retry') {
    return {
      ...job,
      id: action.nextId,
      phase: 'queued',
      progress: 0,
      message: '',
      error: '',
      outputPath: '',
      outputSize: 0,
    }
  }
  if (job.phase !== 'queued') return job
  return { ...job, settings: action.settings }
}
