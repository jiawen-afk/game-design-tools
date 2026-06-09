const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const allowedPersonalSpaceRoots = new Set()

function resolveAppPath(...parts) {
  return path.join(app.getAppPath(), ...parts)
}

function resolveUnpackedPath(...parts) {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', ...parts)
    : resolveAppPath(...parts)
}

function resolveDeploymentScript(fileName) {
  return resolveUnpackedPath('scripts', fileName)
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

function normalizePath(value) {
  return path.resolve(String(value || ''))
}

function isInside(parent, child) {
  const relative = path.relative(parent, child)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function registerPersonalSpaceRoot(rootPath) {
  const normalized = normalizePath(rootPath)
  allowedPersonalSpaceRoots.add(normalized)
  return normalized
}

function assertAllowedPersonalSpacePath(targetPath) {
  const normalized = normalizePath(targetPath)
  for (const root of allowedPersonalSpaceRoots) {
    if (isInside(root, normalized)) return normalized
  }
  throw new Error('路径未授权，请先在个人空间中选择资源目录。')
}

function assertSafeChildName(name) {
  const value = String(name || '').trim()
  if (!value || value.includes('/') || value.includes('\\') || value === '.' || value === '..') {
    throw new Error('资源名称无效。')
  }
  return value
}

async function directoryExists(targetPath) {
  try {
    return (await fsp.stat(targetPath)).isDirectory()
  } catch {
    return false
  }
}

function runCommandOutput(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true, ...options })
    let output = ''
    child.stdout?.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.stderr?.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.on('error', (error) => resolve({ ok: false, output: error.message }))
    child.on('close', (code) => resolve({ ok: code === 0, output: output.trim() }))
  })
}

function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'Game Design Tools',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.removeMenu()
  void win.loadFile(resolveAppPath('dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('personal-space:select-directory', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择个人空间资源目录',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const selectedPath = registerPersonalSpaceRoot(result.filePaths[0])
  return { name: path.basename(selectedPath), path: selectedPath }
})

ipcMain.handle('personal-space:register-directory', async (_event, rootPath) => {
  const selectedPath = normalizePath(rootPath)
  if (!(await directoryExists(selectedPath))) throw new Error('个人空间资源目录不存在。')
  registerPersonalSpaceRoot(selectedPath)
  return { name: path.basename(selectedPath), path: selectedPath }
})

ipcMain.handle('personal-space:ensure-directory', async (_event, parentPath, name, options = {}) => {
  const parent = assertAllowedPersonalSpacePath(parentPath)
  const target = assertAllowedPersonalSpacePath(path.join(parent, assertSafeChildName(name)))
  if (options.create) await fsp.mkdir(target, { recursive: true })
  if (!(await directoryExists(target))) throw new Error(`目录不存在：${name}`)
  return { name: path.basename(target), path: target }
})

ipcMain.handle('personal-space:get-file', async (_event, parentPath, name, options = {}) => {
  const parent = assertAllowedPersonalSpacePath(parentPath)
  const target = assertAllowedPersonalSpacePath(path.join(parent, assertSafeChildName(name)))
  if (!options.create && !fs.existsSync(target)) throw new Error(`文件不存在：${name}`)
  return { name: path.basename(target), path: target }
})

ipcMain.handle('personal-space:write-file', async (_event, filePath, data) => {
  const target = assertAllowedPersonalSpacePath(filePath)
  await fsp.mkdir(path.dirname(target), { recursive: true })
  await fsp.writeFile(target, Buffer.from(data))
  return true
})

ipcMain.handle('personal-space:read-file', async (_event, filePath) => {
  const target = assertAllowedPersonalSpacePath(filePath)
  const data = await fsp.readFile(target)
  return { name: path.basename(target), data }
})

ipcMain.handle('personal-space:remove-entry', async (_event, parentPath, name) => {
  const parent = assertAllowedPersonalSpacePath(parentPath)
  const target = assertAllowedPersonalSpacePath(path.join(parent, assertSafeChildName(name)))
  await fsp.rm(target, { recursive: true, force: false })
  return true
})

ipcMain.handle('file:save', async (_event, fileName, data) => {
  const safeName = path.basename(String(fileName || 'export.bin'))
  const result = await dialog.showSaveDialog({
    title: '保存导出文件',
    defaultPath: safeName,
  })
  if (result.canceled || !result.filePath) return null
  await fsp.writeFile(result.filePath, Buffer.from(data))
  return { name: path.basename(result.filePath), path: result.filePath }
})

ipcMain.handle('shell:open-path', async (_event, targetPath) => {
  const error = await shell.openPath(normalizePath(targetPath))
  if (error) throw new Error(error)
  return true
})

ipcMain.handle('hardware:detect', async () => {
  const base = {
    platform: process.platform,
    arch: process.arch,
    cpuModel: os.cpus()[0]?.model || 'Unknown CPU',
    cpuCores: os.cpus().length,
    memoryGb: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10,
    nvidiaSmi: '',
  }

  return new Promise((resolve) => {
    const probe = spawn('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], {
      windowsHide: true,
    })
    let stdout = ''
    probe.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8') })
    probe.on('error', () => resolve(base))
    probe.on('close', (code) => resolve({ ...base, nvidiaSmi: code === 0 ? stdout.trim() : '' }))
  })
})

ipcMain.handle('voxcpm:run-setup', async (_event, options = {}) => {
  const scriptPath = resolveDeploymentScript('deploy-voxcpm.ps1')
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`VoxCPM 安装脚本不存在：${scriptPath}`)
  }

  const modelPath = String(options.modelPath || 'D:\\models\\VoxCPM2')
  const model = String(options.model || 'VoxCPM2')
  const source = String(options.source || 'auto')

  return new Promise((resolve, reject) => {
    const child = spawn('cmd.exe', [
      '/c',
      'start',
      'VoxCPM 安装依赖',
      'powershell.exe',
      '-NoExit',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      modelPath,
      model,
      source,
    ], {
      detached: true,
      windowsHide: false,
      stdio: 'ignore',
    })
    let settled = false
    const settle = (handler) => {
      if (settled) return
      settled = true
      handler()
    }
    child.unref()
    child.on('error', (error) => settle(() => reject(new Error(`PowerShell 安装终端启动失败：${error.message}`))))
    child.on('close', (code) => {
      if (code === 0) settle(() => resolve({ started: true, scriptPath }))
      else settle(() => reject(new Error(`PowerShell 安装终端启动失败，退出码：${code}`)))
    })
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
  const allowedActions = new Set(['start', 'stop', 'restart', 'status'])
  const nextAction = allowedActions.has(action) ? action : 'status'
  const { servicePath } = resolveVoxcpmInstallPaths()
  if (!fs.existsSync(servicePath)) {
    return { ok: false, output: '尚未安装 VoxCPM 服务管理命令，请先安装依赖。' }
  }

  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', servicePath, nextAction], {
      windowsHide: true,
    })
    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.stderr.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.on('error', (error) => resolve({ ok: false, output: error.message }))
    child.on('close', (code) => resolve({ ok: code === 0, output: output.trim() }))
  })
})
