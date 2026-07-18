import { useCallback, useEffect, useState } from 'react'
import { message } from 'antd'

import type {
  DesktopVideoRuntimeInstallProgress,
  DesktopVideoRuntimeStatus,
} from '../../desktopApi'
import { useUpscaleRuntime } from '../ImageProcessingWorkspace/useUpscaleRuntime'
import { videoProcessingService } from './videoProcessingService'

export function useVideoProcessingRuntime() {
  const [videoRuntimeStatus, setVideoRuntimeStatus] = useState<DesktopVideoRuntimeStatus | null>(null)
  const [videoRuntimeProgress, setVideoRuntimeProgress] = useState<DesktopVideoRuntimeInstallProgress | null>(null)
  const [videoRuntimeInstalling, setVideoRuntimeInstalling] = useState(false)
  const upscaleRuntime = useUpscaleRuntime({
    unavailableMessage: '当前不是桌面运行环境，无法执行视频高清化。',
    installUnavailableMessage: '当前不是桌面运行环境，无法安装 Upscayl GPU 运行包。',
  })

  useEffect(() => {
    void videoProcessingService.queryVideoRuntimeStatus()
      .then(setVideoRuntimeStatus)
      .catch((error) => setVideoRuntimeStatus({
        installed: false,
        version: '',
        path: '',
        ffmpegPath: '',
        ffprobePath: '',
        message: String(error),
      }))
    try {
      return videoProcessingService.onVideoRuntimeInstallProgress(setVideoRuntimeProgress)
    } catch {
      return undefined
    }
  }, [])

  const queryVideoRuntimeStatus = useCallback(async () => {
    const status = await videoProcessingService.queryVideoRuntimeStatus()
    setVideoRuntimeStatus(status)
    return status
  }, [])

  const installVideoRuntime = useCallback(async () => {
    setVideoRuntimeInstalling(true)
    try {
      const status = await videoProcessingService.installVideoRuntime()
      setVideoRuntimeStatus(status)
      if (status.installed) message.success('视频处理运行包已安装')
      else message.error(status.message || '视频处理运行包安装未完成')
    } catch (error) {
      message.error(`视频处理运行包安装失败：${String(error)}`)
    } finally {
      setVideoRuntimeInstalling(false)
    }
  }, [])

  return {
    installVideoRuntime,
    queryVideoRuntimeStatus,
    videoRuntimeInstalling,
    videoRuntimeProgress,
    videoRuntimeStatus,
    ...upscaleRuntime,
  }
}
