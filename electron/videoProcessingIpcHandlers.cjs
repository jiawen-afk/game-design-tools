const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

const {
  buildPreviewArgs,
  buildProbeArgs,
  getVideoOutputProfile,
  mapProbeResult,
} = require('./videoProcessingCommands.cjs')
const {
  createVideoProcessingJobManager,
  validateVideoJobId,
} = require('./videoProcessingJobs.cjs')
const { createVideoOutputDirectorySession } = require('./videoOutputDirectoryPreference.cjs')
const {
  getVideoRuntimeStatus,
  installVideoRuntime,
} = require('./videoProcessingRuntime.cjs')
const {
  buildUpscaylArgs,
  getUpscaylRuntimeStatus,
  resolveUpscaylRuntimePaths,
  upscaylGpuIds,
  upscaylModels,
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

async function probeVideoPath(app, runCommandOutput, filePath, signal) {
  const inputPath = assertVideoInputPath(filePath)
  const runtime = await getVideoRuntimeStatus(app)
  if (!runtime.installed) throw new Error('请先安装视频处理运行包。')
  const result = await runCommandOutput(runtime.ffprobePath, buildProbeArgs(inputPath), { signal })
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

function normalizeEvenDimension(value) {
  const rounded = Math.max(2, Math.round(Number(value)))
  return rounded % 2 === 0 ? rounded : rounded + 1
}

function normalizeVideoSettings(settings, nativeProbe) {
  if (!nativeProbe || nativeProbe.durationSeconds <= 0
    || nativeProbe.width < 2 || nativeProbe.height < 2 || nativeProbe.averageFps <= 0) {
    throw new Error('源视频探测结果无效，请重新导入。')
  }
  if (!settings || typeof settings !== 'object') throw new Error('视频处理设置无效。')
  const percent = Number(settings.percent)
  if (!Number.isFinite(percent) || percent < 25 || percent > 400) {
    throw new Error('分辨率比例必须在 25% 到 400% 之间。')
  }
  const expectedWidth = normalizeEvenDimension(nativeProbe.width * percent / 100)
  const expectedHeight = normalizeEvenDimension(nativeProbe.height * percent / 100)
  if (Number(settings.width) !== expectedWidth || Number(settings.height) !== expectedHeight) {
    throw new Error('目标尺寸与源视频及分辨率比例不一致，请重新导入或调整。')
  }
  const targetFps = Number(settings.targetFps)
  if (!Number.isFinite(targetFps) || targetFps < 1) throw new Error('目标帧率必须大于或等于 1。')
  if (targetFps > nativeProbe.averageFps) throw new Error('目标帧率不能高于源视频帧率。')
  getVideoOutputProfile(settings.outputFormat)
  if (!['quality', 'target-size'].includes(settings.qualityMode)) throw new Error('视频压缩模式无效。')
  if (!['high', 'balanced', 'extreme'].includes(settings.qualityPreset)) throw new Error('视频质量预设无效。')
  if (settings.qualityMode === 'target-size' && (!Number.isFinite(Number(settings.targetMb)) || Number(settings.targetMb) <= 0)) {
    throw new Error('请输入大于 0 的目标文件大小。')
  }
  if (!['keep', 'mute'].includes(settings.audioMode) || ![64, 96, 128, 160].includes(Number(settings.audioKbps))) {
    throw new Error('音频设置无效。')
  }
  if (!upscaylModels.includes(String(settings.upscaylModel))
    || !upscaylGpuIds.includes(String(settings.gpuId))
    || !['balanced', 'low-memory', 'throughput'].includes(settings.threadProfile)
    || !Number.isFinite(Number(settings.tileSize)) || Number(settings.tileSize) < 32) {
    throw new Error('Upscayl GPU 高级设置无效。')
  }
  return {
    ...settings,
    percent,
    width: expectedWidth,
    height: expectedHeight,
    targetMb: settings.targetMb === null ? null : Number(settings.targetMb),
    targetFps,
    audioKbps: Number(settings.audioKbps),
    tileSize: Math.round(Number(settings.tileSize)),
    ttaMode: settings.ttaMode === true,
  }
}

function normalizeVideoStartOptions(options, nativeProbe, selectedOutputDirectories) {
  if (!options || typeof options !== 'object') throw new Error('视频任务参数无效。')
  const jobId = validateVideoJobId(options.jobId)
  const inputPath = path.resolve(String(options.inputPath || ''))
  const outputDirectory = path.resolve(String(options.outputDirectory || ''))
  if (!selectedOutputDirectories?.has(outputDirectory)) {
    throw new Error('输出目录必须通过选择器确认。')
  }
  if (nativeProbe?.path !== inputPath) throw new Error('源视频探测结果无效，请重新导入。')
  return {
    ...options,
    jobId,
    inputPath,
    outputDirectory,
    probe: nativeProbe,
    settings: normalizeVideoSettings(options.settings, nativeProbe),
  }
}

function normalizeVideoPreviewOptions(options, nativeProbe) {
  if (!options || typeof options !== 'object') throw new Error('视频预览参数无效。')
  const inputPath = path.resolve(String(options.inputPath || ''))
  if (nativeProbe?.path !== inputPath) throw new Error('源视频探测结果无效，请重新导入。')
  const timestamp = Number(options.timestampSeconds)
  return {
    ...options,
    inputPath,
    timestampSeconds: Math.min(
      Number(nativeProbe.durationSeconds),
      Math.max(0, Number.isFinite(timestamp) ? timestamp : 0),
    ),
    settings: normalizeVideoSettings(options.settings, nativeProbe),
  }
}

function createVideoPreviewLifecycle() {
  let controller = null
  let activePromise = null
  let retainedCleanup = null

  function isRunning() {
    return controller !== null
  }

  async function releaseRetained() {
    if (!retainedCleanup) return false
    const cleanup = retainedCleanup
    retainedCleanup = null
    await cleanup()
    return true
  }

  function retain(cleanup) {
    if (typeof cleanup !== 'function') throw new Error('视频预览清理函数无效。')
    retainedCleanup = cleanup
  }

  function run(task) {
    if (controller) throw new Error('已有视频预览正在运行。')
    const currentController = new AbortController()
    controller = currentController
    const trackedPromise = Promise.resolve()
      .then(async () => {
        await releaseRetained()
        if (currentController.signal.aborted) throw new Error('视频预览已取消。')
        return task(currentController.signal)
      })
      .finally(() => {
        if (controller === currentController) controller = null
        if (activePromise === trackedPromise) activePromise = null
      })
    activePromise = trackedPromise
    return trackedPromise
  }

  async function cancel() {
    const wasRunning = Boolean(controller)
    const hadRetained = Boolean(retainedCleanup)
    const promise = activePromise
    controller?.abort()
    try { await promise } catch {}
    const released = await releaseRetained()
    return wasRunning || hadRetained || released
  }

  async function shutdown() {
    await cancel()
  }

  return { cancel, isRunning, retain, run, shutdown }
}

function registerVideoProcessingIpcHandlers({ app, BrowserWindow, dialog, ipcMain, runCommandOutput }) {
  const outputDirectorySession = createVideoOutputDirectorySession(app)
  const manager = createVideoProcessingJobManager({
    app,
    emitProgress: (progress) => sendToWindows(BrowserWindow, 'video-processing:progress', progress),
  })
  const previewLifecycle = createVideoPreviewLifecycle()
  let jobStarting = false

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
    const rememberedDirectory = await outputDirectorySession.restore()
    const result = await dialog.showOpenDialog({
      title: '选择视频输出目录',
      defaultPath: rememberedDirectory?.path,
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const selectedPath = path.resolve(result.filePaths[0])
    return outputDirectorySession.remember(selectedPath)
  })

  ipcMain.handle('video-processing:get-output-directory', async () => outputDirectorySession.restore())

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
    if (previewLifecycle.isRunning() || jobStarting || manager.isRunning()) {
      throw new Error('已有视频预览或处理任务正在使用 FFmpeg/Upscayl，请稍后重试。')
    }
    return previewLifecycle.run(async (signal) => {
      let directory = ''
      try {
        const inputPath = assertVideoInputPath(options.inputPath)
        const runtime = await getVideoRuntimeStatus(app)
        if (!runtime.installed) throw new Error('请先安装视频处理运行包。')
        const probe = await probeVideoPath(app, runCommandOutput, inputPath, signal)
        const normalized = normalizeVideoPreviewOptions(options, probe)
        const settings = normalized.settings
        const targetWidth = settings.width
        const targetHeight = settings.height
        const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        directory = path.join(previewTempDir(app), stamp)
        const sourcePath = path.join(directory, 'source.png')
        const processedPath = path.join(directory, 'processed.png')
        await fsp.mkdir(directory, { recursive: true })
        await runCheckedCommand(runCommandOutput, runtime.ffmpegPath, buildPreviewArgs({
          inputPath,
          timestampSeconds: normalized.timestampSeconds,
          width: probe.width,
          height: probe.height,
          outputPath: sourcePath,
        }), { signal }, '源视频帧提取失败。')

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
          }), { cwd: upscaylPaths.binDir, signal }, 'AI 单帧预览生成失败。')
          await runCheckedCommand(runCommandOutput, runtime.ffmpegPath, buildPreviewArgs({
            inputPath: upscaledPath,
            timestampSeconds: 0,
            width: targetWidth,
            height: targetHeight,
            outputPath: processedPath,
          }), { signal }, 'AI 预览精确缩放失败。')
        } else {
          await runCheckedCommand(runCommandOutput, runtime.ffmpegPath, buildPreviewArgs({
            inputPath,
            timestampSeconds: normalized.timestampSeconds,
            width: targetWidth,
            height: targetHeight,
            outputPath: processedPath,
          }), { signal }, '缩放预览生成失败。')
        }
        previewLifecycle.retain(() => fsp.rm(directory, { recursive: true, force: true }))
        return { sourcePath, processedPath, width: targetWidth, height: targetHeight }
      } catch (error) {
        if (directory) await fsp.rm(directory, { recursive: true, force: true })
        throw error
      }
    })
  })

  ipcMain.handle('video-processing:start', async (_event, options = {}) => {
    if (previewLifecycle.isRunning() || jobStarting || manager.isRunning()) {
      throw new Error('已有视频预览或处理任务正在运行。')
    }
    jobStarting = true
    try {
      await outputDirectorySession.restore()
      const inputPath = assertVideoInputPath(options.inputPath)
      const nativeProbe = await probeVideoPath(app, runCommandOutput, inputPath)
      return await manager.start(normalizeVideoStartOptions(
        options,
        nativeProbe,
        outputDirectorySession.selectedOutputDirectories,
      ))
    } finally {
      jobStarting = false
    }
  })
  ipcMain.handle('video-processing:cancel', async (_event, jobId) => (
    String(jobId) === '__preview__' ? previewLifecycle.cancel() : manager.cancel(jobId)
  ))

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

  async function shutdown() {
    await Promise.all([previewLifecycle.shutdown(), manager.shutdown()])
  }

  return { cleanupAbandonedTempDirs, shutdown }
}

module.exports = {
  assertVideoInputPath,
  createVideoPreviewLifecycle,
  normalizeVideoPreviewOptions,
  normalizeVideoStartOptions,
  parseJsonOutput,
  probeVideoPath,
  registerVideoProcessingIpcHandlers,
}
