import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getDesktopApi,
  isDesktopRuntime,
  type DesktopBirefnetDevicePreference,
  type DesktopBirefnetSetupResult,
  type DesktopCommandResult,
  type DesktopHardwareReport,
} from '../../desktopApi'
import {
  checkBirefnetConnection,
  defaultBirefnetModel,
  defaultBirefnetPort,
  type AiMattingConnectionStatus,
} from './aiMattingService'

function normalizeDevicePreference(value: unknown): DesktopBirefnetDevicePreference {
  return value === 'cuda' || value === 'cpu' ? value : 'auto'
}

function parseBirefnetStatusOutput(output: string) {
  try {
    const parsed = JSON.parse(output)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function extractDevicePreferenceFromText(output: string) {
  const match = output.match(/设备偏好：(\w+)/)
  return match ? normalizeDevicePreference(match[1]) : null
}

export function useAiMattingSetup() {
  const [connectionStatus, setConnectionStatus] = useState<AiMattingConnectionStatus>('idle')
  const [hardwareBusy, setHardwareBusy] = useState(false)
  const [hardwareResult, setHardwareResult] = useState<DesktopHardwareReport | null>(null)
  const [devicePreference, setDevicePreferenceState] = useState<DesktopBirefnetDevicePreference>('auto')
  const [requestedDevice, setRequestedDevice] = useState<DesktopBirefnetDevicePreference>('auto')
  const [activeDevice, setActiveDevice] = useState('')
  const [setupBusy, setSetupBusy] = useState(false)
  const [setupResult, setSetupResult] = useState<DesktopBirefnetSetupResult | null>(null)
  const [setupError, setSetupError] = useState('')
  const [dependencyStatusBusy, setDependencyStatusBusy] = useState(false)
  const [dependencyStatusResult, setDependencyStatusResult] = useState<DesktopCommandResult | null>(null)
  const [serviceBusy, setServiceBusy] = useState(false)
  const [serviceResult, setServiceResult] = useState<DesktopCommandResult | null>(null)
  const checkRef = useRef(0)
  const desktopRuntime = isDesktopRuntime()

  const applyDeviceStatusOutput = useCallback((output: string) => {
    const status = parseBirefnetStatusOutput(output)
    if (!status) return
    const nextRequestedDevice = normalizeDevicePreference(status.requested_device)
    setRequestedDevice(nextRequestedDevice)
    setDevicePreferenceState(nextRequestedDevice)
    setActiveDevice(String(status.device || ''))
  }, [])

  const runCheck = useCallback(async () => {
    const id = ++checkRef.current
    setConnectionStatus('checking')
    const api = getDesktopApi()
    if (api?.checkBirefnetService) {
      try {
        const result = await api.checkBirefnetService(defaultBirefnetPort)
        if (checkRef.current !== id) return false
        applyDeviceStatusOutput(result.output)
        setConnectionStatus(result.ok ? 'connected' : 'disconnected')
        return result.ok
      } catch {
        if (checkRef.current === id) setConnectionStatus('disconnected')
        return false
      }
    }
    const ok = await checkBirefnetConnection(defaultBirefnetPort)
    if (checkRef.current !== id) return false
    setConnectionStatus(ok ? 'connected' : 'disconnected')
    return ok
  }, [applyDeviceStatusOutput])

  const waitForServiceConnection = useCallback(async () => {
    const id = ++checkRef.current
    setConnectionStatus('checking')
    const api = getDesktopApi()
    for (let attempt = 0; attempt < 60; attempt += 1) {
      let ok = false
      if (api?.checkBirefnetService) {
        try {
          const result = await api.checkBirefnetService(defaultBirefnetPort)
          ok = result.ok
          applyDeviceStatusOutput(result.output)
        } catch {
          ok = false
        }
      } else {
        ok = await checkBirefnetConnection(defaultBirefnetPort)
      }
      if (checkRef.current !== id) return false
      if (ok) {
        setConnectionStatus('connected')
        return true
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2000))
    }
    if (checkRef.current === id) setConnectionStatus('disconnected')
    return false
  }, [applyDeviceStatusOutput])

  useEffect(() => {
    if (desktopRuntime) void runCheck()
  }, [desktopRuntime, runCheck])

  const detectEnvironment = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setHardwareBusy(true)
    try {
      setHardwareResult(await api.detectHardware())
    } finally {
      setHardwareBusy(false)
    }
  }, [])

  const installDependencies = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setSetupBusy(true)
    setSetupResult(null)
    setSetupError('')
    try {
      setSetupResult(await api.runBirefnetSetup({ model: defaultBirefnetModel, port: defaultBirefnetPort, device: devicePreference }))
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : '安装依赖启动失败，请检查桌面运行时。')
    } finally {
      setSetupBusy(false)
    }
  }, [devicePreference])

  const queryDependencyStatus = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setDependencyStatusBusy(true)
    try {
      const result = await api.queryBirefnetSetupStatus()
      setDependencyStatusResult(result)
      const detectedPreference = extractDevicePreferenceFromText(result.output)
      if (detectedPreference) setDevicePreferenceState(detectedPreference)
    } finally {
      setDependencyStatusBusy(false)
    }
  }, [])

  const controlService = useCallback(async (action: 'start' | 'stop' | 'restart' | 'status') => {
    const api = getDesktopApi()
    if (!api) return
    setServiceBusy(true)
    try {
      const result = await api.controlBirefnetService(action)
      setServiceResult(result)
      if (action === 'stop' && result.ok) setConnectionStatus('disconnected')
      if (action === 'status') void runCheck()
    } finally {
      setServiceBusy(false)
    }
  }, [runCheck])

  const setDevicePreference = useCallback(async (nextDevice: DesktopBirefnetDevicePreference) => {
    const api = getDesktopApi()
    const normalizedDevice = normalizeDevicePreference(nextDevice)
    setDevicePreferenceState(normalizedDevice)
    setRequestedDevice(normalizedDevice)
    if (!api) return
    setServiceBusy(true)
    try {
      const result = await api.setBirefnetDevicePreference(normalizedDevice)
      setServiceResult(result)
      if (!result.ok) return
      if (connectionStatus !== 'connected') {
        setActiveDevice('')
        return
      }
      const restartResult = await api.controlBirefnetService('restart')
      setServiceResult(restartResult)
      if (!restartResult.ok) return
      setServiceResult({
        ok: true,
        output: `${restartResult.output || '服务重启命令已执行。'}\n正在按新的设备偏好重新加载 BiRefNet 模型。`,
      })
      const connected = await waitForServiceConnection()
      if (connected) {
        setServiceResult({
          ok: true,
          output: `${restartResult.output || '服务重启命令已执行。'}\nBiRefNet 模型已按新的设备偏好就绪。`,
        })
      }
    } finally {
      setServiceBusy(false)
    }
  }, [connectionStatus, waitForServiceConnection])

  const startService = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setServiceBusy(true)
    setDependencyStatusBusy(true)
    try {
      const dependencyStatus = await api.queryBirefnetSetupStatus()
      setDependencyStatusResult(dependencyStatus)
      setDependencyStatusBusy(false)
      if (!dependencyStatus.ok) {
        setServiceResult({
          ok: false,
          output: `依赖安装未完成，启动服务已取消。\n${dependencyStatus.output}`,
        })
        return
      }
      const serviceStart = await api.controlBirefnetService('start')
      setServiceResult(serviceStart)
      if (!serviceStart.ok) return
      setServiceResult({
        ok: true,
        output: `${serviceStart.output || '服务启动命令已执行。'}\n正在通过 /ready 加载并检测 BiRefNet 模型，首次启动可能需要下载或加载模型，请稍候。`,
      })
      const connected = await waitForServiceConnection()
      if (connected) {
        setServiceResult({
          ok: true,
          output: `${serviceStart.output || '服务启动命令已执行。'}\nBiRefNet 模型已就绪，AI 抠图服务可用。`,
        })
      } else {
        setServiceResult({
          ok: false,
          output: `${serviceStart.output || '服务启动命令已执行。'}\n等待 /ready 返回模型就绪超时，请查看 BiRefNet 服务日志。`,
        })
      }
    } finally {
      setDependencyStatusBusy(false)
      setServiceBusy(false)
    }
  }, [waitForServiceConnection])

  return {
    port: defaultBirefnetPort,
    model: defaultBirefnetModel,
    desktopRuntime,
    connectionStatus,
    connected: connectionStatus === 'connected',
    hardwareBusy,
    hardwareResult,
    devicePreference,
    requestedDevice,
    activeDevice,
    setupBusy,
    setupResult,
    setupError,
    dependencyStatusBusy,
    dependencyStatusResult,
    serviceBusy,
    serviceResult,
    runCheck,
    detectEnvironment,
    setDevicePreference,
    installDependencies,
    queryDependencyStatus,
    startService,
    controlService,
  }
}
