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

export interface DesktopUpscaleApi {
  queryUpscaleStatus(): Promise<DesktopUpscaleRuntimeStatus>
  installUpscaleRuntime(options?: DesktopUpscaleInstallOptions): Promise<DesktopUpscaleRuntimeStatus>
  upscaleImage(options: DesktopUpscaleImageOptions): Promise<DesktopUpscaleImageResult>
  onUpscaleInstallProgress(listener: (progress: DesktopUpscaleInstallProgress) => void): () => void
}
