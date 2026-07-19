import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'

import type { DesktopVideoDirectoryInfo, DesktopVideoProcessingProgress } from '../../desktopApi'
import {
  buildVideoOutputName,
  defaultVideoProcessingSettings,
  validateVideoProcessingSettings,
  type VideoMediaProbe,
  type VideoProcessingJob,
  type VideoProcessingSettings,
} from './videoProcessingModel'
import {
  applySettingsToQueuedJobs,
  createRetryVideoJob,
  getNextQueuedVideoJob,
  getVideoQueueValidationFailures,
  hasPendingOrActiveVideoJobs,
  updateVideoQueueJob,
} from './videoProcessingQueueModel'
import { videoProcessingService } from './videoProcessingService'

export interface UseVideoProcessingQueueOptions {
  ffmpegInstalled: boolean
  upscaylInstalled: boolean
}

function createJobId() {
  return `video-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function fallbackProbe(file: { name: string; path: string; size: number }): VideoMediaProbe {
  return {
    path: file.path,
    name: file.name,
    size: file.size,
    durationSeconds: 0,
    width: 2,
    height: 2,
    averageFps: 1,
    videoCodec: '',
    pixelFormat: '',
    hasAudio: false,
    audioCodec: '',
    audioChannels: 0,
    audioSampleRate: 0,
  }
}

function queuedJob(id: string, probe: VideoMediaProbe): VideoProcessingJob {
  return {
    id,
    input: probe,
    settings: defaultVideoProcessingSettings(probe),
    phase: 'queued',
    progress: 0,
    message: '等待处理',
    error: '',
    outputPath: '',
    outputSize: 0,
  }
}

export function useVideoProcessingQueue({ ffmpegInstalled, upscaylInstalled }: UseVideoProcessingQueueOptions) {
  const [jobs, setJobs] = useState<VideoProcessingJob[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [outputDirectory, setOutputDirectory] = useState<DesktopVideoDirectoryInfo | null>(null)
  const [paused, setPaused] = useState(true)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const runningRef = useRef<string | null>(null)
  const activeRunPromiseRef = useRef<Promise<void> | null>(null)
  const outputDirectorySelectionIdRef = useRef(0)

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null,
    [jobs, selectedJobId],
  )
  const hasPendingWork = hasPendingOrActiveVideoJobs(jobs)
  const queueValidationFailures = useMemo(() => getVideoQueueValidationFailures(jobs, {
    ffmpegInstalled,
    upscaylInstalled,
  }), [ffmpegInstalled, jobs, upscaylInstalled])

  useEffect(() => {
    try {
      return videoProcessingService.onVideoProcessingProgress((progress: DesktopVideoProcessingProgress) => {
        setJobs((current) => updateVideoQueueJob(current, progress.jobId, {
          type: 'progress',
          phase: progress.phase,
          percent: progress.percent,
          message: progress.message,
        }))
      })
    } catch {
      return undefined
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const selectionId = outputDirectorySelectionIdRef.current
    videoProcessingService.getVideoOutputDirectory()
      .then((directory) => {
        if (mounted && directory && selectionId === outputDirectorySelectionIdRef.current) {
          setOutputDirectory(directory)
        }
      })
      .catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [])

  const importVideos = useCallback(async () => {
    setImporting(true)
    try {
      const files = await videoProcessingService.chooseVideoFiles()
      for (const file of files) {
        const id = createJobId()
        const placeholder = queuedJob(id, fallbackProbe(file))
        placeholder.phase = 'probing'
        placeholder.message = '正在读取视频信息'
        setJobs((current) => [...current, placeholder])
        setSelectedJobId((current) => current ?? id)
        try {
          const probe = await videoProcessingService.probeVideoFile(file.path)
          setJobs((current) => current.map((job) => job.id === id ? queuedJob(id, probe) : job))
        } catch (error) {
          setJobs((current) => updateVideoQueueJob(current, id, { type: 'fail', error: String(error) }))
        }
      }
    } catch (error) {
      message.error(`导入视频失败：${String(error)}`)
    } finally {
      setImporting(false)
    }
  }, [])

  const chooseOutputDirectory = useCallback(async () => {
    outputDirectorySelectionIdRef.current += 1
    try {
      const directory = await videoProcessingService.chooseVideoOutputDirectory()
      if (directory) setOutputDirectory(directory)
      return directory
    } catch (error) {
      message.error(`选择输出目录失败：${String(error)}`)
      return null
    }
  }, [])

  const runJob = useCallback(async (job: VideoProcessingJob, directory: DesktopVideoDirectoryInfo) => {
    const validationErrors = validateVideoProcessingSettings(job.input, job.settings, {
      ffmpegInstalled,
      upscaylInstalled,
    })
    if (validationErrors.length > 0) {
      setJobs((current) => updateVideoQueueJob(current, job.id, { type: 'fail', error: validationErrors.join('\n') }))
      return
    }
    setJobs((current) => updateVideoQueueJob(current, job.id, {
      type: 'progress', phase: 'checking', percent: 0, message: '正在检查运行环境',
    }))
    const naming = job.settings.qualityMode === 'target-size'
      ? { mode: 'target-size' as const, targetMb: job.settings.targetMb ?? 0 }
      : { mode: 'quality' as const, preset: job.settings.qualityPreset }
    try {
      const result = await videoProcessingService.startVideoProcessingJob({
        jobId: job.id,
        inputPath: job.input.path,
        outputDirectory: directory.path,
        outputName: buildVideoOutputName(job.input.name, job.settings.percent, naming),
        probe: job.input,
        settings: job.settings,
      })
      setJobs((current) => updateVideoQueueJob(current, job.id, {
        type: 'complete', outputPath: result.outputPath, outputSize: result.outputSize,
      }))
    } catch (error) {
      const text = String(error)
      setJobs((current) => updateVideoQueueJob(current, job.id, text.includes('任务已取消')
        ? { type: 'cancel' }
        : { type: 'fail', error: text }))
    }
  }, [ffmpegInstalled, upscaylInstalled])

  useEffect(() => {
    if (!outputDirectory || runningRef.current) return
    const next = getNextQueuedVideoJob(jobs, paused, activeJobId)
    if (!next) return
    runningRef.current = next.id
    setActiveJobId(next.id)
    const promise = runJob(next, outputDirectory).finally(() => {
      runningRef.current = null
      activeRunPromiseRef.current = null
      setActiveJobId(null)
    })
    activeRunPromiseRef.current = promise
  }, [activeJobId, jobs, outputDirectory, paused, runJob])

  const startAll = useCallback(async () => {
    if (queueValidationFailures.length > 0) {
      const first = queueValidationFailures[0]
      setSelectedJobId(first.jobId)
      message.error(`${first.name}：${first.errors[0]}`)
      return false
    }
    let directory = outputDirectory
    if (!directory) directory = await chooseOutputDirectory()
    if (!directory) return false
    setPaused(false)
    return true
  }, [chooseOutputDirectory, outputDirectory, queueValidationFailures])

  const cancelActive = useCallback(async () => {
    if (!activeJobId) return false
    return videoProcessingService.cancelVideoProcessingJob(activeJobId)
  }, [activeJobId])

  const cancelAndClearQueue = useCallback(async () => {
    setPaused(true)
    if (activeJobId) await videoProcessingService.cancelVideoProcessingJob(activeJobId)
    try { await activeRunPromiseRef.current } catch {}
    setJobs((current) => current.filter((job) => ['completed', 'failed', 'canceled'].includes(job.phase)))
    return true
  }, [activeJobId])

  const updateSelectedSettings = useCallback((settings: VideoProcessingSettings) => {
    if (!selectedJobId) return
    setJobs((current) => current.map((job) => (
      job.id === selectedJobId && job.phase === 'queued' ? { ...job, settings } : job
    )))
  }, [selectedJobId])

  const applySelectedSettingsToAll = useCallback(() => {
    if (!selectedJob) return
    setJobs((current) => applySettingsToQueuedJobs(current, selectedJob.settings))
  }, [selectedJob])

  const retryJob = useCallback((jobId: string) => {
    const failed = jobs.find((job) => job.id === jobId)
    if (!failed || !['failed', 'canceled'].includes(failed.phase)) return
    const retry = createRetryVideoJob(failed, createJobId())
    setJobs((current) => [...current, retry])
    setSelectedJobId(retry.id)
  }, [jobs])

  const removeJob = useCallback((jobId: string) => {
    if (jobId === activeJobId) return
    setJobs((current) => current.filter((job) => job.id !== jobId))
    setSelectedJobId((current) => current === jobId ? null : current)
  }, [activeJobId])

  return {
    activeJobId,
    applySelectedSettingsToAll,
    cancelActive,
    cancelAndClearQueue,
    chooseOutputDirectory,
    hasPendingWork,
    importing,
    importVideos,
    jobs,
    outputDirectory,
    paused,
    queueValidationFailures,
    removeJob,
    retryJob,
    selectedJob,
    selectedJobId,
    setPaused,
    setSelectedJobId,
    startAll,
    updateSelectedSettings,
  }
}
