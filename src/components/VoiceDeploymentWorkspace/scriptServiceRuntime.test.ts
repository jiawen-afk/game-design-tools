import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type SpawnCall = {
  command: string
  args: string[]
  options: Record<string, unknown>
}

type FakeChild = EventEmitter & {
  stdout: EventEmitter
  stderr: EventEmitter
  unref: () => void
  unrefCalled: boolean
}

type ScriptServiceRuntime = {
  launchSetupTerminal: (input: {
    args: string[]
    scriptPath: string
    spawn: (command: string, args: string[], options: Record<string, unknown>) => FakeChild
    title: string
  }) => Promise<{ scriptPath: string; started: true }>
  runServiceCommand: (input: {
    action?: string
    servicePath: string
    spawn: (command: string, args: string[], options: Record<string, unknown>) => FakeChild
  }) => Promise<{ ok: boolean; output: string }>
}

function loadRuntime(): ScriptServiceRuntime {
  return require('../../../electron/scriptServiceRuntime.cjs') as ScriptServiceRuntime
}

function createFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.unrefCalled = false
  child.unref = () => {
    child.unrefCalled = true
  }
  return child
}

function recordSpawn(calls: SpawnCall[], child: FakeChild) {
  return (command: string, args: string[], options: Record<string, unknown>) => {
    calls.push({ command, args, options })
    return child
  }
}

test('setup terminal opens a detached PowerShell window with script arguments', async () => {
  const { launchSetupTerminal } = loadRuntime()
  const child = createFakeChild()
  const calls: SpawnCall[] = []

  const started = launchSetupTerminal({
    args: ['model-a', '17860', 'auto'],
    scriptPath: 'C:\\deploy-birefnet.ps1',
    spawn: recordSpawn(calls, child),
    title: 'BiRefNet 安装依赖',
  })

  assert.deepEqual(calls, [{
    command: 'cmd.exe',
    args: [
      '/c',
      'start',
      'BiRefNet 安装依赖',
      'powershell.exe',
      '-NoExit',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      'C:\\deploy-birefnet.ps1',
      'model-a',
      '17860',
      'auto',
    ],
    options: {
      detached: true,
      windowsHide: false,
      stdio: 'ignore',
    },
  }])
  assert.equal(child.unrefCalled, true)

  child.emit('close', 0)
  assert.deepEqual(await started, { started: true, scriptPath: 'C:\\deploy-birefnet.ps1' })
})

test('service command defaults unknown actions to status and combines output streams', async () => {
  const { runServiceCommand } = loadRuntime()
  const child = createFakeChild()
  const calls: SpawnCall[] = []

  const result = runServiceCommand({
    action: 'reload',
    servicePath: 'C:\\voxcpm-service.ps1',
    spawn: recordSpawn(calls, child),
  })

  assert.deepEqual(calls, [{
    command: 'powershell.exe',
    args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'C:\\voxcpm-service.ps1', 'status'],
    options: { windowsHide: true },
  }])

  child.stdout.emit('data', Buffer.from('service ok\n'))
  child.stderr.emit('data', Buffer.from('warning\n'))
  child.emit('close', 0)

  assert.deepEqual(await result, { ok: true, output: 'service ok\nwarning' })
})
