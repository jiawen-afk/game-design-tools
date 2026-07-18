const { app, BrowserWindow, dialog, ipcMain, screen, shell } = require('electron')
const { spawn } = require('node:child_process')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const {
  registerAppUpdateIpcHandlers,
} = require('./appUpdateIpcHandlers.cjs')
const {
  registerAudioEditIpcHandlers,
} = require('./audioEditIpcHandlers.cjs')
const {
  registerBirefnetIpcHandlers,
} = require('./birefnetIpcHandlers.cjs')
const {
  registerPersonalSpaceIpcHandlers,
} = require('./personalSpaceIpcHandlers.cjs')
const {
  registerImageEncodingIpcHandlers,
} = require('./imageEncodingIpcHandlers.cjs')
const {
  registerProjectStorageIpcHandlers,
} = require('./projectStorageIpcHandlers.cjs')
const {
  registerUpscaylIpcHandlers,
} = require('./upscaylIpcHandlers.cjs')
const {
  registerVoxcpmIpcHandlers,
} = require('./voxcpmIpcHandlers.cjs')
const {
  registerStableAudioIpcHandlers,
} = require('./stableAudioIpcHandlers.cjs')
const {
  registerVideoProcessingIpcHandlers,
} = require('./videoProcessingIpcHandlers.cjs')

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

function normalizePath(value) {
  return path.resolve(String(value || ''))
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

function getInitialWindowBounds() {
  const workAreaSize = screen.getPrimaryDisplay().workAreaSize
  return {
    width: Math.max(1600, Math.min(1600, workAreaSize.width - 48)),
    height: Math.max(1000, Math.min(1000, workAreaSize.height - 48)),
  }
}

function createWindow() {
  const bounds = getInitialWindowBounds()
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
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

const { checkForAppUpdates } = registerAppUpdateIpcHandlers({
  app,
  BrowserWindow,
  ipcMain,
  resolveAppPath,
})

app.whenReady().then(() => {
  createWindow()
  void videoProcessing.cleanupAbandonedTempDirs().catch(() => {})
  if (app.isPackaged) {
    setTimeout(() => {
      void checkForAppUpdates({ silent: true }).catch(() => {})
    }, 5000)
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  void videoProcessing.shutdown()
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

registerPersonalSpaceIpcHandlers({ dialog, ipcMain })
registerAudioEditIpcHandlers({ app, dialog, ipcMain })
registerImageEncodingIpcHandlers({ app, ipcMain, resolveUnpackedPath, runCommandOutput })
registerProjectStorageIpcHandlers({ app, ipcMain })
registerUpscaylIpcHandlers({ app, ipcMain, runCommandOutput })
registerBirefnetIpcHandlers({ ipcMain, resolveDeploymentScript, runCommandOutput })
registerVoxcpmIpcHandlers({ ipcMain, resolveDeploymentScript, runCommandOutput })
registerStableAudioIpcHandlers({ ipcMain, resolveDeploymentScript, runCommandOutput })
const videoProcessing = registerVideoProcessingIpcHandlers({
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  runCommandOutput,
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
