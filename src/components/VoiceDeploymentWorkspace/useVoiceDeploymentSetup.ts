import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  type ConnectionStatus,
  type DeviceType,
  type DownloadSource,
  type HardwareReport,
  type ModelVersion,
  type Platform,
  buildGradioApiCall,
  buildOneClickCommand,
  buildServiceUrl,
  defaultPort,
  evaluateHardware,
  parseNvidiaSmiReport,
  validateModelPath,
} from './voiceDeploymentModel'
import { checkConnection } from './voiceDeploymentService'

type VoiceSetupAlertType = 'error' | 'success' | 'warning' | 'info'

export function useVoiceDeploymentSetup() {
  const [port, setPort] = useState(defaultPort)
  const [portInput, setPortInput] = useState(String(defaultPort))
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [deviceType, setDeviceType] = useState<DeviceType>('nvidia')
  const [gpuInput, setGpuInput] = useState('')
  const [modelPath, setModelPath] = useState('')
  const [platform, setPlatform] = useState<Platform>('windows')
  const [selectedModel, setSelectedModel] = useState<ModelVersion>('VoxCPM2')
  const [downloadSource, setDownloadSource] = useState<DownloadSource>('auto')
  const [modelTouched, setModelTouched] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const checkRef = useRef(0)

  const hardwareReport = useMemo<HardwareReport | null>(() => {
    if (deviceType === 'apple') return { gpuName: 'Apple Silicon', vramGb: 0, device: 'apple' }
    if (deviceType === 'cpu') return { gpuName: 'CPU', vramGb: 0, device: 'cpu' }
    return parseNvidiaSmiReport(gpuInput)
  }, [deviceType, gpuInput])

  const hardware = useMemo(() => evaluateHardware(hardwareReport), [hardwareReport])
  const modelValidation = useMemo(() => validateModelPath(modelPath), [modelPath])
  const oneClickCommand = useMemo(
    () => buildOneClickCommand(platform, modelPath, selectedModel, downloadSource),
    [downloadSource, modelPath, platform, selectedModel]
  )
  const apiCallExample = useMemo(() => buildGradioApiCall({ port, text: '你好，这是一段测试语音。' }), [port])
  const serviceUrl = buildServiceUrl(port)
  const connected = connectionStatus === 'connected'
  const alertType: VoiceSetupAlertType = hardware.status === 'blocked' ? 'error'
    : hardware.status === 'ready' ? 'success'
    : hardware.status === 'warning' ? 'warning'
    : 'info'

  const runCheck = useCallback(async (targetPort: number) => {
    const id = ++checkRef.current
    setConnectionStatus('checking')
    const ok = await checkConnection(targetPort)
    if (checkRef.current !== id) return
    setConnectionStatus(ok ? 'connected' : 'disconnected')
  }, [])

  useEffect(() => { runCheck(defaultPort) }, [runCheck])

  useEffect(() => {
    if (!modelTouched && hardware.recommendedModel) {
      setSelectedModel(hardware.recommendedModel)
    }
  }, [hardware.recommendedModel, modelTouched])

  const applyPort = () => {
    const n = parseInt(portInput, 10)
    if (n > 0 && n < 65536) {
      setPort(n)
      runCheck(n)
    }
  }

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 1600)
  }

  const selectModel = (model: ModelVersion) => {
    setSelectedModel(model)
    setModelTouched(true)
  }

  return {
    port,
    portInput,
    setPortInput,
    connectionStatus,
    deviceType,
    gpuInput,
    hardware,
    modelValidation,
    platform,
    selectedModel,
    downloadSource,
    modelPath,
    oneClickCommand,
    apiCallExample,
    serviceUrl,
    connected,
    copiedKey,
    alertType,
    runCheck,
    applyPort,
    copy,
    setDeviceType,
    setGpuInput,
    setPlatform,
    selectModel,
    setDownloadSource,
    setModelPath,
  }
}
