const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const { spawn } = require('node:child_process')

const {
  buildDecodeFramesArgs,
  buildProbeArgs,
  buildTheoraEncodeArgs,
  mapProbeResult,
  parseFfmpegProgress,
  verifyGodotOgvProbe,
} = require('./videoProcessingCommands.cjs')
const {
  getVideoRuntimeStatus,
} = require('./videoProcessingRuntime.cjs')
const {
  buildUpscaylArgs,
  getUpscaylRuntimeStatus,
  resolveUpscaylRuntimePaths,
} = require('./upscaylIpcHandlers.cjs')

const ONE_GIB = 1024 * 1024 * 1024
const MIN_OUTPUT_ALLOWANCE = 256 * 1024 * 1024
const THEORA_QUALITY = { high: 8, balanced: 6, extreme: 4 }

function resolveVideoProcessingTempRoot(app) {
  const localAppData = process.env.LOCALAPPDATA || app.getPath('temp')
  return path.join(localAppData, 'GameDesignTools', 'Temp', 'VideoProcessing')
}

function estimateAiTemporaryBytes(input) {
  const frameCount = Math.max(0, Number(input.frameCount || 0))
  const sourceBytes = Math.max(0, Number(input.sourceWidth || 0)) * Math.max(0, Number(input.sourceHeight || 0)) * 4
  const upscaleBytes = Math.max(0, Number(input.upscaleWidth || 0)) * Math.max(0, Number(input.upscaleHeight || 0)) * 4
  const framesBytes = Math.ceil(frameCount * (sourceBytes + upscaleBytes) * 1.1)
  const requestedBytes = Number(input.targetMb) > 0
    ? Number(input.targetMb) * 1024 * 1024
    : 0
  const outputAllowance = Math.max(
    MIN_OUTPUT_ALLOWANCE,
    requestedBytes,
    Math.max(0, Number(input.sourceSize || 0)) * 0.1,
  )
  return Math.ceil(framesBytes + outputAllowance + ONE_GIB)
}

function getUpscaleScale(percent) {
  const value = Number(percent)
  if (value <= 100) return null
  if (value <= 200) return 2
  if (value <= 300) return 3
  return 4
}

function calculateTargetVideoBitrateKbps(targetMb, durationSeconds, audioKbps) {
  const usableBits = Number(targetMb) * 1024 * 1024 * 8 * 0.96
  const videoKbps = Math.floor(usableBits / Number(durationSeconds) / 1000) - Number(audioKbps || 0)
  if (!Number.isFinite(videoKbps) || videoKbps < 128) {
    throw new Error('目标文件大小过小，视频码率将低于 128 kbps。')
  }
  return videoKbps
}

function sanitizeOutputName(value) {
  const baseName = path.basename(String(value || 'video.ogv'))
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/[. ]+$/g, '')
  const withoutExtension = path.basename(baseName || 'video', path.extname(baseName || 'video'))
  return `${withoutExtension || 'video'}.ogv`
}

async function resolveCollisionFreeOutputPath(outputDirectory, outputName) {
  const safeName = sanitizeOutputName(outputName)
  const initial = path.join(outputDirectory, safeName)
  if (!fs.existsSync(initial)) return initial
  const base = path.basename(safeName, '.ogv')
  for (let suffix = 2; suffix < Number.MAX_SAFE_INTEGER; suffix += 1) {
    const candidate = path.join(outputDirectory, `${base}-${suffix}.ogv`)
    if (!fs.existsSync(candidate)) return candidate
  }
  throw new Error('无法生成不重复的输出文件名。')
}

function killProcessTree(pid) {
  if (!pid) return Promise.resolve()
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      try { process.kill(-pid, 'SIGTERM') } catch {}
      resolve()
      return
    }
    const killer = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true })
    killer.on('error', () => resolve())
    killer.on('close', () => resolve())
  })
}

function runNativeProcess({ command, args, cwd, signal, onOutput }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      detached: process.platform !== 'win32',
    })
    let output = ''
    let settled = false
    const collect = (chunk) => {
      const text = chunk.toString('utf8')
      output += text
      onOutput?.(text)
    }
    child.stdout?.on('data', collect)
    child.stderr?.on('data', collect)
    const abort = () => { void killProcessTree(child.pid) }
    signal?.addEventListener('abort', abort, { once: true })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', abort)
      resolve({ ok: false, output: error.message })
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', abort)
      resolve({ ok: code === 0, output: output.trim() })
    })
    if (signal?.aborted) abort()
  })
}

async function defaultGetFreeDiskBytes(targetPath) {
  const stats = await fsp.statfs(targetPath)
  return Number(stats.bavail) * Number(stats.bsize)
}

async function moveFileAtomically(sourcePath, finalPath, jobId) {
  const partialPath = `${finalPath}.partial-${jobId}`
  await fsp.rm(partialPath, { force: true })
  try {
    await fsp.copyFile(sourcePath, partialPath, fs.constants.COPYFILE_EXCL)
    await fsp.rename(partialPath, finalPath)
  } finally {
    await fsp.rm(partialPath, { force: true })
  }
}

async function removeEmptyDirectory(directory) {
  try {
    const entries = await fsp.readdir(directory)
    if (entries.length === 0) await fsp.rmdir(directory)
  } catch {}
}

function createVideoProcessingJobManager(inputDependencies) {
  if (!inputDependencies?.app) throw new Error('视频任务管理器缺少 Electron app。')
  const dependencies = {
    getVideoRuntimeStatus,
    getUpscaylRuntimeStatus,
    resolveUpscaylRuntimePaths,
    getFreeDiskBytes: defaultGetFreeDiskBytes,
    runProcess: runNativeProcess,
    emitProgress: () => {},
    ...inputDependencies,
  }
  const activeJobs = new Map()
  let runningJobId = null

  function emit(jobId, phase, percent, message, completed = percent, total = 100) {
    dependencies.emitProgress({
      jobId,
      phase,
      completed,
      total,
      percent: Math.max(0, Math.min(100, Math.round(Number(percent) || 0))),
      message,
    })
  }

  async function executeProcess(job, command, args, options = {}) {
    let bufferedProgress = ''
    const result = await dependencies.runProcess({
      command,
      args,
      cwd: options.cwd,
      signal: job.controller.signal,
      onOutput: (text) => {
        bufferedProgress += text
        const progress = parseFfmpegProgress(bufferedProgress, options.durationSeconds || 0)
        if (progress.percent > 0 || progress.done) {
          emit(job.id, options.phase, progress.percent, options.message, progress.completedSeconds, options.durationSeconds || 0)
        }
      },
    })
    if (job.controller.signal.aborted) throw new Error('任务已取消。')
    if (!result?.ok) throw new Error(result?.output || options.failureMessage || '视频处理命令失败。')
    return result
  }

  async function probeFile(runtime, filePath, signal) {
    if (dependencies.probeFile) return dependencies.probeFile(filePath, signal)
    const result = await dependencies.runProcess({
      command: runtime.ffprobePath,
      args: buildProbeArgs(filePath),
      signal,
    })
    if (signal.aborted) throw new Error('任务已取消。')
    if (!result?.ok) throw new Error(result?.output || 'FFprobe 验证失败。')
    try {
      return JSON.parse(result.output)
    } catch (error) {
      throw new Error(`FFprobe 返回无效 JSON：${error.message}`)
    }
  }

  async function encodeOnce(job, runtime, encodeOptions, phase) {
    const args = buildTheoraEncodeArgs(encodeOptions)
    await executeProcess(job, runtime.ffmpegPath, args, {
      phase,
      durationSeconds: job.options.probe.durationSeconds,
      message: phase === 'encoding-pass-1' ? '正在执行第一遍编码。' : phase === 'encoding-pass-2' ? '正在执行第二遍编码。' : '正在编码 OGV。',
      failureMessage: 'OGV 编码失败。',
    })
  }

  async function encodeOutput(job, runtime, videoInput, temporaryOutputPath, requestedBitrateKbps = null) {
    const { options } = job
    const muted = options.settings.audioMode === 'mute' || !options.probe.hasAudio
    const common = {
      ...videoInput,
      outputPath: temporaryOutputPath,
      width: options.settings.width,
      height: options.settings.height,
      fps: options.settings.targetFps,
      muted,
      audioKbps: options.settings.audioKbps,
    }
    if (options.settings.qualityMode !== 'target-size') {
      await encodeOnce(job, runtime, {
        ...common,
        quality: THEORA_QUALITY[options.settings.qualityPreset] || THEORA_QUALITY.balanced,
      }, 'encoding')
      return null
    }

    const audioKbps = muted ? 0 : options.settings.audioKbps
    const videoBitrateKbps = requestedBitrateKbps || calculateTargetVideoBitrateKbps(
      options.settings.targetMb,
      options.probe.durationSeconds,
      audioKbps,
    )
    const passlogPath = path.join(job.tempDir, 'theora-pass')
    await encodeOnce(job, runtime, {
      ...common,
      outputPath: 'NUL',
      videoBitrateKbps,
      pass: 1,
      passlogPath,
    }, 'encoding-pass-1')
    await encodeOnce(job, runtime, {
      ...common,
      videoBitrateKbps,
      pass: 2,
      passlogPath,
    }, 'encoding-pass-2')
    return videoBitrateKbps
  }

  async function runConventionalPipeline(job, runtime, temporaryOutputPath) {
    return encodeOutput(job, runtime, { inputPath: job.options.inputPath }, temporaryOutputPath)
  }

  async function collectSourceFrames(sourceDir) {
    const entries = await fsp.readdir(sourceDir)
    return entries
      .filter((entry) => /^source-\d{8}\.png$/i.test(entry))
      .sort()
      .map((entry) => path.join(sourceDir, entry))
  }

  async function runAiPipeline(job, runtime, temporaryOutputPath) {
    const { options } = job
    const upscaleStatus = await dependencies.getUpscaylRuntimeStatus(dependencies.app)
    if (!upscaleStatus?.installed) throw new Error('超过 100% 的任务必须安装 Upscayl GPU 运行包。')
    const upscalePaths = dependencies.resolveUpscaylRuntimePaths(dependencies.app)
    const scale = getUpscaleScale(options.settings.percent)
    const frameCount = Math.ceil(options.probe.durationSeconds * options.settings.targetFps)
    const requiredBytes = estimateAiTemporaryBytes({
      frameCount,
      sourceWidth: options.probe.width,
      sourceHeight: options.probe.height,
      upscaleWidth: options.probe.width * scale,
      upscaleHeight: options.probe.height * scale,
      sourceSize: options.probe.size,
      targetMb: options.settings.targetMb,
    })
    const freeBytes = await dependencies.getFreeDiskBytes(path.dirname(job.tempDir))
    if (freeBytes < requiredBytes) {
      throw new Error(`临时磁盘空间不足，需要约 ${Math.ceil(requiredBytes / ONE_GIB)} GB。`)
    }

    const sourcePattern = path.join(job.tempDir, 'source-%08d.png')
    emit(job.id, 'decoding', 0, '正在提取视频帧。')
    await executeProcess(job, runtime.ffmpegPath, buildDecodeFramesArgs({
      inputPath: options.inputPath,
      outputPattern: sourcePattern,
      fps: options.settings.targetFps,
    }), {
      phase: 'decoding',
      durationSeconds: options.probe.durationSeconds,
      message: '正在提取视频帧。',
      failureMessage: '视频帧提取失败。',
    })
    const sourceFrames = await collectSourceFrames(job.tempDir)
    if (sourceFrames.length === 0) throw new Error('视频帧提取完成，但没有生成可处理帧。')

    for (let index = 0; index < sourceFrames.length; index += 1) {
      if (job.controller.signal.aborted) throw new Error('任务已取消。')
      const sourceFrame = sourceFrames[index]
      const number = path.basename(sourceFrame).match(/(\d{8})/)?.[1]
      const outputFrame = path.join(job.tempDir, `upscaled-${number}.png`)
      emit(job.id, 'upscaling', index / sourceFrames.length * 100, `正在 GPU 超分：${index + 1}/${sourceFrames.length}`, index, sourceFrames.length)
      const args = buildUpscaylArgs({
        inputPath: sourceFrame,
        outputPath: outputFrame,
        modelsPath: upscalePaths.modelsDir,
        format: 'png',
        options: {
          model: options.settings.upscaylModel,
          scale,
          tileSize: options.settings.tileSize,
          ttaMode: options.settings.ttaMode,
          gpuId: options.settings.gpuId,
          threadProfile: options.settings.threadProfile,
        },
      })
      await executeProcess(job, upscalePaths.execPath, args, {
        cwd: upscalePaths.binDir,
        phase: 'upscaling',
        message: `正在 GPU 超分：${index + 1}/${sourceFrames.length}`,
        failureMessage: `第 ${index + 1} 帧 Upscayl 处理失败。`,
      })
      if (!fs.existsSync(outputFrame)) throw new Error(`第 ${index + 1} 帧 Upscayl 未生成输出。`)
      emit(job.id, 'upscaling', (index + 1) / sourceFrames.length * 100, `已完成 GPU 超分：${index + 1}/${sourceFrames.length}`, index + 1, sourceFrames.length)
    }

    return encodeOutput(job, runtime, {
      framePattern: path.join(job.tempDir, 'upscaled-%08d.png'),
      audioInputPath: options.inputPath,
    }, temporaryOutputPath)
  }

  async function retryTargetSizeIfNeeded(job, runtime, videoInput, temporaryOutputPath, bitrateKbps) {
    if (!bitrateKbps) return
    const targetBytes = job.options.settings.targetMb * 1024 * 1024
    const actualBytes = (await fsp.stat(temporaryOutputPath)).size
    if (actualBytes <= targetBytes * 1.02) return
    const adjustedBitrate = Math.max(128, Math.floor(bitrateKbps * targetBytes / actualBytes * 0.98))
    await fsp.rm(temporaryOutputPath, { force: true })
    await encodeOutput(job, runtime, videoInput, temporaryOutputPath, adjustedBitrate)
  }

  async function start(options) {
    if (runningJobId) throw new Error(`已有视频任务正在运行：${runningJobId}`)
    const id = String(options?.jobId || '').trim()
    if (!id) throw new Error('视频任务缺少 jobId。')
    const tempRoot = resolveVideoProcessingTempRoot(dependencies.app)
    const tempDir = path.join(tempRoot, id.replace(/[^a-zA-Z0-9_-]/g, '_'))
    const controller = new AbortController()
    const job = { id, options, tempDir, controller }
    runningJobId = id
    activeJobs.set(id, job)
    const startedAt = Date.now()

    try {
      emit(id, 'checking', 0, '正在检查运行环境。')
      const runtime = await dependencies.getVideoRuntimeStatus(dependencies.app)
      if (!runtime?.installed) throw new Error('请先安装视频处理运行包。')
      await fsp.mkdir(tempDir, { recursive: true })
      await fsp.mkdir(options.outputDirectory, { recursive: true })
      const temporaryOutputPath = path.join(tempDir, 'output.ogv')
      const scale = getUpscaleScale(options.settings.percent)
      let initialBitrate = null
      if (scale) {
        initialBitrate = await runAiPipeline(job, runtime, temporaryOutputPath)
      } else {
        initialBitrate = await runConventionalPipeline(job, runtime, temporaryOutputPath)
      }
      if (!fs.existsSync(temporaryOutputPath)) throw new Error('视频编码完成，但没有生成 OGV 输出。')

      const videoInput = scale
        ? { framePattern: path.join(tempDir, 'upscaled-%08d.png'), audioInputPath: options.inputPath }
        : { inputPath: options.inputPath }
      if (options.settings.qualityMode === 'target-size') {
        await retryTargetSizeIfNeeded(job, runtime, videoInput, temporaryOutputPath, initialBitrate)
      }

      emit(id, 'verifying', 0, '正在验证 Godot OGV 输出。')
      const rawProbe = await probeFile(runtime, temporaryOutputPath, controller.signal)
      verifyGodotOgvProbe(rawProbe, {
        width: options.settings.width,
        height: options.settings.height,
        fps: options.settings.targetFps,
        muted: options.settings.audioMode === 'mute' || !options.probe.hasAudio,
      })
      const finalPath = await resolveCollisionFreeOutputPath(options.outputDirectory, options.outputName)
      await moveFileAtomically(temporaryOutputPath, finalPath, id)
      const outputStat = await fsp.stat(finalPath)
      emit(id, 'completed', 100, '处理完成。')
      return {
        jobId: id,
        outputPath: finalPath,
        outputSize: outputStat.size,
        durationMs: Date.now() - startedAt,
        probe: mapProbeResult(rawProbe, finalPath),
      }
    } catch (error) {
      if (controller.signal.aborted) {
        emit(id, 'canceled', 0, '任务已取消。')
        throw new Error('任务已取消。')
      }
      emit(id, 'failed', 0, error instanceof Error ? error.message : String(error))
      throw error
    } finally {
      activeJobs.delete(id)
      if (runningJobId === id) runningJobId = null
      await fsp.rm(tempDir, { recursive: true, force: true })
      await removeEmptyDirectory(tempRoot)
    }
  }

  async function cancel(jobId) {
    const job = activeJobs.get(String(jobId))
    if (!job) return false
    job.controller.abort()
    return true
  }

  async function shutdown() {
    for (const job of activeJobs.values()) job.controller.abort()
    await Promise.all([...activeJobs.values()].map(async (job) => {
      for (let attempt = 0; attempt < 100 && activeJobs.has(job.id); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    }))
  }

  async function cleanupAbandonedTempDirs(now = Date.now()) {
    const tempRoot = resolveVideoProcessingTempRoot(dependencies.app)
    let entries = []
    try {
      entries = await fsp.readdir(tempRoot, { withFileTypes: true })
    } catch {
      return
    }
    const cutoff = now - 24 * 60 * 60 * 1000
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const target = path.resolve(tempRoot, entry.name)
      const stats = await fsp.stat(target)
      if (stats.mtimeMs < cutoff) await fsp.rm(target, { recursive: true, force: true })
    }
    await removeEmptyDirectory(tempRoot)
  }

  return { cancel, cleanupAbandonedTempDirs, shutdown, start }
}

module.exports = {
  createVideoProcessingJobManager,
  estimateAiTemporaryBytes,
  killProcessTree,
  resolveCollisionFreeOutputPath,
  resolveVideoProcessingTempRoot,
  runNativeProcess,
}
