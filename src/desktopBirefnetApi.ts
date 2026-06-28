import type { DesktopCommandResult } from './desktopSystemApi'

export type DesktopBirefnetDevicePreference = 'auto' | 'cuda' | 'cpu'

export interface DesktopBirefnetSetupOptions {
  model: string
  port: number
  device?: DesktopBirefnetDevicePreference
}

export interface DesktopBirefnetSetupResult {
  started: boolean
  scriptPath: string
}

export interface DesktopBirefnetRemoveBackgroundOptions {
  inputName: string
  data: ArrayBuffer
  port?: number
}

export interface DesktopBirefnetRemoveBackgroundResult {
  name: string
  data: ArrayBuffer | Uint8Array
  width: number
  height: number
}

export interface DesktopBirefnetApi {
  runBirefnetSetup(options: DesktopBirefnetSetupOptions): Promise<DesktopBirefnetSetupResult>
  queryBirefnetSetupStatus(): Promise<DesktopCommandResult>
  controlBirefnetService(action: 'start' | 'stop' | 'restart' | 'status'): Promise<DesktopCommandResult>
  checkBirefnetService(port?: number): Promise<DesktopCommandResult>
  setBirefnetDevicePreference(device: DesktopBirefnetDevicePreference): Promise<DesktopCommandResult>
  removeImageBackground(options: DesktopBirefnetRemoveBackgroundOptions): Promise<DesktopBirefnetRemoveBackgroundResult>
}
