const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const {
  checkBirefnetReady,
  removeBirefnetBackground,
} = require('./birefnetServiceClient.cjs')
const {
  launchSetupTerminal,
  runServiceCommand,
} = require('./scriptServiceRuntime.cjs')

function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function resolveBirefnetInstallPaths() {
  const localAppData = process.env.LOCALAPPDATA || ''
  const stateDir = path.join(localAppData, 'GameDesignTools', 'BiRefNet')
  const cmdDir = path.join(localAppData, 'GameDesignTools', 'bin')
  return {
    cmdDir,
    stateDir,
    configPath: path.join(stateDir, 'birefnet-config.json'),
    servicePath: path.join(cmdDir, 'birefnet-service.ps1'),
  }
}

function normalizeBirefnetDevicePreference(value) {
  return value === 'cuda' || value === 'cpu' ? value : 'auto'
}

function registerBirefnetIpcHandlers({ ipcMain, resolveDeploymentScript, runCommandOutput }) {
  ipcMain.handle('birefnet:run-setup', async (_event, options = {}) => {
    const scriptPath = resolveDeploymentScript('deploy-birefnet.ps1')
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`BiRefNet 安装脚本不存在：${scriptPath}`)
    }

    const model = String(options.model || 'ZhengPeng7/BiRefNet_HR-matting')
    const port = Number(options.port || 17860)
    const device = normalizeBirefnetDevicePreference(options.device)

    return launchSetupTerminal({
      args: [model, String(port), device],
      scriptPath,
      title: 'BiRefNet 安装依赖',
    })
  })

  ipcMain.handle('birefnet:setup-status', async () => {
    const { configPath, servicePath } = resolveBirefnetInstallPaths()
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
    const serviceDir = config?.ServiceDir ? String(config.ServiceDir) : ''
    const device = normalizeBirefnetDevicePreference(config?.Device)
    details.push(`设备偏好：${device}`)
    if (pythonCommand) {
      if (fs.existsSync(pythonCommand)) details.push(`Python：${pythonCommand}`)
      else missing.push(`Python 解释器不存在：${pythonCommand}`)
    }
    if (serviceDir) {
      if (fs.existsSync(serviceDir)) details.push(`BiRefNet 服务目录：${serviceDir}`)
      else missing.push(`BiRefNet 服务目录不存在：${serviceDir}`)
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
          'import torch; import torchvision; import cv2; import fastapi; import transformers; print("birefnet dependencies ok")',
        ],
        serviceDir && fs.existsSync(serviceDir) ? { cwd: serviceDir } : {},
      )
      if (probe.ok) details.push(`Python 依赖：${probe.output || 'birefnet dependencies ok'}`)
      else missing.push(`Python 依赖不可用：${probe.output || 'import torch / torchvision / cv2 / fastapi / transformers 失败'}`)
    }

    if (missing.length === 0) {
      return { ok: true, output: ['BiRefNet 依赖已安装。', ...details].join('\n') }
    }
    return { ok: false, output: ['尚未完成 BiRefNet 依赖安装。', ...missing, ...details].join('\n') }
  })

  ipcMain.handle('birefnet:set-device', async (_event, device = 'auto') => {
    const nextDevice = normalizeBirefnetDevicePreference(device)
    const { configPath } = resolveBirefnetInstallPaths()
    if (!fs.existsSync(configPath)) {
      return { ok: false, output: '尚未安装 BiRefNet，请先安装依赖。' }
    }

    let config = {}
    try {
      config = parseJsonText(await fsp.readFile(configPath, 'utf8'))
    } catch (error) {
      return { ok: false, output: `BiRefNet 安装配置无法读取：${error.message}` }
    }

    await fsp.writeFile(configPath, JSON.stringify({ ...config, Device: nextDevice }, null, 2), 'utf8')
    return { ok: true, output: `BiRefNet 设备偏好已切换为 ${nextDevice}。` }
  })

  ipcMain.handle('birefnet:service', async (_event, action = 'status') => {
    const { servicePath } = resolveBirefnetInstallPaths()
    if (!fs.existsSync(servicePath)) {
      return { ok: false, output: '尚未安装 BiRefNet 服务管理命令，请先安装依赖。' }
    }

    return runServiceCommand({ action, servicePath })
  })

  ipcMain.handle('birefnet:health', async (_event, port = 17860) => {
    const servicePort = Number(port || 17860)
    try {
      const result = await checkBirefnetReady(servicePort)
      return {
        ok: Boolean(result?.ok && result?.ready),
        output: result ? JSON.stringify(result) : 'BiRefNet 模型已就绪。',
      }
    } catch (error) {
      return {
        ok: false,
        output: error?.message || 'BiRefNet 模型未就绪。',
      }
    }
  })

  ipcMain.handle('birefnet:remove-background', async (_event, options = {}) => {
    return removeBirefnetBackground(options)
  })
}

module.exports = {
  normalizeBirefnetDevicePreference,
  registerBirefnetIpcHandlers,
  resolveBirefnetInstallPaths,
}
