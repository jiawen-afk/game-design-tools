import type { DesktopBirefnetDevicePreference } from '../../desktopApi'

export interface BirefnetServiceStatus {
  requestedDevice: DesktopBirefnetDevicePreference
  activeDevice: string
}

export function normalizeBirefnetDevicePreference(value: unknown): DesktopBirefnetDevicePreference {
  return value === 'cuda' || value === 'cpu' ? value : 'auto'
}

export function parseBirefnetServiceStatus(output: string): BirefnetServiceStatus | null {
  try {
    const parsed = JSON.parse(output)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const status = parsed as Record<string, unknown>
    return {
      requestedDevice: normalizeBirefnetDevicePreference(status.requested_device),
      activeDevice: String(status.device || ''),
    }
  } catch {
    return null
  }
}

export function extractBirefnetDevicePreferenceFromText(output: string): DesktopBirefnetDevicePreference | null {
  const match = output.match(/设备偏好：(\w+)/)
  return match ? normalizeBirefnetDevicePreference(match[1]) : null
}
