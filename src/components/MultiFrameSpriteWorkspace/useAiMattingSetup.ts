import { useCallback, useState } from 'react'

import {
  getDesktopApi,
  type DesktopBirefnetDevicePreference,
  type DesktopBirefnetSetupResult,
  type DesktopCommandResult,
  type DesktopHardwareReport,
} from '../../desktopApi'
import { runDesktopServiceStartup } from '../DesktopServiceRuntime/desktopServiceWorkflow'
import {
  defaultBirefnetModel,
  defaultBirefnetPort,
} from './aiMattingService'
import { extractBirefnetDevicePreferenceFromText } from './aiMattingRuntimeModel'
import { useAiMattingConnection } from './useAiMattingConnection'

export function useAiMattingSetup() {
  const {
    activeDevice,
    applyDetectedDevicePreference,
    applySelectedDevicePreference,
    clearActiveDevice,
    connectionStatus,
    connected,
    desktopRuntime,
    devicePreference,
    markDisconnected,
    requestedDevice,
    runCheck,
    waitForServiceConnection,
  } = useAiMattingConnection()
  const [hardwareBusy, setHardwareBusy] = useState(false)
  const [hardwareResult, setHardwareResult] = useState<DesktopHardwareReport | null>(null)
  const [setupBusy, setSetupBusy] = useState(false)
  const [setupResult, setSetupResult] = useState<DesktopBirefnetSetupResult | null>(null)
  const [setupError, setSetupError] = useState('')
  const [dependencyStatusBusy, setDependencyStatusBusy] = useState(false)
  const [dependencyStatusResult, setDependencyStatusResult] = useState<DesktopCommandResult | null>(null)
  const [serviceBusy, setServiceBusy] = useState(false)
  const [serviceResult, setServiceResult] = useState<DesktopCommandResult | null>(null)

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
      const detectedPreference = extractBirefnetDevicePreferenceFromText(result.output)
      if (detectedPreference) applyDetectedDevicePreference(detectedPreference)
    } finally {
      setDependencyStatusBusy(false)
    }
  }, [applyDetectedDevicePreference])

  const controlService = useCallback(async (action: 'start' | 'stop' | 'restart' | 'status') => {
    const api = getDesktopApi()
    if (!api) return
    setServiceBusy(true)
    try {
      const result = await api.controlBirefnetService(action)
      setServiceResult(result)
      if (action === 'stop' && result.ok) markDisconnected()
      if (action === 'status') void runCheck()
    } finally {
      setServiceBusy(false)
    }
  }, [markDisconnected, runCheck])

  const setDevicePreference = useCallback(async (nextDevice: DesktopBirefnetDevicePreference) => {
    const api = getDesktopApi()
    const normalizedDevice = applySelectedDevicePreference(nextDevice)
    if (!api) return
    setServiceBusy(true)
    try {
      const result = await api.setBirefnetDevicePreference(normalizedDevice)
      setServiceResult(result)
      if (!result.ok) return
      if (!connected) {
        clearActiveDevice()
        return
      }
      const restartResult = await api.controlBirefnetService('restart')
      setServiceResult(restartResult)
      if (!restartResult.ok) return
      setServiceResult({
        ok: true,
          output: `${restartResult.output || '服务重启命令已执行。'}\n正在按新的设备偏好重新加载 BiRefNet 模型。`,
      })
      const nextConnected = await waitForServiceConnection()
      if (nextConnected) {
        setServiceResult({
          ok: true,
          output: `${restartResult.output || '服务重启命令已执行。'}\nBiRefNet 模型已按新的设备偏好就绪。`,
        })
      }
    } finally {
      setServiceBusy(false)
    }
  }, [applySelectedDevicePreference, clearActiveDevice, connected, waitForServiceConnection])

  const startService = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    setServiceBusy(true)
    setDependencyStatusBusy(true)
    try {
      await runDesktopServiceStartup({
        queryDependencyStatus: () => api.queryBirefnetSetupStatus(),
        startService: () => api.controlBirefnetService('start'),
        waitForConnection: waitForServiceConnection,
        onDependencyStatus: setDependencyStatusResult,
        onDependencyStatusSettled: () => setDependencyStatusBusy(false),
        onServiceResult: setServiceResult,
        startingMessage: (output) => `${output || '服务启动命令已执行。'}\n正在通过 /ready 加载并检测 BiRefNet 模型，首次启动可能需要下载或加载模型，请稍候。`,
        readyMessage: (output) => `${output || '服务启动命令已执行。'}\nBiRefNet 模型已就绪，AI 抠图服务可用。`,
        timeoutMessage: (output) => `${output || '服务启动命令已执行。'}\n等待 /ready 返回模型就绪超时，请查看 BiRefNet 服务日志。`,
      })
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
    connected,
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
