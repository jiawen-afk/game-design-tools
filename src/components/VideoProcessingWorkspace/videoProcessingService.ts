import { getDesktopApi } from '../../desktopApi'
import type {
  DesktopVideoFramePreviewOptions,
  DesktopVideoProcessingJobOptions,
  DesktopVideoProcessingProgress,
  DesktopVideoRuntimeInstallProgress,
} from '../../desktopApi'

function requireVideoDesktopApi() {
  const api = getDesktopApi()
  if (!api) throw new Error('当前不是桌面运行环境，无法处理视频。')
  return api
}

export const videoProcessingService = {
  chooseVideoFiles: () => requireVideoDesktopApi().chooseVideoFiles(),
  chooseVideoOutputDirectory: () => requireVideoDesktopApi().chooseVideoOutputDirectory(),
  queryVideoRuntimeStatus: async () => requireVideoDesktopApi().queryVideoRuntimeStatus(),
  installVideoRuntime: () => requireVideoDesktopApi().installVideoRuntime(),
  probeVideoFile: (filePath: string) => requireVideoDesktopApi().probeVideoFile(filePath),
  createVideoFramePreview: (options: DesktopVideoFramePreviewOptions) => (
    requireVideoDesktopApi().createVideoFramePreview(options)
  ),
  startVideoProcessingJob: (options: DesktopVideoProcessingJobOptions) => (
    requireVideoDesktopApi().startVideoProcessingJob(options)
  ),
  cancelVideoProcessingJob: (jobId: string) => requireVideoDesktopApi().cancelVideoProcessingJob(jobId),
  openPath: (targetPath: string) => requireVideoDesktopApi().openPath(targetPath),
  onVideoRuntimeInstallProgress: (listener: (progress: DesktopVideoRuntimeInstallProgress) => void) => (
    requireVideoDesktopApi().onVideoRuntimeInstallProgress(listener)
  ),
  onVideoProcessingProgress: (listener: (progress: DesktopVideoProcessingProgress) => void) => (
    requireVideoDesktopApi().onVideoProcessingProgress(listener)
  ),
}
