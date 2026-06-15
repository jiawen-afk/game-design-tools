import type { DownloadSource, ModelVersion } from './components/VoiceDeploymentWorkspace/voiceDeploymentModel'

export interface DesktopDirectoryInfo {
  name: string
  path: string
}

export interface DesktopFileInfo {
  name: string
  path: string
}

export interface DesktopFileReadResult extends DesktopFileInfo {
  data: ArrayBuffer | Uint8Array
}

export interface DesktopHardwareReport {
  platform: string
  arch: string
  cpuModel: string
  cpuCores: number
  memoryGb: number
  nvidiaSmi: string
}

export interface DesktopVoxcpmSetupOptions {
  modelPath: string
  model: ModelVersion
  source: DownloadSource
}

export interface DesktopVoxcpmSetupResult {
  started: boolean
  scriptPath: string
}

export interface DesktopCommandResult {
  ok: boolean
  output: string
}

export type DesktopAppUpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'latest'
  | 'error'
  | 'unavailable'

export interface DesktopAppUpdateStatus {
  appName: string
  currentVersion: string
  channel: string
  phase: DesktopAppUpdatePhase
  checking: boolean
  updateAvailable: boolean
  updateDownloaded: boolean
  latestVersion: string
  downloadPercent: number
  message: string
  error: string
}

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

export interface GameDesignToolsDesktopApi {
  selectPersonalSpaceDirectory(): Promise<DesktopDirectoryInfo | null>
  registerPersonalSpaceDirectory(rootPath: string): Promise<DesktopDirectoryInfo>
  ensurePersonalSpaceDirectory(parentPath: string, name: string, options?: { create?: boolean }): Promise<DesktopDirectoryInfo>
  getPersonalSpaceFile(parentPath: string, name: string, options?: { create?: boolean }): Promise<DesktopFileInfo>
  readPersonalSpaceFile(filePath: string): Promise<DesktopFileReadResult>
  writePersonalSpaceFile(filePath: string, data: ArrayBuffer): Promise<boolean>
  removePersonalSpaceEntry(parentPath: string, name: string): Promise<boolean>
  saveFile(fileName: string, data: ArrayBuffer): Promise<DesktopFileInfo | null>
  openPath(targetPath: string): Promise<boolean>
  getAppUpdateStatus(): Promise<DesktopAppUpdateStatus>
  checkForAppUpdates(): Promise<DesktopAppUpdateStatus>
  installAppUpdate(): Promise<boolean>
  onAppUpdateStatus(listener: (status: DesktopAppUpdateStatus) => void): () => void
  detectHardware(): Promise<DesktopHardwareReport>
  runVoxcpmSetup(options: DesktopVoxcpmSetupOptions): Promise<DesktopVoxcpmSetupResult>
  queryVoxcpmSetupStatus(): Promise<DesktopCommandResult>
  controlVoxcpmService(action: 'start' | 'stop' | 'restart' | 'status'): Promise<DesktopCommandResult>
  queryUpscaleStatus(): Promise<DesktopUpscaleRuntimeStatus>
  installUpscaleRuntime(options?: DesktopUpscaleInstallOptions): Promise<DesktopUpscaleRuntimeStatus>
  upscaleImage(options: DesktopUpscaleImageOptions): Promise<DesktopUpscaleImageResult>
  onUpscaleInstallProgress(listener: (progress: DesktopUpscaleInstallProgress) => void): () => void
}

declare global {
  interface Window {
    gameDesignToolsDesktop?: GameDesignToolsDesktopApi
  }
}

export function getDesktopApi() {
  return typeof window === 'undefined' ? undefined : window.gameDesignToolsDesktop
}

export function isDesktopRuntime() {
  return Boolean(getDesktopApi())
}
