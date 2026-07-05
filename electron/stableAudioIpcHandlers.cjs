const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const {
  launchSetupTerminal: defaultLaunchSetupTerminal,
  runServiceCommand: defaultRunServiceCommand,
} = require('./scriptServiceRuntime.cjs')

const supportedStableAudioModels = new Set(['small-sfx', 'small-music', 'medium'])
const supportedDownloadSources = new Set(['auto', 'hf', 'ms'])
const stableAudioModelRepos = {
  'small-sfx': 'stabilityai/stable-audio-3-small-sfx',
  'small-music': 'stabilityai/stable-audio-3-small-music',
  medium: 'stabilityai/stable-audio-3-medium',
}
const stableAudioHealthTimeoutMs = 8000

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

function httpErrorMessage(data, text, status) {
  if (typeof data?.detail === 'string') return data.detail
  if (data?.detail) return JSON.stringify(data.detail)
  if (typeof data?.message === 'string') return data.message
  return text || `HTTP ${status}`
}

function isStableAudioModelAccessError(output) {
  const text = String(output || '').toLowerCase()
  return (
    text.includes('gatedrepoerror') ||
    text.includes('401 unauthorized') ||
    text.includes('cannot access gated repo') ||
    text.includes('access to model') ||
    text.includes('please log in')
  )
}

function stableAudioModelUrl(model) {
  const repoId = stableAudioModelRepos[normalizeStableAudioModel(model)]
  return `https://huggingface.co/${repoId}`
}

function formatStableAudioModelAccessFailure(model, output, repoDir = '') {
  const repoId = stableAudioModelRepos[normalizeStableAudioModel(model)]
  const raw = String(output || '').trim()
  if (isStableAudioModelAccessError(raw)) {
    const loginLocation = repoDir
      ? `进入 ${repoDir} 后运行：uv run hf auth login`
      : '在 Stable Audio 3 安装目录运行：uv run hf auth login'
    return [
      `模型 ${model} 需要 HuggingFace 授权后才能下载：${repoId}`,
      `访问链接：${stableAudioModelUrl(model)}`,
      '操作步骤：',
      '1. 登录 HuggingFace。',
      '2. 打开上面的访问链接，申请或同意模型访问许可。',
      `3. ${loginLocation}`,
      '4. 回到本工具重新点击“检测依赖和模型”。',
    ].join('\n')
  }
  return `模型 ${model} 访问检测失败：${raw || '无法读取 HuggingFace 模型配置。'}`
}

function buildStableAudioModelProbeScript(model) {
  const normalizedModel = normalizeStableAudioModel(model)
  const repoId = stableAudioModelRepos[normalizedModel]
  return [
    'from huggingface_hub import hf_hub_download',
    `hf_hub_download(repo_id=${JSON.stringify(repoId)}, filename="model_config.json", etag_timeout=10)`,
    `print(${JSON.stringify(`model access ok: ${normalizedModel}`)})`,
  ].join('\n')
}

function buildStableAudioHfLoginScript() {
  return [
    'param(',
    '    [Parameter(Mandatory=$true)]',
    '    [string]$RepoDir',
    ')',
    '',
    '$ErrorActionPreference = "Stop"',
    'Write-Host "==> Stable Audio 3 HuggingFace 登录"',
    'if (-not (Test-Path -LiteralPath $RepoDir)) {',
    '    Write-Host "Stable Audio 3 仓库不存在：$RepoDir" -ForegroundColor Red',
    '    exit 1',
    '}',
    'Set-Location -LiteralPath $RepoDir',
    'Write-Host "请先在 HuggingFace 模型页申请或同意模型访问许可。"',
    'Write-Host "Token 页面：https://huggingface.co/settings/tokens"',
    'Write-Host "下面会执行：uv run hf auth login"',
    'uv run hf auth login',
    'if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }',
    'Write-Host ""',
    'Write-Host "HuggingFace 登录完成。请回到工具点击“检测依赖和模型”。"',
  ].join('\r\n')
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

      if (probe.ok) {
        const modelProbe = await runCommandOutput(
          pythonCommand,
          [...pythonArgs, '-c', buildStableAudioModelProbeScript(model)],
          repoDir && fsExists(repoDir) ? { cwd: repoDir } : {},
        )
        if (modelProbe.ok) details.push(`模型访问：${modelProbe.output || `${model} ok`}`)
        else missing.push(`模型访问不可用：${formatStableAudioModelAccessFailure(model, modelProbe.output, repoDir)}`)
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
