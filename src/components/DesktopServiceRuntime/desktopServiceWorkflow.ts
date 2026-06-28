import type { DesktopCommandResult } from '../../desktopSystemApi'

export type DesktopServiceCommandResult = DesktopCommandResult

export type DesktopServiceConnectionStatus = 'checking' | 'connected' | 'disconnected'

export interface DesktopServiceConnectionCheckResult extends DesktopCommandResult {}

export interface WaitForDesktopServiceConnectionOptions {
  attempts?: number
  delayMs?: number
  checkConnection: () => Promise<boolean | DesktopServiceConnectionCheckResult>
  isCurrent?: () => boolean
  onProbeResult?: (result: DesktopServiceConnectionCheckResult) => void
  onStatus: (status: DesktopServiceConnectionStatus) => void
  sleep?: (delayMs: number) => Promise<void>
}

export type DesktopServiceStartupPhase =
  | 'dependency-missing'
  | 'start-failed'
  | 'connected'
  | 'timeout'

export interface DesktopServiceStartupResult {
  connected: boolean
  phase: DesktopServiceStartupPhase
}

export interface RunDesktopServiceStartupOptions {
  queryDependencyStatus: () => Promise<DesktopServiceCommandResult>
  startService: () => Promise<DesktopServiceCommandResult>
  waitForConnection: () => Promise<boolean>
  onDependencyStatus: (status: DesktopServiceCommandResult) => void
  onDependencyStatusSettled?: () => void
  onServiceResult: (result: DesktopServiceCommandResult) => void
  dependencyMissingMessage?: (dependencyOutput: string) => string
  startingMessage?: (startOutput: string) => string
  readyMessage?: (startOutput: string) => string
  timeoutMessage?: (startOutput: string) => string
}

function normalizeConnectionResult(
  result: boolean | DesktopServiceConnectionCheckResult,
): DesktopServiceConnectionCheckResult {
  return typeof result === 'boolean' ? { ok: result, output: '' } : result
}

function defaultSleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      setTimeout(resolve, delayMs)
      return
    }
    window.setTimeout(resolve, delayMs)
  })
}

export async function waitForDesktopServiceConnection({
  attempts = 60,
  delayMs = 2000,
  checkConnection,
  isCurrent = () => true,
  onProbeResult,
  onStatus,
  sleep = defaultSleep,
}: WaitForDesktopServiceConnectionOptions): Promise<boolean> {
  onStatus('checking')

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = normalizeConnectionResult(await checkConnection())
    onProbeResult?.(result)
    if (!isCurrent()) return false
    if (result.ok) {
      onStatus('connected')
      return true
    }
    await sleep(delayMs)
  }

  if (isCurrent()) onStatus('disconnected')
  return false
}

export async function runDesktopServiceStartup({
  queryDependencyStatus,
  startService,
  waitForConnection,
  onDependencyStatus,
  onDependencyStatusSettled,
  onServiceResult,
  dependencyMissingMessage = (output) => `依赖安装未完成，启动服务已取消。\n${output}`,
  startingMessage,
  readyMessage,
  timeoutMessage = (output) => `${output || '服务启动命令已执行。'}\n等待连接超时，请查看服务日志。`,
}: RunDesktopServiceStartupOptions): Promise<DesktopServiceStartupResult> {
  const dependencyStatus = await queryDependencyStatus()
  onDependencyStatus(dependencyStatus)
  onDependencyStatusSettled?.()
  if (!dependencyStatus.ok) {
    onServiceResult({
      ok: false,
      output: dependencyMissingMessage(dependencyStatus.output),
    })
    return { connected: false, phase: 'dependency-missing' }
  }

  const serviceStart = await startService()
  onServiceResult(serviceStart)
  if (!serviceStart.ok) {
    return { connected: false, phase: 'start-failed' }
  }

  if (startingMessage) {
    onServiceResult({ ok: true, output: startingMessage(serviceStart.output) })
  }

  const connected = await waitForConnection()
  if (connected) {
    if (readyMessage) {
      onServiceResult({ ok: true, output: readyMessage(serviceStart.output) })
    }
    return { connected: true, phase: 'connected' }
  }

  onServiceResult({ ok: false, output: timeoutMessage(serviceStart.output) })
  return { connected: false, phase: 'timeout' }
}
