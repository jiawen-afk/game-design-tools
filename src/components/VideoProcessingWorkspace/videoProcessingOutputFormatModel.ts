export type VideoOutputFormat = 'ogv' | 'webm' | 'mp4'

export type VideoOutputQualityPreset = 'high' | 'balanced' | 'extreme'

export interface VideoOutputFormatDefinition {
  format: VideoOutputFormat
  extension: VideoOutputFormat
  label: string
  videoCodec: string
  audioCodec: string
  compressionLabel: string
  supportsTwoPassTargetSize: boolean
  compatibility: string
  patentNotice: string
}

export const VIDEO_OUTPUT_FORMATS: readonly VideoOutputFormatDefinition[] = [
  {
    format: 'ogv',
    extension: 'ogv',
    label: 'OGV',
    videoCodec: 'Theora',
    audioCodec: 'Vorbis',
    compressionLabel: 'Theora',
    supportsTwoPassTargetSize: true,
    compatibility: 'Godot 4.6 原生推荐，可直接用于 VideoStreamPlayer。',
    patentNotice: '',
  },
  {
    format: 'webm',
    extension: 'webm',
    label: 'WebM',
    videoCodec: 'VP9',
    audioCodec: 'Opus',
    compressionLabel: 'VP9',
    supportsTwoPassTargetSize: true,
    compatibility: '适合网页和现代播放器；Godot 4.6 原生 VideoStreamPlayer 不直接支持。',
    patentNotice: '',
  },
  {
    format: 'mp4',
    extension: 'mp4',
    label: 'MP4',
    videoCodec: 'H.264',
    audioCodec: 'AAC',
    compressionLabel: 'H.264',
    supportsTwoPassTargetSize: false,
    compatibility: '适合常规播放器与素材交换；Godot 4.6 原生 VideoStreamPlayer 不直接支持。',
    patentNotice: 'H.264/AAC 在部分产品和地区可能涉及专利授权，请按发行场景自行评估。',
  },
]

const qualityHints: Record<VideoOutputFormat, Record<VideoOutputQualityPreset, string>> = {
  ogv: {
    high: 'Theora q:v 8，文件更大',
    balanced: 'Theora q:v 6',
    extreme: 'Theora q:v 4，文件更小',
  },
  webm: {
    high: 'VP9 CRF 24，细节优先',
    balanced: 'VP9 CRF 32',
    extreme: 'VP9 CRF 40，文件更小',
  },
  mp4: {
    high: 'H.264 q:v 18，细节优先',
    balanced: 'H.264 q:v 24',
    extreme: 'H.264 q:v 30，文件更小',
  },
}

export function isVideoOutputFormat(value: unknown): value is VideoOutputFormat {
  return VIDEO_OUTPUT_FORMATS.some((item) => item.format === value)
}

export function getVideoOutputFormatDefinition(format: VideoOutputFormat) {
  const definition = VIDEO_OUTPUT_FORMATS.find((item) => item.format === format)
  if (!definition) throw new Error(`不支持的视频导出格式：${String(format)}`)
  return definition
}

export function getVideoQualityOptions(format: VideoOutputFormat) {
  const hints = qualityHints[format]
  return [
    { label: '高画质', value: 'high' as const, help: hints.high },
    { label: '均衡', value: 'balanced' as const, help: hints.balanced },
    { label: '极限压缩', value: 'extreme' as const, help: hints.extreme },
  ]
}
