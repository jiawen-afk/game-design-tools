import type { DesktopAppUpdateApi } from './desktopAppUpdateApi'
import type { DesktopBirefnetApi } from './desktopBirefnetApi'
import type { DesktopFileSystemApi } from './desktopFileSystemApi'
import type { DesktopProjectObjectApi } from './desktopProjectObjectApi'
import type { DesktopProjectProfileApi } from './desktopProjectProfileApi'
import type { DesktopProjectRepositoryApi } from './desktopProjectRepositoryApi'
import type { DesktopSystemApi } from './desktopSystemApi'
import type { DesktopUpscaleApi } from './desktopUpscaleApi'
import type { DesktopVoiceRuntimeApi } from './desktopVoiceRuntimeApi'

export type {
  DesktopAppUpdateApi,
  DesktopAppUpdatePhase,
  DesktopAppUpdateStatus,
} from './desktopAppUpdateApi'
export type {
  DesktopBirefnetApi,
  DesktopBirefnetDevicePreference,
  DesktopBirefnetRemoveBackgroundOptions,
  DesktopBirefnetRemoveBackgroundResult,
  DesktopBirefnetSetupOptions,
  DesktopBirefnetSetupResult,
} from './desktopBirefnetApi'
export type {
  DesktopDirectoryInfo,
  DesktopFileInfo,
  DesktopFileReadResult,
  DesktopFileSystemApi,
} from './desktopFileSystemApi'
export type {
  DesktopProjectObjectApi,
  DesktopProjectObjectReadResult,
} from './desktopProjectObjectApi'
export type {
  DesktopProjectProfileApi,
  ProjectConnectionProfileDetail,
  ProjectConnectionProfileSummary,
  ProjectConnectionVerificationResult,
} from './desktopProjectProfileApi'
export type { DesktopProjectRepositoryApi } from './desktopProjectRepositoryApi'
export type {
  DesktopCommandResult,
  DesktopHardwareReport,
  DesktopSystemApi,
} from './desktopSystemApi'
export type {
  DesktopUpscaleApi,
  DesktopUpscaleImageOptions,
  DesktopUpscaleImageResult,
  DesktopUpscaleInstallOptions,
  DesktopUpscaleInstallProgress,
  DesktopUpscaleOptions,
  DesktopUpscaleRuntimeStatus,
} from './desktopUpscaleApi'
export type {
  DesktopVoiceRuntimeApi,
  DesktopVoxcpmSetupOptions,
  DesktopVoxcpmSetupResult,
} from './desktopVoiceRuntimeApi'

export interface GameDesignToolsDesktopApi extends
  DesktopFileSystemApi,
  DesktopAppUpdateApi,
  DesktopSystemApi,
  DesktopVoiceRuntimeApi,
  DesktopBirefnetApi,
  DesktopUpscaleApi,
  DesktopProjectProfileApi,
  DesktopProjectRepositoryApi,
  DesktopProjectObjectApi {}

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
