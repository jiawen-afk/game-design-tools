import type { DownloadSource } from './components/VoiceDeploymentWorkspace/voiceDeploymentModel'
import type { DesktopCommandResult } from './desktopSystemApi'

export type DesktopStableAudioModelId = 'small-sfx' | 'small-music' | 'medium'

export interface DesktopStableAudioSetupOptions {
  modelPath: string
  model: DesktopStableAudioModelId
  source: DownloadSource
}

export interface DesktopStableAudioSetupResult {
  started: boolean
  scriptPath: string
}

export interface DesktopStableAudioGenerateOptions {
  prompt: string
  durationSeconds: number
  seed: number | null
  outputName: string
  port?: number
}

export interface DesktopStableAudioGenerateResult {
  id: string
  name: string
  audioUrl: string
  audioPath: string | null
  prompt: string
  durationSeconds: number
  seed: number | null
  model: DesktopStableAudioModelId
  createdAt: string
}

export interface DesktopStableAudioRuntimeApi {
  runStableAudioSetup(options: DesktopStableAudioSetupOptions): Promise<DesktopStableAudioSetupResult>
  runStableAudioHfLogin(): Promise<DesktopStableAudioSetupResult>
  queryStableAudioSetupStatus(): Promise<DesktopCommandResult>
  controlStableAudioService(action: 'start' | 'stop' | 'restart' | 'status'): Promise<DesktopCommandResult>
  checkStableAudioService(port: number): Promise<DesktopCommandResult>
  generateStableAudio(options: DesktopStableAudioGenerateOptions): Promise<DesktopStableAudioGenerateResult>
}
