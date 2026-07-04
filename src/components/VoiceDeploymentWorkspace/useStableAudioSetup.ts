import { useCallback, useEffect, useRef, useState } from 'react'

import { getDesktopApi, isDesktopRuntime, type DesktopCommandResult, type DesktopStableAudioSetupResult } from '../../desktopApi'
import {
  runDesktopServiceStartup,
  waitForDesktopServiceConnection,
} from '../DesktopServiceRuntime/desktopServiceWorkflow'
import type { DownloadSource } from './voiceDeploymentModel'
import {
  defaultStableAudioPort,
  type StableAudioConnectionStatus,
  type StableAudioModelId,
} from './soundEffectModel'
import { checkStableAudioConnection } from './soundEffectService'

export function useStableAudioSetup() {
  const [port, setPort] = useState(defaultStableAudioPort)
  const [portInput, setPortInput] = useState(String(defaultStableAudioPort))
  const [connectionStatus, setConnectionStatus] = useState<StableAudioConnectionStatus>('idle')
  const [selectedModel, setSelectedModel] = useState<StableAudioModelId>('small-sfx')
  const [downloadSource, setDownloadSource] = useState<DownloadSource>('auto')
  const [modelPath, setModelPath] = useState('D:\\models\\StableAudio3')
  const [desktopSetupBusy, setDesktopSetupBusy] = useState(false)
  const [desktopSetupResult, setDesktopSetupResult] = useState<DesktopStableAudioSetupResult | null>(null)
  const [desktopSetupError, setDesktopSetupError] = useState('')
  const [desktopDependencyStatusBusy, setDesktopDependencyStatusBusy] = useState(false)
  const [desktopDependencyStatusResult, setDesktopDependencyStatusResult] = useState<DesktopCommandResult | null>(null)
  const [desktopServiceBusy, setDesktopServiceBusy] = useState(false)
  const [desktopServiceResult, setDesktopServiceResult] = useState<DesktopCommandResult | null>(null)
  const checkRef = useRef(0)

  const serviceUrl = `http://127.0.0.1:${port}`
  const connected = connectionStatus === 'connected'
  const desktopRuntime = isDesktopRuntime()

  const runCheck = useCallback(async (targetPort: number = port) => {
    const id = ++checkRef.current
    setConnectionStatus('checking')
    const ok = await checkStableAudioConnection(targetPort)
    if (checkRef.current !== id) return
    setConnectionStatus(ok ? 'connected' : 'disconnected')
  }, [port])

  const waitForDesktopConnection = useCallback(async (targetPort: number) => {
    const id = ++checkRef.current
    return waitForDesktopServiceConnection({
      checkConnection: () => checkStableAudioConnection(targetPort),
      isCurrent: () => checkRef.current === id,
      onStatus: setConnectionStatus,
    })
  }, [])

  useEffect(() => { void runCheck(defaultStableAudioPort) }, [runCheck])

  const applyPort = () => {
    const n = parseInt(portInput, 10)
    if (n > 0 && n < 65536) {
      setPort(n)
      void runCheck(n)
    }
  }

  const runDesktopSetup = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopSetupBusy(true)
    setDesktopSetupResult(null)
    setDesktopSetupError('')
    try {
      setDesktopSetupResult(await api.runStableAudioSetup({
        modelPath,
        model: selectedModel,
        source: downloadSource,
      }))
    } catch (error) {
      setDesktopSetupError(error instanceof Error ? error.message : 'Stable Audio 3 安装依赖启动失败，请检查桌面运行时。')
    } finally {
      setDesktopSetupBusy(false)
    }
  }, [downloadSource, modelPath, selectedModel])

  const queryDesktopDependencyStatus = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopDependencyStatusBusy(true)
    try {
      setDesktopDependencyStatusResult(await api.queryStableAudioSetupStatus())
    } finally {
      setDesktopDependencyStatusBusy(false)
    }
  }, [])

  const controlDesktopService = useCallback(async (action: 'start' | 'stop' | 'restart' | 'status') => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopServiceBusy(true)
    try {
      setDesktopServiceResult(await api.controlStableAudioService(action))
      if (action === 'start' || action === 'restart') void runCheck(port)
    } finally {
      setDesktopServiceBusy(false)
    }
  }, [port, runCheck])

  const startDesktopService = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopServiceBusy(true)
    setDesktopDependencyStatusBusy(true)
    try {
      await runDesktopServiceStartup({
        queryDependencyStatus: () => api.queryStableAudioSetupStatus(),
        startService: () => api.controlStableAudioService('start'),
        waitForConnection: () => waitForDesktopConnection(port),
        onDependencyStatus: setDesktopDependencyStatusResult,
        onDependencyStatusSettled: () => setDesktopDependencyStatusBusy(false),
        onServiceResult: setDesktopServiceResult,
        timeoutMessage: (output) => `${output || '服务启动命令已执行。'}\n等待连接超时，请查看 Stable Audio 3 服务日志。`,
      })
    } finally {
      setDesktopDependencyStatusBusy(false)
      setDesktopServiceBusy(false)
    }
  }, [port, waitForDesktopConnection])

  return {
    port,
    portInput,
    setPortInput,
    connectionStatus,
    selectedModel,
    setSelectedModel,
    downloadSource,
    setDownloadSource,
    modelPath,
    setModelPath,
    serviceUrl,
    connected,
    desktopRuntime,
    desktopSetupBusy,
    desktopSetupResult,
    desktopSetupError,
    desktopDependencyStatusBusy,
    desktopDependencyStatusResult,
    desktopServiceBusy,
    desktopServiceResult,
    applyPort,
    runCheck,
    runDesktopSetup,
    queryDesktopDependencyStatus,
    startDesktopService,
    controlDesktopService,
  }
}
