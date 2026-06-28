import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getDesktopApi,
  isDesktopRuntime,
  type DesktopBirefnetDevicePreference,
} from '../../desktopApi'
import { waitForDesktopServiceConnection } from '../DesktopServiceRuntime/desktopServiceWorkflow'
import {
  checkBirefnetConnection,
  defaultBirefnetPort,
  type AiMattingConnectionStatus,
} from './aiMattingService'
import {
  normalizeBirefnetDevicePreference,
  parseBirefnetServiceStatus,
} from './aiMattingRuntimeModel'

export function useAiMattingConnection() {
  const [connectionStatus, setConnectionStatus] = useState<AiMattingConnectionStatus>('idle')
  const [devicePreference, setDevicePreferenceState] = useState<DesktopBirefnetDevicePreference>('auto')
  const [requestedDevice, setRequestedDevice] = useState<DesktopBirefnetDevicePreference>('auto')
  const [activeDevice, setActiveDevice] = useState('')
  const checkRef = useRef(0)
  const desktopRuntime = isDesktopRuntime()

  const applyDeviceStatusOutput = useCallback((output: string) => {
    const status = parseBirefnetServiceStatus(output)
    if (!status) return
    setRequestedDevice(status.requestedDevice)
    setDevicePreferenceState(status.requestedDevice)
    setActiveDevice(status.activeDevice)
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
    const api = getDesktopApi()
    return waitForDesktopServiceConnection({
      checkConnection: async () => {
        if (api?.checkBirefnetService) {
          try {
            return await api.checkBirefnetService(defaultBirefnetPort)
          } catch {
            return false
          }
        }
        return checkBirefnetConnection(defaultBirefnetPort)
      },
      isCurrent: () => checkRef.current === id,
      onProbeResult: (result) => applyDeviceStatusOutput(result.output),
      onStatus: setConnectionStatus,
    })
  }, [applyDeviceStatusOutput])

  useEffect(() => {
    if (desktopRuntime) void runCheck()
  }, [desktopRuntime, runCheck])

  const applyDetectedDevicePreference = useCallback((nextDevice: DesktopBirefnetDevicePreference) => {
    setDevicePreferenceState(normalizeBirefnetDevicePreference(nextDevice))
  }, [])

  const applySelectedDevicePreference = useCallback((nextDevice: DesktopBirefnetDevicePreference) => {
    const normalizedDevice = normalizeBirefnetDevicePreference(nextDevice)
    setDevicePreferenceState(normalizedDevice)
    setRequestedDevice(normalizedDevice)
    return normalizedDevice
  }, [])
  const clearActiveDevice = useCallback(() => setActiveDevice(''), [])
  const markDisconnected = useCallback(() => setConnectionStatus('disconnected'), [])

  return {
    activeDevice,
    applyDetectedDevicePreference,
    applySelectedDevicePreference,
    clearActiveDevice,
    connectionStatus,
    connected: connectionStatus === 'connected',
    desktopRuntime,
    devicePreference,
    markDisconnected,
    requestedDevice,
    runCheck,
    waitForServiceConnection,
  }
}
