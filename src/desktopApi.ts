import type { DesktopAppUpdateApi } from './desktopAppUpdateApi'
import type { DesktopAudioEditApi } from './desktopAudioEditApi'
import type { DesktopBirefnetApi } from './desktopBirefnetApi'
import type { DesktopFileSystemApi } from './desktopFileSystemApi'
import type { DesktopImageEncodingApi } from './desktopImageEncodingApi'
import type { DesktopProjectObjectApi } from './desktopProjectObjectApi'
import type { DesktopProjectProfileApi } from './desktopProjectProfileApi'
import type { DesktopProjectRepositoryApi } from './desktopProjectRepositoryApi'
import type { DesktopStableAudioRuntimeApi } from './desktopStableAudioRuntimeApi'
import type { DesktopSystemApi } from './desktopSystemApi'
import type { DesktopUpscaleApi } from './desktopUpscaleApi'
import type { DesktopVideoProcessingApi } from './desktopVideoProcessingApi'
import type { DesktopVoiceRuntimeApi } from './desktopVoiceRuntimeApi'

export type {
  DesktopAppUpdateApi,
  DesktopAppUpdatePhase,
  DesktopAppUpdateStatus,
} from './desktopAppUpdateApi'
export type {
  DesktopAudioEditApi,
  DesktopAudioEditSaveOptions,
  DesktopAudioEditSaveResult,
  DesktopAudioFileReadResult,
} from './desktopAudioEditApi'
export type {
  DesktopBirefnetApi,
  DesktopBirefnetDevicePreference,
  DesktopBirefnetRemoveBackgroundOptions,
  DesktopBirefnetRemoveBackgroundResult,
  DesktopBirefnetSetupOptions,
  DesktopBirefnetSetupResult,
} from './desktopBirefnetApi'
export type {
  DesktopImageEncodingApi,
  DesktopImageEncodingOptions,
  DesktopImageEncodingResult,
} from './desktopImageEncodingApi'
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
  DesktopStableAudioGenerateOptions,
  DesktopStableAudioGenerateResult,
  DesktopStableAudioModelId,
  DesktopStableAudioRuntimeApi,
  DesktopStableAudioSetupOptions,
  DesktopStableAudioSetupResult,
  DesktopStableAudioStatusOptions,
} from './desktopStableAudioRuntimeApi'
export type {
  DesktopCommandResult,
  DesktopHardwareReport,
  DesktopSystemApi,
} from './desktopSystemApi'
export type {
  DesktopUpscaleApi,
  DesktopUpscaleBatchItem,
  DesktopUpscaleImageBatchOptions,
  DesktopUpscaleImageBatchResult,
  DesktopUpscaleImageOptions,
  DesktopUpscaleImageResult,
  DesktopUpscaleInstallOptions,
  DesktopUpscaleInstallProgress,
  DesktopUpscaleOptions,
  DesktopUpscaleOutputFormat,
  DesktopUpscaleRuntimeStatus,
} from './desktopUpscaleApi'
export type {
  DesktopVideoDirectoryInfo,
  DesktopVideoFileInfo,
  DesktopVideoFramePreviewOptions,
  DesktopVideoFramePreviewResult,
  DesktopVideoProcessingApi,
  DesktopVideoProcessingJobOptions,
  DesktopVideoProcessingProgress,
  DesktopVideoProcessingResult,
  DesktopVideoRuntimeInstallProgress,
  DesktopVideoRuntimeStatus,
} from './desktopVideoProcessingApi'
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
  DesktopStableAudioRuntimeApi,
  DesktopBirefnetApi,
  DesktopImageEncodingApi,
  DesktopUpscaleApi,
  DesktopProjectProfileApi,
  DesktopProjectRepositoryApi,
  DesktopProjectObjectApi,
  DesktopAudioEditApi,
  DesktopVideoProcessingApi {}

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
