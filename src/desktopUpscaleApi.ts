export interface DesktopUpscaleRuntimeStatus {
  installed: boolean
  path: string
  models: string[]
  message?: string
}

export interface DesktopUpscaleInstallProgress {
  phase: 'downloading' | 'verifying' | 'done' | 'error'
  fileName: string
  completed: number
  total: number
  percent: number
  message?: string
}

export interface DesktopUpscaleInstallOptions {
  mirrorBaseUrl?: string
}

export interface DesktopUpscaleOptions {
  model: string
  scale: number
  tileSize: number
  ttaMode: boolean
  gpuId: string
  threadProfile: string
}

export interface DesktopUpscaleImageOptions {
  inputName: string
  outputFormat: 'png' | 'webp' | 'jpg' | 'jpeg'
  data: ArrayBuffer
  options: DesktopUpscaleOptions
}

export interface DesktopUpscaleImageResult {
  name: string
  data: ArrayBuffer | Uint8Array
}

export type DesktopUpscaleOutputFormat = 'png' | 'webp' | 'jpg' | 'jpeg'

export interface DesktopUpscaleBatchItem {
  id: string
  inputName: string
  data: ArrayBuffer
}

export interface DesktopUpscaleImageBatchOptions {
  items: DesktopUpscaleBatchItem[]
  outputFormat: DesktopUpscaleOutputFormat
  options: DesktopUpscaleOptions
}

export interface DesktopUpscaleImageBatchResult {
  id: string
  name: string
  data: ArrayBuffer | Uint8Array
}

export interface DesktopUpscaleApi {
  queryUpscaleStatus(): Promise<DesktopUpscaleRuntimeStatus>
  installUpscaleRuntime(options?: DesktopUpscaleInstallOptions): Promise<DesktopUpscaleRuntimeStatus>
  upscaleImage(options: DesktopUpscaleImageOptions): Promise<DesktopUpscaleImageResult>
  upscaleImageBatch(options: DesktopUpscaleImageBatchOptions): Promise<DesktopUpscaleImageBatchResult[]>
  onUpscaleInstallProgress(listener: (progress: DesktopUpscaleInstallProgress) => void): () => void
}
