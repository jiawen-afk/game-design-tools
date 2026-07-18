import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { message, Modal } from 'antd'

import { useWorkspaceExitGuard } from '../../WorkspaceExitGuardContext'
import {
  deriveResizeFromHeight,
  deriveResizeFromPercent,
  deriveResizeFromWidth,
  getVideoParentDirectory,
  toVideoFileUrl,
  validateVideoProcessingSettings,
  type VideoProcessingSettings,
} from './videoProcessingModel'
import { videoProcessingService } from './videoProcessingService'
import { useVideoProcessingQueue } from './useVideoProcessingQueue'
import { useVideoProcessingRuntime } from './useVideoProcessingRuntime'

export interface VideoFramePreviewState {
  sourceUrl: string
  processedUrl: string
  width: number
  height: number
}

export function useVideoProcessingWorkspace() {
  const runtime = useVideoProcessingRuntime()
  const ffmpegInstalled = Boolean(runtime.videoRuntimeStatus?.installed)
  const upscaylInstalled = Boolean(runtime.upscaleRuntimeStatus?.installed)
  const queue = useVideoProcessingQueue({ ffmpegInstalled, upscaylInstalled })
  const [previewTimestamp, setPreviewTimestamp] = useState(0)
  const [preview, setPreview] = useState<VideoFramePreviewState | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const previewRequestIdRef = useRef(0)

  const cancelPreview = useCallback(async () => {
    const requestId = previewRequestIdRef.current + 1
    previewRequestIdRef.current = requestId
    setPreviewLoading(true)
    try {
      return await videoProcessingService.cancelVideoProcessingJob('__preview__')
    } catch {
      return false
    } finally {
      if (previewRequestIdRef.current === requestId) setPreviewLoading(false)
    }
  }, [])

  useEffect(() => () => {
    previewRequestIdRef.current += 1
    void videoProcessingService.cancelVideoProcessingJob('__preview__').catch(() => {})
  }, [])

  const selectedJob = queue.selectedJob
  const selectedEditable = selectedJob?.phase === 'queued'
  const validationErrors = useMemo(() => selectedJob
    ? validateVideoProcessingSettings(selectedJob.input, selectedJob.settings, {
        ffmpegInstalled,
        upscaylInstalled,
      })
    : [], [ffmpegInstalled, selectedJob, upscaylInstalled])

  useEffect(() => {
    void cancelPreview()
    setPreview(null)
    setPreviewError('')
    setPreviewTimestamp(0)
  }, [cancelPreview, selectedJob?.id])

  const updateSettings = useCallback((patch: Partial<VideoProcessingSettings>) => {
    if (!selectedJob || !selectedEditable) return
    void cancelPreview()
    queue.updateSelectedSettings({ ...selectedJob.settings, ...patch })
    setPreview(null)
    setPreviewError('')
  }, [cancelPreview, queue.updateSelectedSettings, selectedEditable, selectedJob])

  const setResizePercent = useCallback((percent: number) => {
    if (!selectedJob) return
    updateSettings(deriveResizeFromPercent(selectedJob.input.width, selectedJob.input.height, percent))
  }, [selectedJob, updateSettings])

  const setResizeWidth = useCallback((width: number) => {
    if (!selectedJob) return
    updateSettings(deriveResizeFromWidth(selectedJob.input.width, selectedJob.input.height, width))
  }, [selectedJob, updateSettings])

  const setResizeHeight = useCallback((height: number) => {
    if (!selectedJob) return
    updateSettings(deriveResizeFromHeight(selectedJob.input.width, selectedJob.input.height, height))
  }, [selectedJob, updateSettings])

  const generatePreview = useCallback(async () => {
    if (!selectedJob || validationErrors.length > 0 || queue.activeJobId || previewLoading) return
    const requestId = previewRequestIdRef.current + 1
    previewRequestIdRef.current = requestId
    setPreviewLoading(true)
    setPreviewError('')
    try {
      const result = await videoProcessingService.createVideoFramePreview({
        inputPath: selectedJob.input.path,
        timestampSeconds: previewTimestamp,
        settings: selectedJob.settings,
      })
      if (requestId !== previewRequestIdRef.current) return
      setPreview({
        sourceUrl: toVideoFileUrl(result.sourcePath),
        processedUrl: toVideoFileUrl(result.processedPath),
        width: result.width,
        height: result.height,
      })
    } catch (error) {
      if (requestId !== previewRequestIdRef.current) return
      const text = error instanceof Error ? error.message : String(error)
      setPreviewError(text)
      message.error(`生成预览失败：${text}`)
    } finally {
      if (requestId === previewRequestIdRef.current) setPreviewLoading(false)
    }
  }, [previewLoading, previewTimestamp, queue.activeJobId, selectedJob, validationErrors.length])

  const updatePreviewTimestamp = useCallback((value: number) => {
    void cancelPreview()
    setPreviewTimestamp(value)
    setPreview(null)
    setPreviewError('')
  }, [cancelPreview])

  const startAll = useCallback(async () => {
    if (previewLoading) return false
    return queue.startAll()
  }, [previewLoading, queue.startAll])

  const openOutputDirectory = useCallback(async (outputPath?: string) => {
    const targetPath = outputPath ? getVideoParentDirectory(outputPath) : queue.outputDirectory?.path
    if (!targetPath) return
    try {
      await videoProcessingService.openPath(targetPath)
    } catch (error) {
      message.error(`打开输出目录失败：${String(error)}`)
    }
  }, [queue.outputDirectory])

  const confirmLeave = useCallback(() => new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '离开视频处理工作台？',
      content: '离开后将取消正在生成的预览和处理任务，并移除尚未开始的任务。已完成和失败记录不会影响输出文件。',
      okText: '取消任务并离开',
      cancelText: '继续处理',
      okButtonProps: { danger: true },
      async onOk() {
        await cancelPreview()
        await queue.cancelAndClearQueue()
        resolve(true)
      },
      onCancel() {
        resolve(false)
      },
    })
  }), [cancelPreview, queue.cancelAndClearQueue])

  useWorkspaceExitGuard(queue.hasPendingWork || previewLoading ? confirmLeave : null)

  return {
    ...runtime,
    ...queue,
    ffmpegInstalled,
    generatePreview,
    openOutputDirectory,
    preview,
    previewError,
    previewLoading,
    previewTimestamp,
    selectedEditable,
    startAll,
    setPreviewTimestamp: updatePreviewTimestamp,
    setResizeHeight,
    setResizePercent,
    setResizeWidth,
    sourceVideoUrl: selectedJob ? toVideoFileUrl(selectedJob.input.path) : '',
    updateSettings,
    upscaylInstalled,
    validationErrors,
  }
}

export type VideoProcessingWorkspaceViewModel = ReturnType<typeof useVideoProcessingWorkspace>
