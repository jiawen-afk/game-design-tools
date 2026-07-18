const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

const {
  buildPreviewArgs,
  buildProbeArgs,
  mapProbeResult,
} = require('./videoProcessingCommands.cjs')
const {
  createVideoProcessingJobManager,
} = require('./videoProcessingJobs.cjs')
const {
  getVideoRuntimeStatus,
  installVideoRuntime,
} = require('./videoProcessingRuntime.cjs')
const {
  buildUpscaylArgs,
  getUpscaylRuntimeStatus,
  resolveUpscaylRuntimePaths,
} = require('./upscaylIpcHandlers.cjs')

const videoExtensions = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi', '.ogv', '.ogg', '.m4v', '.mpeg', '.mpg'])

function assertVideoInputPath(filePath) {
  const targetPath = path.resolve(String(filePath || ''))
  if (!videoExtensions.has(path.extname(targetPath).toLowerCase())) {
    throw new Error('请选择常见视频文件。')
  }
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
    throw new Error(`视频文件不存在：${targetPath}`)
  }
  return targetPath
}

function parseJsonOutput(result, failureMessage) {
  if (!result?.ok) throw new Error(result?.output || failureMessage)
  try {
    return JSON.parse(String(result.output || ''))
  } catch (error) {
    throw new Error(`${failureMessage}：返回了无效 JSON（${error.message}）`)
  }
}

function sendToWindows(BrowserWindow, channel, payload) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send(channel, payload)
    }
  }
}

async function probeVideoPath(app, runCommandOutput, filePath) {
  const inputPath = assertVideoInputPath(filePath)
  const runtime = await getVideoRuntimeStatus(app)
  if (!runtime.installed) throw new Error('请先安装视频处理运行包。')
  const result = await runCommandOutput(runtime.ffprobePath, buildProbeArgs(inputPath))
  return mapProbeResult(parseJsonOutput(result, '视频探测失败'), inputPath)
}

function previewTempDir(app) {
  return path.join(process.env.LOCALAPPDATA || app.getPath('temp'), 'GameDesignTools', 'Temp', 'VideoProcessingPreview')
}

async function runCheckedCommand(runCommandOutput, command, args, options, failureMessage) {
  const result = await runCommandOutput(command, args, options)
  if (!result?.ok) throw new Error(result?.output || failureMessage)
}

function upscaleScale(percent) {
  if (percent <= 100) return null
  if (percent <= 200) return 2
  if (percent <= 300) return 3
  return 4
}

function registerVideoProcessingIpcHandlers({ app, BrowserWindow, dialog, ipcMain, runCommandOutput }) {
  const manager = createVideoProcessingJobManager({
    app,
    emitProgress: (progress) => sendToWindows(BrowserWindow, 'video-processing:progress', progress),
  })

  ipcMain.handle('video-processing:choose-files', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择视频文件',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '常见视频', extensions: [...videoExtensions].map((extension) => extension.slice(1)) }],
    })
    if (result.canceled) return []
    const files = []
    for (const filePath of result.filePaths) {
      const targetPath = assertVideoInputPath(filePath)
      const stats = await fsp.stat(targetPath)
      files.push({ name: path.basename(targetPath), path: targetPath, size: stats.size })
    }
    return files
  })

  ipcMain.handle('video-processing:choose-output-directory', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 OGV 输出目录',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const selectedPath = path.resolve(result.filePaths[0])
    return { name: path.basename(selectedPath), path: selectedPath }
  })

  ipcMain.handle('video-processing:runtime-status', async () => getVideoRuntimeStatus(app))

  ipcMain.handle('video-processing:install-runtime', async (event) => installVideoRuntime(app, {
    runCommandOutput,
    onProgress: (progress) => {
      if (!event.sender.isDestroyed()) event.sender.send('video-processing:runtime-progress', progress)
    },
  }))

  ipcMain.handle('video-processing:probe', async (_event, filePath) => (
    probeVideoPath(app, runCommandOutput, filePath)
  ))

  ipcMain.handle('video-processing:preview', async (_event, options = {}) => {
    const inputPath = assertVideoInputPath(options.inputPath)
    const runtime = await getVideoRuntimeStatus(app)
    if (!runtime.installed) throw new Error('请先安装视频处理运行包。')
    const probe = await probeVideoPath(app, runCommandOutput, inputPath)
    const settings = options.settings || {}
    const targetWidth = Math.max(2, Math.round(Number(settings.width || probe.width)))
    const targetHeight = Math.max(2, Math.round(Number(settings.height || probe.height)))
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const directory = path.join(previewTempDir(app), stamp)
    const sourcePath = path.join(directory, 'source.png')
    const processedPath = path.join(directory, 'processed.png')
    await fsp.mkdir(directory, { recursive: true })
    await runCheckedCommand(runCommandOutput, runtime.ffmpegPath, buildPreviewArgs({
      inputPath,
      timestampSeconds: Math.max(0, Number(options.timestampSeconds || 0)),
      width: probe.width,
      height: probe.height,
      outputPath: sourcePath,
    }), {}, '源视频帧提取失败。')

    const scale = upscaleScale(Number(settings.percent || 100))
    if (scale) {
      const upscaylStatus = await getUpscaylRuntimeStatus(app)
      if (!upscaylStatus.installed) throw new Error('超过 100% 的预览必须安装 Upscayl GPU 运行包。')
      const upscaylPaths = resolveUpscaylRuntimePaths(app)
      const upscaledPath = path.join(directory, 'upscaled.png')
      await runCheckedCommand(runCommandOutput, upscaylPaths.execPath, buildUpscaylArgs({
        inputPath: sourcePath,
        outputPath: upscaledPath,
        modelsPath: upscaylPaths.modelsDir,
        format: 'png',
        options: {
          model: settings.upscaylModel,
          scale,
          tileSize: settings.tileSize,
          ttaMode: settings.ttaMode,
          gpuId: settings.gpuId,
          threadProfile: settings.threadProfile,
        },
      }), { cwd: upscaylPaths.binDir }, 'AI 单帧预览生成失败。')
      await runCheckedCommand(runCommandOutput, runtime.ffmpegPath, buildPreviewArgs({
        inputPath: upscaledPath,
        timestampSeconds: 0,
        width: targetWidth,
        height: targetHeight,
        outputPath: processedPath,
      }), {}, 'AI 预览精确缩放失败。')
    } else {
      await runCheckedCommand(runCommandOutput, runtime.ffmpegPath, buildPreviewArgs({
        inputPath,
        timestampSeconds: Math.max(0, Number(options.timestampSeconds || 0)),
        width: targetWidth,
        height: targetHeight,
        outputPath: processedPath,
      }), {}, '缩放预览生成失败。')
    }
    return { sourcePath, processedPath, width: targetWidth, height: targetHeight }
  })

  ipcMain.handle('video-processing:start', async (_event, options = {}) => manager.start(options))
  ipcMain.handle('video-processing:cancel', async (_event, jobId) => manager.cancel(jobId))

  async function cleanupAbandonedTempDirs() {
    await manager.cleanupAbandonedTempDirs()
    const previewRoot = previewTempDir(app)
    let entries = []
    try { entries = await fsp.readdir(previewRoot, { withFileTypes: true }) } catch { return }
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const target = path.join(previewRoot, entry.name)
      if ((await fsp.stat(target)).mtimeMs < cutoff) await fsp.rm(target, { recursive: true, force: true })
    }
  }

  return { cleanupAbandonedTempDirs, shutdown: manager.shutdown }
}

module.exports = {
  assertVideoInputPath,
  parseJsonOutput,
  probeVideoPath,
  registerVideoProcessingIpcHandlers,
}
