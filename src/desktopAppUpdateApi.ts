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

export interface DesktopAppUpdateApi {
  getAppUpdateStatus(): Promise<DesktopAppUpdateStatus>
  checkForAppUpdates(): Promise<DesktopAppUpdateStatus>
  installAppUpdate(): Promise<boolean>
  onAppUpdateStatus(listener: (status: DesktopAppUpdateStatus) => void): () => void
}
