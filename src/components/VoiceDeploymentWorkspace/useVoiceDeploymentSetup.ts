import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  type ConnectionStatus,
  type DownloadSource,
  type ModelVersion,
  type Platform,
  buildGradioApiCall,
  buildOneClickCommand,
  buildServiceUrl,
  defaultPort,
  validateModelPath,
} from './voiceDeploymentModel'
import { checkConnection } from './voiceDeploymentService'

export function useVoiceDeploymentSetup() {
  const [port, setPort] = useState(defaultPort)
  const [portInput, setPortInput] = useState(String(defaultPort))
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [modelPath, setModelPath] = useState('')
  const [platform, setPlatform] = useState<Platform>('windows')
  const [selectedModel, setSelectedModel] = useState<ModelVersion>('VoxCPM2')
  const [downloadSource, setDownloadSource] = useState<DownloadSource>('auto')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const checkRef = useRef(0)

  const modelValidation = useMemo(() => validateModelPath(modelPath), [modelPath])
  const oneClickCommand = useMemo(
    () => buildOneClickCommand(platform, modelPath, selectedModel, downloadSource),
    [downloadSource, modelPath, platform, selectedModel]
  )
  const apiCallExample = useMemo(() => buildGradioApiCall({ port, text: '你好，这是一段测试语音。' }), [port])
  const serviceUrl = buildServiceUrl(port)
  const connected = connectionStatus === 'connected'

  const runCheck = useCallback(async (targetPort: number) => {
    const id = ++checkRef.current
    setConnectionStatus('checking')
    const ok = await checkConnection(targetPort)
    if (checkRef.current !== id) return
    setConnectionStatus(ok ? 'connected' : 'disconnected')
  }, [])

  useEffect(() => { runCheck(defaultPort) }, [runCheck])

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
  }

  return {
    port,
    portInput,
    setPortInput,
    connectionStatus,
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
    runCheck,
    applyPort,
    copy,
    setPlatform,
    selectModel,
    setDownloadSource,
    setModelPath,
  }
}
