const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
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

test('stable audio HuggingFace login launches an interactive auth terminal in the installed repo', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gdt-stable-audio-login-'))
  const originalLocalAppData = process.env.LOCALAPPDATA
  process.env.LOCALAPPDATA = tempDir
  try {
    const paths = resolveStableAudioInstallPaths({ LOCALAPPDATA: tempDir })
    const repoDir = path.join(tempDir, 'stable-audio-3')
    fs.mkdirSync(repoDir, { recursive: true })
    fs.mkdirSync(path.dirname(paths.configPath), { recursive: true })
    fs.writeFileSync(paths.configPath, JSON.stringify({ RepoDir: repoDir }))

    const ipcMain = createIpcMain()
    const launchCalls = []
    registerStableAudioIpcHandlers({
      ipcMain,
      resolveDeploymentScript: (name) => `D:\\app\\scripts\\${name}`,
      launchSetupTerminal: async (input) => {
        launchCalls.push(input)
        return { started: true, scriptPath: input.scriptPath }
      },
    })

    const result = await ipcMain.handlers.get('stable-audio:hf-login')()

    const loginScriptPath = path.join(paths.stateDir, 'stable-audio-hf-login.ps1')
    assert.deepEqual(result, { started: true, scriptPath: loginScriptPath })
    assert.equal(launchCalls[0].scriptPath, loginScriptPath)
    assert.equal(launchCalls[0].title, 'Stable Audio 3 登录 HuggingFace')
    assert.deepEqual(launchCalls[0].args, [repoDir])
    const loginScript = fs.readFileSync(loginScriptPath, 'utf8')
    assert.match(loginScript, /Set-Location -LiteralPath \$RepoDir/)
    assert.match(loginScript, /uv run hf auth login/)
    assert.match(loginScript, /检测依赖和模型/)
  } finally {
    if (originalLocalAppData === undefined) delete process.env.LOCALAPPDATA
    else process.env.LOCALAPPDATA = originalLocalAppData
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('stable audio dependency status reports gated model access before service startup', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gdt-stable-audio-'))
  const originalLocalAppData = process.env.LOCALAPPDATA
  process.env.LOCALAPPDATA = tempDir
  try {
    const paths = resolveStableAudioInstallPaths({ LOCALAPPDATA: tempDir })
    const repoDir = path.join(tempDir, 'stable-audio-3')
    const pythonCommand = path.join(repoDir, '.venv', 'Scripts', 'python.exe')
    fs.mkdirSync(path.dirname(paths.servicePath), { recursive: true })
    fs.mkdirSync(path.dirname(paths.configPath), { recursive: true })
    fs.mkdirSync(path.dirname(pythonCommand), { recursive: true })
    fs.writeFileSync(paths.servicePath, 'service')
    fs.writeFileSync(pythonCommand, 'python')
    fs.writeFileSync(paths.configPath, JSON.stringify({
      PythonCommand: pythonCommand,
      PythonArgs: [],
      RepoDir: repoDir,
      ModelVariant: 'small-sfx',
    }))

    const ipcMain = createIpcMain()
    registerStableAudioIpcHandlers({
      ipcMain,
      resolveDeploymentScript: (name) => `D:\\app\\scripts\\${name}`,
      runCommandOutput: async (_command, args) => {
        const script = args.at(-1)
        if (script.includes('import torch')) return { ok: true, output: 'torch ok' }
        assert.match(script, /stable-audio-3-small-sfx/)
        assert.match(script, /model_config\.json/)
        return { ok: false, output: 'GatedRepoError: 401 Unauthorized. Please log in.' }
      },
    })

    const result = await ipcMain.handlers.get('stable-audio:setup-status')()

    assert.equal(result.ok, false)
    assert.match(result.output, /HuggingFace 授权/)
    assert.match(result.output, /访问链接：https:\/\/huggingface\.co\/stabilityai\/stable-audio-3-small-sfx/)
    assert.match(result.output, /操作步骤/)
    assert.match(result.output, /登录 HuggingFace/)
    assert.match(result.output, /同意模型访问许可/)
    assert.match(result.output, /uv run hf auth login/)
  } finally {
    if (originalLocalAppData === undefined) delete process.env.LOCALAPPDATA
    else process.env.LOCALAPPDATA = originalLocalAppData
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('stable audio dependency status rejects a requested model that is not installed in the config', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gdt-stable-audio-model-'))
  const originalLocalAppData = process.env.LOCALAPPDATA
  process.env.LOCALAPPDATA = tempDir
  try {
    const paths = resolveStableAudioInstallPaths({ LOCALAPPDATA: tempDir })
    const repoDir = path.join(tempDir, 'stable-audio-3')
    const pythonCommand = path.join(repoDir, '.venv', 'Scripts', 'python.exe')
    fs.mkdirSync(path.dirname(paths.servicePath), { recursive: true })
    fs.mkdirSync(path.dirname(paths.configPath), { recursive: true })
    fs.mkdirSync(path.dirname(pythonCommand), { recursive: true })
    fs.writeFileSync(paths.servicePath, 'service')
    fs.writeFileSync(pythonCommand, 'python')
    fs.writeFileSync(paths.configPath, JSON.stringify({
      PythonCommand: pythonCommand,
      PythonArgs: [],
      RepoDir: repoDir,
      ModelVariant: 'small-sfx',
    }))

    const probedScripts = []
    const ipcMain = createIpcMain()
    registerStableAudioIpcHandlers({
      ipcMain,
      resolveDeploymentScript: (name) => `D:\\app\\scripts\\${name}`,
      runCommandOutput: async (_command, args) => {
        const script = args.at(-1)
        probedScripts.push(script)
        if (script.includes('import torch')) return { ok: true, output: 'torch ok' }
        return { ok: true, output: 'model access ok: medium' }
      },
    })

    const result = await ipcMain.handlers.get('stable-audio:setup-status')({}, { model: 'medium' })

    assert.equal(result.ok, false)
    assert.match(result.output, /当前选择模型：medium/)
    assert.match(result.output, /已安装配置模型：small-sfx/)
    assert.match(result.output, /请先选择 medium 后点击“安装依赖”/)
    assert.ok(probedScripts.some((script) => script.includes('import torch')))
    assert.ok(!probedScripts.some((script) => script.includes('stable-audio-3-medium')))
    assert.ok(!probedScripts.some((script) => script.includes('stable-audio-3-small-sfx')))
  } finally {
    if (originalLocalAppData === undefined) delete process.env.LOCALAPPDATA
    else process.env.LOCALAPPDATA = originalLocalAppData
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('stable audio health applies a timeout signal to local service probes', async () => {
  const originalFetch = global.fetch
  global.fetch = async (_url, options = {}) => {
    assert.ok(options.signal, 'health probes should pass an AbortSignal')
    return new Response(JSON.stringify({ ok: true, ready: true }), { status: 200 })
  }
  try {
    const ipcMain = createIpcMain()
    registerStableAudioIpcHandlers({
      ipcMain,
      resolveDeploymentScript: (name) => `D:\\app\\scripts\\${name}`,
      fsExists: () => true,
      runCommandOutput: async () => ({ ok: true, output: 'ok' }),
    })

    const result = await ipcMain.handlers.get('stable-audio:health')({}, 8818)

    assert.equal(result.ok, true)
  } finally {
    global.fetch = originalFetch
  }
})

test('stable audio health returns model readiness errors from the local server', async () => {
  const originalFetch = global.fetch
  global.fetch = async () => new Response(JSON.stringify({
    detail: 'Stable Audio 3 模型需要 HuggingFace 授权。',
  }), { status: 503 })
  try {
    const ipcMain = createIpcMain()
    registerStableAudioIpcHandlers({
      ipcMain,
      resolveDeploymentScript: (name) => `D:\\app\\scripts\\${name}`,
      fsExists: () => true,
      runCommandOutput: async () => ({ ok: true, output: 'ok' }),
    })

    const result = await ipcMain.handlers.get('stable-audio:health')({}, 8818)

    assert.equal(result.ok, false)
    assert.match(result.output, /HuggingFace 授权/)
  } finally {
    global.fetch = originalFetch
  }
})
