export interface DesktopHardwareReport {
  platform: string
  arch: string
  cpuModel: string
  cpuCores: number
  memoryGb: number
  nvidiaSmi: string
}

export interface DesktopCommandResult {
  ok: boolean
  output: string
}

export interface DesktopSystemApi {
  detectHardware(): Promise<DesktopHardwareReport>
}
