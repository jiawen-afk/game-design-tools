import { useCallback, useEffect, useMemo, useState } from 'react'

import { appReleaseTag, appVersion } from '../appReleaseMetadata'
import { getDesktopApi, type DesktopAppUpdateStatus } from '../desktopApi'

const fallbackAppUpdateStatus: DesktopAppUpdateStatus = {
  appName: 'Game Design Tools',
  currentVersion: appVersion,
  channel: appReleaseTag,
  phase: 'unavailable',
  checking: false,
  updateAvailable: false,
  updateDownloaded: false,
  latestVersion: '',
  downloadPercent: 0,
  message: '浏览器预览环境不支持自动更新。',
  error: '',
}

export function useAppUpdateStatus() {
  const [status, setStatus] = useState<DesktopAppUpdateStatus>(fallbackAppUpdateStatus)
  const [busy, setBusy] = useState(false)
  const desktopApi = useMemo(() => getDesktopApi(), [])

  useEffect(() => {
    if (!desktopApi) return
    let mounted = true
    void desktopApi.getAppUpdateStatus()
      .then((nextStatus) => {
        if (mounted) setStatus(nextStatus)
      })
      .catch(() => {
        if (mounted) {
          setStatus((current) => ({
            ...current,
            phase: 'error',
            error: '无法读取更新状态。',
            message: '无法读取更新状态。',
          }))
        }
      })

    const unsubscribe = desktopApi.onAppUpdateStatus((nextStatus) => {
      if (mounted) setStatus(nextStatus)
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [desktopApi])

  const checkForUpdates = useCallback(async () => {
    if (!desktopApi) return
    setBusy(true)
    try {
      setStatus(await desktopApi.checkForAppUpdates())
    } catch (error) {
      setStatus((current) => ({
        ...current,
        phase: 'error',
        checking: false,
        error: error instanceof Error ? error.message : '检查更新失败。',
        message: error instanceof Error ? error.message : '检查更新失败。',
      }))
    } finally {
      setBusy(false)
    }
  }, [desktopApi])

  const installUpdate = useCallback(async () => {
    if (!desktopApi) return
    await desktopApi.installAppUpdate()
  }, [desktopApi])

  return {
    status,
    canCheck: Boolean(desktopApi) && !status.checking && status.phase !== 'downloading' && !busy,
    canInstall: Boolean(desktopApi) && status.updateDownloaded,
    checkForUpdates,
    installUpdate,
  }
}
