import {
  deriveResizeFromPercent,
  validateVideoProcessingSettings,
  videoJobReducer,
  type VideoJobAction,
  type VideoProcessingJob,
  type VideoProcessingSettings,
  type VideoRuntimeAvailability,
} from './videoProcessingModel'

const activePhases = new Set<VideoProcessingJob['phase']>([
  'checking',
  'probing',
  'decoding',
  'upscaling',
  'encoding-pass-1',
  'encoding-pass-2',
  'encoding',
  'verifying',
])

export function getNextQueuedVideoJob(
  jobs: VideoProcessingJob[],
  paused: boolean,
  activeJobId: string | null,
) {
  if (paused || activeJobId) return null
  return jobs.find((job) => job.phase === 'queued') ?? null
}

export function applySettingsToQueuedJobs(
  jobs: VideoProcessingJob[],
  settings: VideoProcessingSettings,
) {
  return jobs.map((job) => (
    job.phase === 'queued'
      ? videoJobReducer(job, {
          type: 'replace-settings',
          settings: {
            ...settings,
            ...deriveResizeFromPercent(job.input.width, job.input.height, settings.percent),
            targetFps: Math.min(settings.targetFps, job.input.averageFps),
            audioMode: job.input.hasAudio ? settings.audioMode : 'mute',
          },
        })
      : job
  ))
}

export function getVideoQueueValidationFailures(
  jobs: VideoProcessingJob[],
  runtime: VideoRuntimeAvailability,
) {
  return jobs
    .filter((job) => job.phase === 'queued')
    .map((job) => ({
      jobId: job.id,
      name: job.input.name,
      errors: validateVideoProcessingSettings(job.input, job.settings, runtime),
    }))
    .filter((failure) => failure.errors.length > 0)
}

export function updateVideoQueueJob(
  jobs: VideoProcessingJob[],
  jobId: string,
  action: VideoJobAction,
) {
  return jobs.map((job) => job.id === jobId ? videoJobReducer(job, action) : job)
}

export function createRetryVideoJob(job: VideoProcessingJob, nextId: string) {
  return videoJobReducer(job, { type: 'retry', nextId })
}

export function hasPendingOrActiveVideoJobs(jobs: VideoProcessingJob[]) {
  return jobs.some((job) => job.phase === 'queued' || activePhases.has(job.phase))
}

export function shouldAutoPauseVideoQueue(
  jobs: VideoProcessingJob[],
  paused: boolean,
  activeJobId: string | null,
  runningJobId: string | null,
) {
  return jobs.length > 0
    && !paused
    && !activeJobId
    && !runningJobId
    && !hasPendingOrActiveVideoJobs(jobs)
}
