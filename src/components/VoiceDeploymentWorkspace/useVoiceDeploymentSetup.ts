import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  type ConnectionStatus,
  type DownloadSource,
  type HardwareEvaluation,
  type HardwareReport,
  type ModelVersion,
  buildGradioApiCall,
  buildServiceUrl,
  defaultPort,
  evaluateHardware,
  parseNvidiaSmiReport,
  validateModelPath,
} from './voiceDeploymentModel'
import { checkConnection } from './voiceDeploymentService'
import { getDesktopApi, isDesktopRuntime, type DesktopCommandResult, type DesktopVoxcpmSetupResult } from '../../desktopApi'
import {
  runDesktopServiceStartup,
  waitForDesktopServiceConnection,
} from '../DesktopServiceRuntime/desktopServiceWorkflow'

export function useVoiceDeploymentSetup() {
  const [port, setPort] = useState(defaultPort)
  const [portInput, setPortInput] = useState(String(defaultPort))
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [modelPath, setModelPath] = useState('')
  const [selectedModel, setSelectedModel] = useState<ModelVersion>('VoxCPM2')
  const [downloadSource, setDownloadSource] = useState<DownloadSource>('auto')
  const [desktopHardware, setDesktopHardware] = useState<HardwareReport | null>(null)
  const [desktopHardwareEvaluation, setDesktopHardwareEvaluation] = useState<HardwareEvaluation | null>(null)
  const [desktopHardwareBusy, setDesktopHardwareBusy] = useState(false)
  const [desktopSetupBusy, setDesktopSetupBusy] = useState(false)
  const [desktopSetupResult, setDesktopSetupResult] = useState<DesktopVoxcpmSetupResult | null>(null)
  const [desktopSetupError, setDesktopSetupError] = useState('')
  const [desktopDependencyStatusBusy, setDesktopDependencyStatusBusy] = useState(false)
  const [desktopDependencyStatusResult, setDesktopDependencyStatusResult] = useState<DesktopCommandResult | null>(null)
  const [desktopServiceBusy, setDesktopServiceBusy] = useState(false)
  const [desktopServiceResult, setDesktopServiceResult] = useState<DesktopCommandResult | null>(null)
  const checkRef = useRef(0)

  const modelValidation = useMemo(() => validateModelPath(modelPath), [modelPath])
  const apiCallExample = useMemo(() => buildGradioApiCall({ port, text: '你好，这是一段测试语音。' }), [port])
  const serviceUrl = buildServiceUrl(port)
  const connected = connectionStatus === 'connected'
  const desktopRuntime = isDesktopRuntime()

  const runCheck = useCallback(async (targetPort: number) => {
    const id = ++checkRef.current
    setConnectionStatus('checking')
    const ok = await checkConnection(targetPort)
    if (checkRef.current !== id) return
    setConnectionStatus(ok ? 'connected' : 'disconnected')
  }, [])

  const waitForDesktopConnection = useCallback(async (targetPort: number) => {
    const id = ++checkRef.current
    return waitForDesktopServiceConnection({
      checkConnection: () => checkConnection(targetPort),
      isCurrent: () => checkRef.current === id,
      onStatus: setConnectionStatus,
    })
  }, [])

  useEffect(() => { runCheck(defaultPort) }, [runCheck])

  const applyPort = () => {
    const n = parseInt(portInput, 10)
    if (n > 0 && n < 65536) {
      setPort(n)
      runCheck(n)
    }
  }

  const selectModel = (model: ModelVersion) => {
    setSelectedModel(model)
  }

  const detectDesktopHardware = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopHardwareBusy(true)
    try {
      const report = await api.detectHardware()
      const gpuReport = parseNvidiaSmiReport(report.nvidiaSmi)
      const nextHardware: HardwareReport = gpuReport ?? { gpuName: report.cpuModel, vramGb: 0, device: 'cpu' }
      setDesktopHardware(nextHardware)
      const nextEvaluation = evaluateHardware(nextHardware)
      setDesktopHardwareEvaluation(nextEvaluation)
      if (nextEvaluation.recommendedModel) setSelectedModel(nextEvaluation.recommendedModel)
    } finally {
      setDesktopHardwareBusy(false)
    }
  }, [])

  const runDesktopSetup = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopSetupBusy(true)
    setDesktopSetupResult(null)
    setDesktopSetupError('')
    try {
      const result = await api.runVoxcpmSetup({ modelPath, model: selectedModel, source: downloadSource })
      setDesktopSetupResult(result)
    } catch (error) {
      setDesktopSetupError(error instanceof Error ? error.message : '安装依赖启动失败，请检查桌面运行时。')
    } finally {
      setDesktopSetupBusy(false)
    }
  }, [downloadSource, modelPath, selectedModel])

  const queryDesktopDependencyStatus = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopDependencyStatusBusy(true)
    try {
      setDesktopDependencyStatusResult(await api.queryVoxcpmSetupStatus())
    } finally {
      setDesktopDependencyStatusBusy(false)
    }
  }, [])

  const controlDesktopService = useCallback(async (action: 'start' | 'stop' | 'restart' | 'status') => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopServiceBusy(true)
    try {
      setDesktopServiceResult(await api.controlVoxcpmService(action))
    } finally {
      setDesktopServiceBusy(false)
    }
  }, [])

  const startDesktopService = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setDesktopServiceBusy(true)
    setDesktopDependencyStatusBusy(true)
    try {
      await runDesktopServiceStartup({
        queryDependencyStatus: () => api.queryVoxcpmSetupStatus(),
        startService: () => api.controlVoxcpmService('start'),
        waitForConnection: () => waitForDesktopConnection(port),
        onDependencyStatus: setDesktopDependencyStatusResult,
        onDependencyStatusSettled: () => setDesktopDependencyStatusBusy(false),
        onServiceResult: setDesktopServiceResult,
        timeoutMessage: (output) => `${output || '服务启动命令已执行。'}\n等待连接超时，请查看 VoxCPM 服务日志。`,
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
    modelValidation,
    selectedModel,
    downloadSource,
    modelPath,
    apiCallExample,
    serviceUrl,
    connected,
    desktopRuntime,
    desktopHardware,
    desktopHardwareEvaluation,
    desktopHardwareBusy,
    desktopSetupBusy,
    desktopSetupResult,
    desktopSetupError,
    desktopDependencyStatusBusy,
    desktopDependencyStatusResult,
    desktopServiceBusy,
    desktopServiceResult,
    runCheck,
    applyPort,
    detectDesktopHardware,
    runDesktopSetup,
    queryDesktopDependencyStatus,
    startDesktopService,
    controlDesktopService,
    selectModel,
    setDownloadSource,
    setModelPath,
  }
}
