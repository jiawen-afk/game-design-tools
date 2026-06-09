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
  detectHardware(): Promise<DesktopHardwareReport>
  runVoxcpmSetup(options: DesktopVoxcpmSetupOptions): Promise<DesktopVoxcpmSetupResult>
  queryVoxcpmSetupStatus(): Promise<DesktopCommandResult>
  controlVoxcpmService(action: 'start' | 'stop' | 'restart' | 'status'): Promise<DesktopCommandResult>
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
