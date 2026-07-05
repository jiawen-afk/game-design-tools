import test from 'node:test'
import assert from 'node:assert/strict'

import {
  runDesktopServiceStartup,
  waitForDesktopServiceConnection,
  type DesktopServiceCommandResult,
} from './desktopServiceWorkflow'

test('desktop service startup stops before service control when dependencies are missing', async () => {
  const events: string[] = []
  const serviceResults: DesktopServiceCommandResult[] = []

  const result = await runDesktopServiceStartup({
    queryDependencyStatus: async () => ({ ok: false, output: 'missing torch' }),
    startService: async () => {
      events.push('start-service')
      return { ok: true, output: 'started' }
    },
    waitForConnection: async () => true,
    onDependencyStatus: (status) => events.push(`dependency:${status.output}`),
    onDependencyStatusSettled: () => events.push('dependency-settled'),
    onServiceResult: (status) => serviceResults.push(status),
  })

  assert.deepEqual(result, { connected: false, phase: 'dependency-missing' })
  assert.deepEqual(events, ['dependency:missing torch', 'dependency-settled'])
  assert.deepEqual(serviceResults, [{
    ok: false,
    output: '依赖安装未完成，启动服务已取消。\nmissing torch',
  }])
})

test('desktop service startup can publish start progress and ready messages around connection wait', async () => {
  const serviceResults: DesktopServiceCommandResult[] = []

  const result = await runDesktopServiceStartup({
    queryDependencyStatus: async () => ({ ok: true, output: 'dependencies ready' }),
    startService: async () => ({ ok: true, output: 'start command accepted' }),
    waitForConnection: async () => true,
    onDependencyStatus: () => {},
    onServiceResult: (status) => serviceResults.push(status),
    startingMessage: (output) => `${output}\nloading model`,
    readyMessage: (output) => `${output}\nservice ready`,
    timeoutMessage: (output) => `${output}\nservice timeout`,
  })

  assert.deepEqual(result, { connected: true, phase: 'connected' })
  assert.deepEqual(serviceResults, [
    { ok: true, output: 'start command accepted' },
    { ok: true, output: 'start command accepted\nloading model' },
    { ok: true, output: 'start command accepted\nservice ready' },
  ])
})

test('desktop service startup can settle command busy state before readiness polling finishes', async () => {
  const events: string[] = []

  const result = await runDesktopServiceStartup({
    queryDependencyStatus: async () => ({ ok: true, output: 'dependencies ready' }),
    startService: async () => ({ ok: true, output: 'start command accepted' }),
    waitForConnection: async () => {
      events.push('wait-for-connection')
      return true
    },
    onDependencyStatus: () => {},
    onServiceResult: (status) => events.push(`service:${status.output}`),
    onStartCommandSettled: () => events.push('start-command-settled'),
    startingMessage: (output) => `${output}\nloading model`,
    readyMessage: (output) => `${output}\nservice ready`,
  })

  assert.deepEqual(result, { connected: true, phase: 'connected' })
  assert.deepEqual(events, [
    'service:start command accepted',
    'start-command-settled',
    'service:start command accepted\nloading model',
    'wait-for-connection',
    'service:start command accepted\nservice ready',
  ])
})

test('desktop service connection waiter retries probes and reports probe output', async () => {
  const statuses: string[] = []
  const probeOutputs: string[] = []
  const sleeps: number[] = []
  let attempts = 0

  const connected = await waitForDesktopServiceConnection({
    attempts: 3,
    delayMs: 7,
    checkConnection: async () => {
      attempts += 1
      return { ok: attempts === 2, output: `probe-${attempts}` }
    },
    onProbeResult: (result) => probeOutputs.push(result.output),
    onStatus: (status) => statuses.push(status),
    sleep: async (delayMs) => {
      sleeps.push(delayMs)
    },
  })

  assert.equal(connected, true)
  assert.equal(attempts, 2)
  assert.deepEqual(statuses, ['checking', 'connected'])
  assert.deepEqual(probeOutputs, ['probe-1', 'probe-2'])
  assert.deepEqual(sleeps, [7])
})
