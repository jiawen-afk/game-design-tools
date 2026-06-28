const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const {
  launchSetupTerminal,
  runServiceCommand,
} = require('./scriptServiceRuntime.cjs')

function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function resolveVoxcpmInstallPaths() {
  const localAppData = process.env.LOCALAPPDATA || ''
  const stateDir = path.join(localAppData, 'GameDesignTools', 'VoxCPM')
  const cmdDir = path.join(localAppData, 'GameDesignTools', 'bin')
  return {
    cmdDir,
    stateDir,
    configPath: path.join(stateDir, 'voxcpm-config.json'),
    servicePath: path.join(cmdDir, 'voxcpm-service.ps1'),
  }
}

function registerVoxcpmIpcHandlers({ ipcMain, resolveDeploymentScript, runCommandOutput }) {
  ipcMain.handle('voxcpm:run-setup', async (_event, options = {}) => {
    const scriptPath = resolveDeploymentScript('deploy-voxcpm.ps1')
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`VoxCPM 安装脚本不存在：${scriptPath}`)
    }

    const modelPath = String(options.modelPath || 'D:\\models\\VoxCPM2')
    const model = String(options.model || 'VoxCPM2')
    const source = String(options.source || 'auto')

    return launchSetupTerminal({
      args: [modelPath, model, source],
      scriptPath,
      title: 'VoxCPM 安装依赖',
    })
  })

  ipcMain.handle('voxcpm:setup-status', async () => {
    const { configPath, servicePath } = resolveVoxcpmInstallPaths()
    const missing = []
    const details = []
    let config = null

    if (fs.existsSync(servicePath)) details.push(`服务管理脚本：${servicePath}`)
    else missing.push(`缺少服务管理脚本：${servicePath}`)

    if (fs.existsSync(configPath)) {
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
    if (pythonCommand) {
      if (fs.existsSync(pythonCommand)) details.push(`Python：${pythonCommand}`)
      else missing.push(`Python 解释器不存在：${pythonCommand}`)
    }
    if (repoDir) {
      if (fs.existsSync(repoDir)) details.push(`VoxCPM 仓库：${repoDir}`)
      else missing.push(`VoxCPM 仓库不存在：${repoDir}`)
    }
    if (pythonCommand && fs.existsSync(pythonCommand)) {
      const pythonArgs = config && Array.isArray(config.PythonArgs)
        ? config.PythonArgs.map((item) => String(item)).filter(Boolean)
        : []
      const probe = await runCommandOutput(
        pythonCommand,
        [
          ...pythonArgs,
          '-c',
          'import voxcpm; import torch; print("voxcpm ok"); print("torch ok")',
        ],
        repoDir && fs.existsSync(repoDir) ? { cwd: repoDir } : {},
      )
      if (probe.ok) details.push(`Python 依赖：${probe.output || 'voxcpm ok, torch ok'}`)
      else missing.push(`Python 依赖不可用：${probe.output || 'import voxcpm / import torch 失败'}`)
    }

    if (missing.length === 0) {
      return { ok: true, output: ['VoxCPM 依赖已安装。', ...details].join('\n') }
    }
    return { ok: false, output: ['尚未完成 VoxCPM 依赖安装。', ...missing, ...details].join('\n') }
  })

  ipcMain.handle('voxcpm:service', async (_event, action = 'status') => {
    const { servicePath } = resolveVoxcpmInstallPaths()
    if (!fs.existsSync(servicePath)) {
      return { ok: false, output: '尚未安装 VoxCPM 服务管理命令，请先安装依赖。' }
    }

    return runServiceCommand({ action, servicePath })
  })
}

module.exports = {
  registerVoxcpmIpcHandlers,
  resolveVoxcpmInstallPaths,
}
