export const upscaylRuntimeVersion = 'upscayl-2.15-runtime'

export const upscaylModels = [
  'upscayl-standard-4x',
  'upscayl-lite-4x',
  'high-fidelity-4x',
  'remacri-4x',
  'ultramix-balanced-4x',
  'ultrasharp-4x',
  'digital-art-4x',
] as const

export type UpscaleModel = typeof upscaylModels[number]

export const upscaylGpuOptions = [
  { value: '0', label: 'GPU 0' },
  { value: 'auto', label: '自动选择' },
  { value: '1', label: 'GPU 1' },
  { value: '2', label: 'GPU 2' },
] as const

export type UpscaleGpuId = typeof upscaylGpuOptions[number]['value']

export const upscaylThreadProfileOptions = [
  { value: 'balanced', label: '均衡 · 1:2:2', cliValue: '1:2:2' },
  { value: 'low-memory', label: '保守 · 1:1:1', cliValue: '1:1:1' },
  { value: 'throughput', label: '加速 · 2:2:2', cliValue: '2:2:2' },
] as const

export type UpscaleThreadProfile = typeof upscaylThreadProfileOptions[number]['value']

export interface UpscaleOptions {
  model: UpscaleModel
  scale: number
  tileSize: number
  ttaMode: boolean
  gpuId: UpscaleGpuId
  threadProfile: UpscaleThreadProfile
}

export interface UpscaleRuntimeStatus {
  installed: boolean
  path: string
  models: string[]
  message?: string
}

export interface UpscaleInstallFile {
  url: string
  targetPath: string
}

export interface UpscaleInstallPlan {
  runtimeVersion: string
  files: UpscaleInstallFile[]
}

export interface UpscaleCliArgsInput {
  inputPath: string
  outputPath: string
  modelsPath: string
  format: 'png' | 'webp' | 'jpg' | 'jpeg'
  options: Partial<UpscaleOptions>
}

export const defaultUpscaleOptions: UpscaleOptions = {
  model: 'upscayl-standard-4x',
  scale: 4,
  tileSize: 0,
  ttaMode: false,
  gpuId: '0',
  threadProfile: 'balanced',
}

const upscaylModelSet = new Set<string>(upscaylModels)
const allowedScales = new Set([2, 3, 4])
const upscaylGpuIdSet = new Set<string>(upscaylGpuOptions.map((option) => option.value))
const upscaylThreadProfileSet = new Set<string>(upscaylThreadProfileOptions.map((option) => option.value))

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function normalizeUpscaleOptions(options: Partial<UpscaleOptions>): UpscaleOptions {
  const model = options.model && upscaylModelSet.has(options.model)
    ? options.model
    : defaultUpscaleOptions.model
  const scale = allowedScales.has(Number(options.scale)) ? Number(options.scale) : defaultUpscaleOptions.scale
  const tileSize = Number.isFinite(options.tileSize) && Number(options.tileSize) >= 32
    ? Math.round(Number(options.tileSize))
    : 0
  const gpuId = options.gpuId && upscaylGpuIdSet.has(options.gpuId)
    ? options.gpuId
    : defaultUpscaleOptions.gpuId
  const threadProfile = options.threadProfile && upscaylThreadProfileSet.has(options.threadProfile)
    ? options.threadProfile
    : defaultUpscaleOptions.threadProfile
  return {
    model,
    scale,
    tileSize,
    ttaMode: options.ttaMode === true,
    gpuId,
    threadProfile,
  }
}

export function getUpscaylThreadProfileCliValue(profile: UpscaleThreadProfile): string {
  return upscaylThreadProfileOptions.find((option) => option.value === profile)?.cliValue
    ?? upscaylThreadProfileOptions[0].cliValue
}

export function canUseUpscaleForExport(enabled: boolean, status: UpscaleRuntimeStatus | null): boolean {
  return enabled && Boolean(status?.installed)
}

export function getUpscaleInstallPlan(rawBaseUrl: string): UpscaleInstallPlan {
  const base = trimTrailingSlash(rawBaseUrl)
  const binaryFiles: UpscaleInstallFile[] = [
    { url: `${base}/resources/win/bin/upscayl-bin.exe`, targetPath: 'bin/upscayl-bin.exe' },
    { url: `${base}/resources/win/bin/vcomp140.dll`, targetPath: 'bin/vcomp140.dll' },
    { url: `${base}/resources/win/bin/vcomp140d.dll`, targetPath: 'bin/vcomp140d.dll' },
  ]
  const modelFiles = upscaylModels.flatMap((model) => [
    { url: `${base}/resources/models/${model}.param`, targetPath: `models/${model}.param` },
    { url: `${base}/resources/models/${model}.bin`, targetPath: `models/${model}.bin` },
  ])

  return {
    runtimeVersion: upscaylRuntimeVersion,
    files: [...binaryFiles, ...modelFiles],
  }
}

export function buildUpscaylCliArgs(input: UpscaleCliArgsInput): string[] {
  const options = normalizeUpscaleOptions(input.options)
  const args = [
    '-i', input.inputPath,
    '-o', input.outputPath,
    '-m', input.modelsPath,
    '-n', options.model,
    '-f', input.format === 'jpeg' ? 'jpg' : input.format,
    '-s', String(options.scale),
    '-c', '0',
  ]
  if (options.gpuId !== 'auto') {
    args.push('-g', options.gpuId)
  }
  args.push('-j', getUpscaylThreadProfileCliValue(options.threadProfile))
  if (options.tileSize > 0) {
    args.push('-t', String(options.tileSize))
  }
  if (options.ttaMode) {
    args.push('-x')
  }
  return args
}
