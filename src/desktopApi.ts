import type { DownloadSource, ModelVersion } from './components/VoiceDeploymentWorkspace/voiceDeploymentModel'
import type {
  Asset,
  CreateLocalProjectInput,
  CreateRemoteProjectInput,
  LegacyProjectRows,
  Project,
  ProjectDatabaseProvider,
  ProjectWithSettings,
  UpdateProjectInput,
} from './components/ProjectStorage'

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

export interface ProjectConnectionProfileSummary {
  id: string
  type: 'database' | 'qiniu_kodo'
  displayName: string
  redactedSummary: string
  lastVerifiedAt: string | null
}

export interface ProjectConnectionVerificationResult {
  ok: boolean
  message: string
  lastVerifiedAt: string | null
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
  listProjectConnectionProfiles(type?: 'database' | 'qiniu_kodo'): Promise<ProjectConnectionProfileSummary[]>
  saveProjectConnectionProfile(input: unknown): Promise<ProjectConnectionProfileSummary>
  deleteProjectConnectionProfile(profileId: string): Promise<boolean>
  verifyProjectDatabaseProfile(profileId: string): Promise<ProjectConnectionVerificationResult>
  initializeProjectDatabaseSchema(profileId: string, dialect: 'postgresql' | 'mysql'): Promise<ProjectConnectionVerificationResult>
  verifyProjectKodoProfile(profileId: string, projectId: string): Promise<ProjectConnectionVerificationResult>
  initializeLocalProjectRepository(): Promise<boolean>
  createLocalProject(input: CreateLocalProjectInput): Promise<ProjectWithSettings>
  createLocalRemoteProject(input: CreateRemoteProjectInput): Promise<ProjectWithSettings>
  updateLocalProject(projectId: string, input: UpdateProjectInput): Promise<ProjectWithSettings | null>
  listLocalProjects(): Promise<Project[]>
  getLocalProject(projectId: string): Promise<ProjectWithSettings | null>
  importLocalProjectRows(rows: LegacyProjectRows): Promise<boolean>
  exportLocalProjectRows(projectId: string): Promise<LegacyProjectRows | null>
  listLocalProjectAssets(projectId: string): Promise<Asset[]>
  deleteLocalProject(projectId: string): Promise<boolean>
  createRemoteProject(input: {
    id: string
    name: string
    description: string
    databaseProvider: Extract<ProjectDatabaseProvider, 'postgresql' | 'mysql'>
    databaseProfileId: string
    storageProfileId: string
    now: string
  }): Promise<ProjectWithSettings>
  updateRemoteProject(projectId: string, input: UpdateProjectInput, databaseProfileId?: string): Promise<ProjectWithSettings | null>
  listRemoteProjects(databaseProfileId?: string): Promise<Project[]>
  getRemoteProject(projectId: string, databaseProfileId?: string): Promise<ProjectWithSettings | null>
  importRemoteProjectRows(rows: LegacyProjectRows, databaseProfileId?: string): Promise<boolean>
  exportRemoteProjectRows(projectId: string, databaseProfileId?: string): Promise<LegacyProjectRows | null>
  listRemoteProjectAssets(projectId: string, databaseProfileId?: string): Promise<Asset[]>
  deleteRemoteProject(projectId: string, databaseProfileId?: string): Promise<boolean>
  putProjectKodoObject(profileId: string, objectKey: string, data: ArrayBuffer, mimeType?: string): Promise<boolean>
  deleteProjectKodoObject(profileId: string, objectKey: string): Promise<boolean>
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
