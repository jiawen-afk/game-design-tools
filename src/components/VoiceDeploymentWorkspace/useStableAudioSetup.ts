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
  const [desktopHfLoginBusy, setDesktopHfLoginBusy] = useState(false)
  const [desktopHfLoginResult, setDesktopHfLoginResult] = useState<DesktopStableAudioSetupResult | null>(null)
  const [desktopHfLoginError, setDesktopHfLoginError] = useState('')
  const [desktopDependencyStatusBusy, setDesktopDependencyStatusBusy] = useState(false)
  const [desktopDependencyStatusResult, setDesktopDependencyStatusResult] = useState<DesktopCommandResult | null>(null)
  const [desktopServiceBusy, setDesktopServiceBusy] = useState(false)
  const [desktopServiceResult, setDesktopServiceResult] = useState<DesktopCommandResult | null>(null)
  const checkRef = useRef(0)
  const lastStableAudioProbeRef = useRef('')

  const serviceUrl = `http://127.0.0.1:${port}`
  const connected = connectionStatus === 'connected'
  const desktopRuntime = isDesktopRuntime()

  const runCheck = useCallback(async (targetPort: number = port, reportResult = false) => {
    const id = ++checkRef.current
    setConnectionStatus('checking')
    const api = getDesktopApi()
    const result: DesktopCommandResult = api
      ? await api.checkStableAudioService(targetPort)
      : { ok: await checkStableAudioConnection(targetPort), output: '' }
    if (checkRef.current !== id) return null
    if (reportResult && !result.ok && result.output) setDesktopServiceResult(result)
    setConnectionStatus(result.ok ? 'connected' : 'disconnected')
    return result
  }, [port])

  const waitForDesktopConnection = useCallback(async (targetPort: number) => {
    const id = ++checkRef.current
    const api = getDesktopApi()
    return waitForDesktopServiceConnection({
      checkConnection: () => api
        ? api.checkStableAudioService(targetPort)
        : checkStableAudioConnection(targetPort),
      isCurrent: () => checkRef.current === id,
      onProbeResult: (result) => {
        if (!result.output) return
        lastStableAudioProbeRef.current = result.output
        if (!result.ok) {
          setDesktopServiceResult({
            ok: false,
            output: `正在等待 Stable Audio 3 模型就绪...\n${result.output}`,
          })
        }
      },
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

  const runDesktopHfLogin = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopHfLoginBusy(true)
    setDesktopHfLoginResult(null)
    setDesktopHfLoginError('')
    try {
      setDesktopHfLoginResult(await api.runStableAudioHfLogin())
    } catch (error) {
      setDesktopHfLoginError(error instanceof Error ? error.message : 'HuggingFace 登录终端启动失败，请先完成 Stable Audio 3 安装。')
    } finally {
      setDesktopHfLoginBusy(false)
    }
  }, [])

  const controlDesktopService = useCallback(async (action: 'start' | 'stop' | 'restart' | 'status') => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopServiceBusy(true)
    try {
      const result = await api.controlStableAudioService(action)
      setDesktopServiceResult(result)
      if (action === 'start' || action === 'restart') void runCheck(port, true)
      if (action === 'stop') {
        setConnectionStatus('disconnected')
        const probe = await runCheck(port, true)
        if (probe?.ok) {
          setDesktopServiceResult({
            ok: false,
            output: `${result.output || '停止服务命令已执行。'}\n停止后服务仍在响应，请稍后再试，或检查 Stable Audio 3 服务日志。`,
          })
        } else {
          setDesktopServiceResult(result)
        }
      }
    } finally {
      setDesktopServiceBusy(false)
    }
  }, [port, runCheck])

  const startDesktopService = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopServiceBusy(true)
    setDesktopDependencyStatusBusy(true)
    lastStableAudioProbeRef.current = ''
    try {
      await runDesktopServiceStartup({
        queryDependencyStatus: () => api.queryStableAudioSetupStatus(),
        startService: () => api.controlStableAudioService('start'),
        waitForConnection: () => waitForDesktopConnection(port),
        onDependencyStatus: setDesktopDependencyStatusResult,
        onDependencyStatusSettled: () => setDesktopDependencyStatusBusy(false),
        onServiceResult: setDesktopServiceResult,
        onStartCommandSettled: () => setDesktopServiceBusy(false),
        startingMessage: (output) => `${output || '服务启动命令已执行。'}\n正在检测 Stable Audio 3 模型访问和服务健康状态，首次启动可能需要登录或下载模型。`,
        readyMessage: (output) => `${output || '服务启动命令已执行。'}\nStable Audio 3 模型已就绪，音效服务可用。`,
        timeoutMessage: (output) => {
          const probe = lastStableAudioProbeRef.current
          return [
            output || '服务启动命令已执行。',
            '等待 Stable Audio 3 模型就绪超时，请查看 Stable Audio 3 服务日志。',
            probe ? `最后一次检测：\n${probe}` : '',
          ].filter(Boolean).join('\n')
        },
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
    desktopHfLoginBusy,
    desktopHfLoginResult,
    desktopHfLoginError,
    desktopDependencyStatusBusy,
    desktopDependencyStatusResult,
    desktopServiceBusy,
    desktopServiceResult,
    applyPort,
    runCheck,
    runDesktopSetup,
    runDesktopHfLogin,
    queryDesktopDependencyStatus,
    startDesktopService,
    controlDesktopService,
  }
}
