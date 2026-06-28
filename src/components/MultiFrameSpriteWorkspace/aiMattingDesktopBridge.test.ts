import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { checkBirefnetConnection, removeImageBackground } from './aiMattingService'

test('desktop bridge exposes BiRefNet setup, service control, and image matting APIs', () => {
  const desktopBirefnetApi = readFileSync('src/desktopBirefnetApi.ts', 'utf8')
  const preload = readFileSync('electron/preload.cjs', 'utf8')
  const main = readFileSync('electron/main.cjs', 'utf8')
  const birefnetIpc = readFileSync('electron/birefnetIpcHandlers.cjs', 'utf8')
  const birefnetServiceClientPath = 'electron/birefnetServiceClient.cjs'
  const birefnetServiceClient = existsSync(birefnetServiceClientPath)
    ? readFileSync(birefnetServiceClientPath, 'utf8')
    : ''
  const viteConfig = readFileSync('vite.config.ts', 'utf8')
  const scriptPath = 'scripts/deploy-birefnet.ps1'

  assert.ok(existsSync(scriptPath), 'expected BiRefNet deployment script to exist')
  assert.ok(existsSync(birefnetServiceClientPath), `${birefnetServiceClientPath} should exist`)
  assert.match(desktopBirefnetApi, /runBirefnetSetup/)
  assert.match(desktopBirefnetApi, /queryBirefnetSetupStatus/)
  assert.match(desktopBirefnetApi, /controlBirefnetService/)
  assert.match(desktopBirefnetApi, /checkBirefnetService/)
  assert.match(desktopBirefnetApi, /removeImageBackground/)
  assert.match(preload, /birefnet:run-setup/)
  assert.match(preload, /birefnet:setup-status/)
  assert.match(preload, /birefnet:service/)
  assert.match(preload, /birefnet:health/)
  assert.match(preload, /birefnet:remove-background/)
  assert.match(main, /registerBirefnetIpcHandlers/)
  assert.match(birefnetIpc, /deploy-birefnet\.ps1/)
  assert.match(birefnetIpc, /birefnet:health/)
  assert.match(birefnetIpc, /birefnetServiceClient\.cjs/)
  assert.match(birefnetIpc, /checkBirefnetReady\(servicePort\)/)
  assert.match(birefnetIpc, /birefnet:remove-background/)
  assert.match(birefnetIpc, /removeBirefnetBackground\(options\)/)
  assert.match(birefnetServiceClient, /getJson\(port,\s*'\/ready'/)
  assert.match(birefnetServiceClient, /postJson\(port,\s*'\/matte'/)
  assert.match(birefnetIpc, /birefnet-service\.ps1/)
  assert.match(birefnetIpc, /import torch; import torchvision; import cv2/)
  assert.match(viteConfig, /deploy-birefnet\.ps1/)
})

test('desktop bridge exposes BiRefNet device preference controls', () => {
  const desktopBirefnetApi = readFileSync('src/desktopBirefnetApi.ts', 'utf8')
  const preload = readFileSync('electron/preload.cjs', 'utf8')
  const main = readFileSync('electron/main.cjs', 'utf8')
  const birefnetIpc = readFileSync('electron/birefnetIpcHandlers.cjs', 'utf8')
  const hook = readFileSync('src/components/MultiFrameSpriteWorkspace/useAiMattingSetup.ts', 'utf8')
  const panel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteWorkspacePanel.tsx', 'utf8')
  const setupPanel = readFileSync('src/components/MultiFrameSpriteWorkspace/MatteAiSetupPanel.tsx', 'utf8')

  assert.match(desktopBirefnetApi, /export type DesktopBirefnetDevicePreference = 'auto' \| 'cuda' \| 'cpu'/)
  assert.match(desktopBirefnetApi, /setBirefnetDevicePreference\(device: DesktopBirefnetDevicePreference\)/)
  assert.match(preload, /setBirefnetDevicePreference: \(device\) => invoke\('birefnet:set-device', device\)/)
  assert.match(main, /registerBirefnetIpcHandlers/)
  assert.match(birefnetIpc, /ipcMain\.handle\('birefnet:set-device'/)
  assert.match(birefnetIpc, /Device: nextDevice/)
  assert.match(hook, /devicePreference/)
  assert.match(hook, /setDevicePreference/)
  assert.match(hook, /controlBirefnetService\('restart'\)/)
  assert.match(panel, /MatteAiSetupPanel/)
  assert.match(setupPanel, /设备/)
  assert.match(setupPanel, /GPU/)
  assert.match(setupPanel, /CPU/)
})

test('BiRefNet health checks use the desktop bridge before renderer fetch', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  let checkedPort = 0

  globalThis.window = {
    gameDesignToolsDesktop: {
      checkBirefnetService: async (port: number) => {
        checkedPort = port
        return { ok: true, output: 'BiRefNet 服务可用' }
      },
    },
  } as typeof globalThis.window
  globalThis.fetch = async () => {
    throw new Error('renderer fetch should not be used when desktop bridge is available')
  }

  try {
    assert.equal(await checkBirefnetConnection(17860), true)
    assert.equal(checkedPort, 17860)
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})

test('BiRefNet renderer fallback checks model readiness endpoint', () => {
  const service = readFileSync('src/components/MultiFrameSpriteWorkspace/aiMattingService.ts', 'utf8')

  assert.match(service, /buildBirefnetServiceUrl\(port\)}\/ready/)
  assert.doesNotMatch(service, /buildBirefnetServiceUrl\(port\)}\/health/)
})

test('BiRefNet remove background reports disconnected service without leaking IPC connection errors', async () => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch

  globalThis.window = {
    gameDesignToolsDesktop: {
      removeImageBackground: async () => {
        throw new Error("Error invoking remote method 'birefnet:remove-background': Error: connect ECONNREFUSED 127.0.0.1:17860")
      },
    },
  } as unknown as typeof globalThis.window
  globalThis.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(0),
  } as Response)

  try {
    await assert.rejects(
      () => removeImageBackground('blob:source'),
      /BiRefNet 服务未连接，请先启动服务。/
    )
  } finally {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  }
})
