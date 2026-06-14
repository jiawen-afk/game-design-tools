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

export interface UpscaleOptions {
  model: UpscaleModel
  scale: number
  tileSize: number
  ttaMode: boolean
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
}

const upscaylModelSet = new Set<string>(upscaylModels)
const allowedScales = new Set([2, 3, 4])

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
  return {
    model,
    scale,
    tileSize,
    ttaMode: options.ttaMode === true,
  }
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
  if (options.tileSize > 0) {
    args.push('-t', String(options.tileSize))
  }
  if (options.ttaMode) {
    args.push('-x')
  }
  return args
}
