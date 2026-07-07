const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const {
  launchSetupTerminal: defaultLaunchSetupTerminal,
  runServiceCommand: defaultRunServiceCommand,
} = require('./scriptServiceRuntime.cjs')
const {
  buildStableAudioModelProbeScript,
  formatStableAudioModelAccessFailure,
  getRequestedStableAudioStatusModel,
  normalizeStableAudioModel,
  resolveStableAudioStatusModel,
} = require('./stableAudioModelAccess.cjs')
const { buildStableAudioHfLoginScript } = require('./stableAudioHfLoginScript.cjs')

const supportedDownloadSources = new Set(['auto', 'hf', 'ms'])
const stableAudioHealthTimeoutMs = 8000

function normalizeDownloadSource(source) {
  const value = String(source || '')
  return supportedDownloadSources.has(value) ? value : 'auto'
}

function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function httpErrorMessage(data, text, status) {
  if (typeof data?.detail === 'string') return data.detail
  if (data?.detail) return JSON.stringify(data.detail)
  if (typeof data?.message === 'string') return data.message
  return text || `HTTP ${status}`
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
    throw new Error(httpErrorMessage(data, text, response.status))
  }
  return data
}

function stableAudioHealthSignal() {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(stableAudioHealthTimeoutMs)
    : undefined
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

  ipcMain.handle('stable-audio:hf-login', async () => {
    const { configPath, stateDir } = resolveStableAudioInstallPaths()
    if (!fsExists(configPath)) {
      throw new Error('尚未找到 Stable Audio 3 安装配置，请先安装依赖。')
    }

    let config = null
    try {
      config = parseJsonText(await fsp.readFile(configPath, 'utf8'))
    } catch (error) {
      throw new Error(`Stable Audio 3 安装配置无法读取：${error.message}`)
    }

    const repoDir = config?.RepoDir ? String(config.RepoDir) : ''
    if (!repoDir) {
      throw new Error('Stable Audio 3 安装配置缺少仓库路径，请先重新安装依赖。')
    }
    if (!fsExists(repoDir)) {
      throw new Error(`Stable Audio 3 仓库不存在：${repoDir}`)
    }

    await fsp.mkdir(stateDir, { recursive: true })
    const scriptPath = path.join(stateDir, 'stable-audio-hf-login.ps1')
    await fsp.writeFile(scriptPath, buildStableAudioHfLoginScript(), 'utf8')
    return launchSetupTerminal({
      args: [repoDir],
      scriptPath,
      title: 'Stable Audio 3 登录 HuggingFace',
    })
  })

  ipcMain.handle('stable-audio:setup-status', async (_event, options = {}) => {
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
    const configuredModel = normalizeStableAudioModel(config?.ModelVariant)
    const requestedModel = getRequestedStableAudioStatusModel(options)
    const model = resolveStableAudioStatusModel(options, config)
    const modelMismatch = Boolean(requestedModel && config?.ModelVariant && configuredModel !== requestedModel)
    if (requestedModel) details.push(`当前选择模型：${requestedModel}`)
    else details.push(`模型：${model}`)
    if (config?.ModelVariant) details.push(`${modelMismatch ? '已安装配置模型' : '安装配置模型'}：${configuredModel}`)
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

      if (probe.ok) {
        const modelProbe = await runCommandOutput(
          pythonCommand,
          [...pythonArgs, '-c', buildStableAudioModelProbeScript(model)],
          repoDir && fsExists(repoDir) ? { cwd: repoDir } : {},
        )
        if (modelProbe.ok) details.push(`模型缓存：${modelProbe.output || `${model} ok`}`)
        else missing.push(formatStableAudioModelAccessFailure(model, modelProbe.output, repoDir))
      }
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
      const result = await fetchJson(`${serviceUrl(port)}/health`, { signal: stableAudioHealthSignal() })
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
        model: normalizeStableAudioModel(options.model),
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
