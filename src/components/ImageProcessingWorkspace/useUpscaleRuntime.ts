import { useCallback, useEffect, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi, type DesktopUpscaleInstallProgress, type DesktopUpscaleRuntimeStatus } from '../../desktopApi'

interface UseUpscaleRuntimeOptions {
  unavailableMessage: string
  installUnavailableMessage?: string
}

export function useUpscaleRuntime({
  unavailableMessage,
  installUnavailableMessage = '当前不是桌面运行环境，无法安装 Upscayl 运行包。',
}: UseUpscaleRuntimeOptions) {
  const [upscaleRuntimeStatus, setUpscaleRuntimeStatus] = useState<DesktopUpscaleRuntimeStatus | null>(null)
  const [upscaleInstallProgress, setUpscaleInstallProgress] = useState<DesktopUpscaleInstallProgress | null>(null)
  const [upscaleInstalling, setUpscaleInstalling] = useState(false)

  useEffect(() => {
    const api = getDesktopApi()
    if (!api) return
    void api.queryUpscaleStatus()
      .then(setUpscaleRuntimeStatus)
      .catch((error) => {
        setUpscaleRuntimeStatus({ installed: false, path: '', models: [], message: String(error) })
      })
    return api.onUpscaleInstallProgress((progress) => setUpscaleInstallProgress(progress))
  }, [])

  const queryUpscaleStatus = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) {
      const status = { installed: false, path: '', models: [], message: unavailableMessage }
      setUpscaleRuntimeStatus(status)
      return status
    }
    const status = await api.queryUpscaleStatus()
    setUpscaleRuntimeStatus(status)
    return status
  }, [unavailableMessage])

  const installUpscaleRuntime = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) {
      message.warning(installUnavailableMessage)
      return
    }
    setUpscaleInstalling(true)
    try {
      const status = await api.installUpscaleRuntime()
      setUpscaleRuntimeStatus(status)
      if (status.installed) message.success('高清化运行包已安装')
      else message.error(status.message ?? '运行包安装未完成')
    } catch (error) {
      message.error(`高清化运行包安装失败：${String(error)}`)
    } finally {
      setUpscaleInstalling(false)
    }
  }, [installUnavailableMessage])

  return {
    installUpscaleRuntime,
    queryUpscaleStatus,
    upscaleInstallProgress,
    upscaleInstalling,
    upscaleRuntimeStatus,
  }
}
