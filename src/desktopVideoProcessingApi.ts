import type {
  VideoJobPhase,
  VideoMediaProbe,
  VideoProcessingSettings,
} from './components/VideoProcessingWorkspace/videoProcessingModel'

export interface DesktopVideoFileInfo {
  name: string
  path: string
  size: number
}

export interface DesktopVideoDirectoryInfo {
  name: string
  path: string
}

export interface DesktopVideoRuntimeStatus {
  installed: boolean
  version: string
  path: string
  ffmpegPath: string
  ffprobePath: string
  message: string
}

export interface DesktopVideoRuntimeInstallProgress {
  phase: 'downloading' | 'verifying' | 'extracting' | 'done' | 'error'
  completed: number
  total: number
  percent: number
  message: string
}

export interface DesktopVideoProcessingProgress {
  jobId: string
  phase: VideoJobPhase
  completed: number
  total: number
  percent: number
  message: string
}

export interface DesktopVideoFramePreviewOptions {
  inputPath: string
  timestampSeconds: number
  settings: VideoProcessingSettings
}

export interface DesktopVideoFramePreviewResult {
  sourcePath: string
  processedPath: string
  width: number
  height: number
}

export interface DesktopVideoProcessingJobOptions {
  jobId: string
  inputPath: string
  outputDirectory: string
  outputName: string
  probe: VideoMediaProbe
  settings: VideoProcessingSettings
}

export interface DesktopVideoProcessingResult {
  jobId: string
  outputPath: string
  outputSize: number
  durationMs: number
  probe: VideoMediaProbe
}

export interface DesktopVideoProcessingApi {
  chooseVideoFiles(): Promise<DesktopVideoFileInfo[]>
  chooseVideoOutputDirectory(): Promise<DesktopVideoDirectoryInfo | null>
  getVideoOutputDirectory(): Promise<DesktopVideoDirectoryInfo | null>
  queryVideoRuntimeStatus(): Promise<DesktopVideoRuntimeStatus>
  installVideoRuntime(): Promise<DesktopVideoRuntimeStatus>
  probeVideoFile(filePath: string): Promise<VideoMediaProbe>
  createVideoFramePreview(options: DesktopVideoFramePreviewOptions): Promise<DesktopVideoFramePreviewResult>
  startVideoProcessingJob(options: DesktopVideoProcessingJobOptions): Promise<DesktopVideoProcessingResult>
  cancelVideoProcessingJob(jobId: string): Promise<boolean>
  onVideoRuntimeInstallProgress(listener: (progress: DesktopVideoRuntimeInstallProgress) => void): () => void
  onVideoProcessingProgress(listener: (progress: DesktopVideoProcessingProgress) => void): () => void
}
