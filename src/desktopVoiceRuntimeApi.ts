import type { DownloadSource, ModelVersion } from './components/VoiceDeploymentWorkspace/voiceDeploymentModel'
import type { DesktopCommandResult } from './desktopSystemApi'

export interface DesktopVoxcpmSetupOptions {
  modelPath: string
  model: ModelVersion
  source: DownloadSource
}

export interface DesktopVoxcpmSetupResult {
  started: boolean
  scriptPath: string
}

export interface DesktopVoiceRuntimeApi {
  runVoxcpmSetup(options: DesktopVoxcpmSetupOptions): Promise<DesktopVoxcpmSetupResult>
  queryVoxcpmSetupStatus(): Promise<DesktopCommandResult>
  controlVoxcpmService(action: 'start' | 'stop' | 'restart' | 'status'): Promise<DesktopCommandResult>
}
