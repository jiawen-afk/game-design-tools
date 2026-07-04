const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const {
  launchSetupTerminal: defaultLaunchSetupTerminal,
  runServiceCommand: defaultRunServiceCommand,
} = require('./scriptServiceRuntime.cjs')

const supportedStableAudioModels = new Set(['small-sfx', 'small-music', 'medium'])
const supportedDownloadSources = new Set(['auto', 'hf', 'ms'])

function normalizeStableAudioModel(model) {
  const value = String(model || '')
  return supportedStableAudioModels.has(value) ? value : 'small-sfx'
}

function normalizeDownloadSource(source) {
  const value = String(source || '')
  return supportedDownloadSources.has(value) ? value : 'auto'
}

function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function resolveStableAudioInstallPaths(env = process.env) {
  const localAppData = env.LOCALAPPDATA || ''
  const stateDir = path.join(localAppData, 'GameDesignTools', 'StableAudio3')
  const cmdDir = path.join(localAppData, 'GameDesignTools', 'bin')
  return {
    cmdDir,
    stateDir,
    configPath: path.join(stateDir, 'stable-audio-config.json'),
    servicePath: path.join(cmdDir, 'stable-audio-service.ps1'),
  }
}

function serviceUrl(port) {
  return `http://127.0.0.1:${Number(port || 8818)}`
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)
  const text = await response.text()
  const data = text ? parseJsonText(text) : null
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || text || `HTTP ${response.status}`)
  }
  return data
}

function registerStableAudioIpcHandlers({
  ipcMain,
  resolveDeploymentScript,
  fsExists = fs.existsSync,
  launchSetupTerminal = defaultLaunchSetupTerminal,
  runCommandOutput,
  runServiceCommand = defaultRunServiceCommand,
}) {
  ipcMain.handle('stable-audio:run-setup', async (_event, options = {}) => {
    const scriptPath = resolveDeploymentScript('deploy-stable-audio-3.ps1')
    if (!fsExists(scriptPath)) {
      throw new Error(`Stable Audio 3 安装脚本不存在：${scriptPath}`)
    }

    const modelPath = String(options.modelPath || 'D:\\models\\StableAudio3')
    const model = normalizeStableAudioModel(options.model)
    const source = normalizeDownloadSource(options.source)

    return launchSetupTerminal({
      args: [modelPath, model, source],
      scriptPath,
      title: 'Stable Audio 3 安装依赖',
    })
  })

  ipcMain.handle('stable-audio:setup-status', async () => {
    const { configPath, servicePath } = resolveStableAudioInstallPaths()
    const missing = []
    const details = []
    let config = null

    if (fsExists(servicePath)) details.push(`服务管理脚本：${servicePath}`)
    else missing.push(`缺少服务管理脚本：${servicePath}`)

    if (fsExists(configPath)) {
      try {
        config = parseJsonText(await fsp.readFile(configPath, 'utf8'))
        details.push(`安装配置：${configPath}`)
      } catch (error) {
        missing.push(`安装配置无法读取：${error.message}`)
      }
    } else {
      missing.push(`缺少安装配置：${configPath}`)
    }

    const pythonCommand = config?.PythonCommand ? String(config.PythonCommand) : ''
    const repoDir = config?.RepoDir ? String(config.RepoDir) : ''
    const model = normalizeStableAudioModel(config?.ModelVariant)
    details.push(`模型：${model}`)
    if (pythonCommand) {
      if (fsExists(pythonCommand)) details.push(`Python：${pythonCommand}`)
      else missing.push(`Python 解释器不存在：${pythonCommand}`)
    }
    if (repoDir) {
      if (fsExists(repoDir)) details.push(`Stable Audio 3 仓库：${repoDir}`)
      else missing.push(`Stable Audio 3 仓库不存在：${repoDir}`)
    }
    if (pythonCommand && fsExists(pythonCommand) && runCommandOutput) {
      const pythonArgs = config && Array.isArray(config.PythonArgs)
        ? config.PythonArgs.map((item) => String(item)).filter(Boolean)
        : []
      const probe = await runCommandOutput(
        pythonCommand,
        [...pythonArgs, '-c', 'import torch; print("torch ok")'],
        repoDir && fsExists(repoDir) ? { cwd: repoDir } : {},
      )
      if (probe.ok) details.push(`Python 依赖：${probe.output || 'torch ok'}`)
      else missing.push(`Python 依赖不可用：${probe.output || 'import torch 失败'}`)
    }

    if (missing.length === 0) {
      return { ok: true, output: ['Stable Audio 3 依赖已安装。', ...details].join('\n') }
    }
    return { ok: false, output: ['尚未完成 Stable Audio 3 依赖安装。', ...missing, ...details].join('\n') }
  })

  ipcMain.handle('stable-audio:service', async (_event, action = 'status') => {
    const { servicePath } = resolveStableAudioInstallPaths()
    if (!fsExists(servicePath)) {
      return { ok: false, output: '尚未安装 Stable Audio 3 服务管理命令，请先安装依赖。' }
    }

    return runServiceCommand({ action, servicePath })
  })

  ipcMain.handle('stable-audio:health', async (_event, port = 8818) => {
    try {
      const result = await fetchJson(`${serviceUrl(port)}/health`)
      return { ok: Boolean(result?.ok ?? result?.ready), output: JSON.stringify(result) }
    } catch (error) {
      return { ok: false, output: error?.message || 'Stable Audio 3 服务未就绪。' }
    }
  })

  ipcMain.handle('stable-audio:generate', async (_event, options = {}) => {
    const port = Number(options.port || 8818)
    return fetchJson(`${serviceUrl(port)}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: String(options.prompt || ''),
        durationSeconds: Number(options.durationSeconds || 1),
        seed: Number.isFinite(options.seed) ? options.seed : null,
        outputName: String(options.outputName || ''),
      }),
    })
  })
}

module.exports = {
  normalizeStableAudioModel,
  registerStableAudioIpcHandlers,
  resolveStableAudioInstallPaths,
}
