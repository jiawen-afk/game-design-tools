const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  normalizeStableAudioModel,
  registerStableAudioIpcHandlers,
  resolveStableAudioInstallPaths,
} = require('../../../electron/stableAudioIpcHandlers.cjs')

function createIpcMain() {
  const handlers = new Map()
  return {
    handlers,
    handle(channel, handler) {
      handlers.set(channel, handler)
    },
  }
}

test('stable audio model normalization only allows supported model ids', () => {
  assert.equal(normalizeStableAudioModel('small-sfx'), 'small-sfx')
  assert.equal(normalizeStableAudioModel('small-music'), 'small-music')
  assert.equal(normalizeStableAudioModel('medium'), 'medium')
  assert.equal(normalizeStableAudioModel('unknown'), 'small-sfx')
})

test('stable audio install paths stay under GameDesignTools local app data', () => {
  const paths = resolveStableAudioInstallPaths({ LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' })

  assert.equal(paths.stateDir, path.join('C:\\Users\\me\\AppData\\Local', 'GameDesignTools', 'StableAudio3'))
  assert.equal(paths.configPath, path.join(paths.stateDir, 'stable-audio-config.json'))
  assert.equal(paths.servicePath, path.join('C:\\Users\\me\\AppData\\Local', 'GameDesignTools', 'bin', 'stable-audio-service.ps1'))
})

test('stable audio setup launches the deployment script with normalized defaults', async () => {
  const ipcMain = createIpcMain()
  const launchCalls = []
  registerStableAudioIpcHandlers({
    ipcMain,
    resolveDeploymentScript: (name) => `D:\\app\\scripts\\${name}`,
    fsExists: () => true,
    launchSetupTerminal: async (input) => {
      launchCalls.push(input)
      return { started: true, scriptPath: input.scriptPath }
    },
    runCommandOutput: async () => ({ ok: true, output: 'ok' }),
    runServiceCommand: async () => ({ ok: true, output: 'ok' }),
  })

  const result = await ipcMain.handlers.get('stable-audio:run-setup')({}, {
    modelPath: '',
    model: 'bad-model',
    source: 'auto',
  })

  assert.equal(result.started, true)
  assert.equal(launchCalls[0].scriptPath, 'D:\\app\\scripts\\deploy-stable-audio-3.ps1')
  assert.deepEqual(launchCalls[0].args, ['D:\\models\\StableAudio3', 'small-sfx', 'auto'])
})
