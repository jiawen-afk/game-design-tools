const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { spawn } = require('node:child_process')

const {
  buildDecodeFramesArgs,
  buildProbeArgs,
  buildVideoEncodeArgs,
  getVideoOutputProfile,
  mapProbeResult,
  parseFfmpegProgress,
  verifyVideoOutputProbe,
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

function validateVideoJobId(value) {
  const id = String(value || '').trim()
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw new Error('视频任务 jobId 无效。')
  return id
}

function validateMatchingFrameNames(sourceFrames, outputFrames) {
  const sourceNames = sourceFrames.map((filePath) => path.basename(filePath)).sort()
  const outputNames = outputFrames.map((filePath) => path.basename(filePath)).sort()
  const matches = sourceNames.length === outputNames.length
    && sourceNames.every((name, index) => name === outputNames[index])
  if (!matches) {
    throw new Error(`Upscayl 批量输出帧不匹配：输入 ${sourceNames.length} 帧，输出 ${outputNames.length} 帧。`)
  }
}

function createUpscaylSuccessCounter(onCompleted) {
  const marker = 'Upscayled Successfully!'
  let carry = ''
  let completed = 0
  return (text) => {
    let buffer = carry + String(text || '')
    let markerIndex = buffer.indexOf(marker)
    while (markerIndex >= 0) {
      completed += 1
      onCompleted(completed)
      buffer = buffer.slice(markerIndex + marker.length)
      markerIndex = buffer.indexOf(marker)
    }
    carry = buffer.slice(-(marker.length - 1))
  }
}

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

function estimateOutputBytes(options) {
  const targetBytes = Number(options?.settings?.targetMb) > 0
    ? Number(options.settings.targetMb) * 1024 * 1024
    : 0
  return Math.ceil(Math.max(
    MIN_OUTPUT_ALLOWANCE,
    targetBytes * 1.05,
    Math.max(0, Number(options?.probe?.size || 0)) * 0.1,
  ))
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

function sanitizeOutputName(value, outputFormat) {
  const profile = getVideoOutputProfile(outputFormat)
  const fallbackName = `video.${profile.extension}`
  const baseName = path.basename(String(value || fallbackName))
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/[. ]+$/g, '')
  const withoutExtension = path.basename(baseName || fallbackName, path.extname(baseName || fallbackName))
  return `${withoutExtension || 'video'}.${profile.extension}`
}

async function resolveCollisionFreeOutputPath(outputDirectory, outputName, outputFormat) {
  const profile = getVideoOutputProfile(outputFormat)
  const safeName = sanitizeOutputName(outputName, outputFormat)
  const initial = path.join(outputDirectory, safeName)
  if (!fs.existsSync(initial)) return initial
  const extension = `.${profile.extension}`
  const base = path.basename(safeName, extension)
  for (let suffix = 2; suffix < Number.MAX_SAFE_INTEGER; suffix += 1) {
    const candidate = path.join(outputDirectory, `${base}-${suffix}${extension}`)
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

function runNativeProcess({ command, args, cwd, signal, onOutput, maxOutputChars }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      detached: process.platform !== 'win32',
    })
    let output = ''
    const outputLimit = Number.isFinite(Number(maxOutputChars))
      ? Math.max(0, Math.round(Number(maxOutputChars)))
      : Number.POSITIVE_INFINITY
    let settled = false
    const collect = (chunk) => {
      const text = chunk.toString('utf8')
      output += text
      if (output.length > outputLimit) output = output.slice(-outputLimit)
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
      maxOutputChars: options.maxOutputChars,
      onOutput: (text) => {
        if (typeof options.onOutput === 'function') {
          options.onOutput(text)
          return
        }
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
    const profile = getVideoOutputProfile(encodeOptions.outputFormat)
    const args = buildVideoEncodeArgs(encodeOptions)
    await executeProcess(job, runtime.ffmpegPath, args, {
      phase,
      durationSeconds: job.options.probe.durationSeconds,
      message: phase === 'encoding-pass-1'
        ? `正在执行 ${profile.videoLabel} 第一遍编码。`
        : phase === 'encoding-pass-2'
          ? `正在执行 ${profile.videoLabel} 第二遍编码。`
          : `正在编码 ${profile.containerLabel}。`,
      failureMessage: `${profile.containerLabel} 编码失败。`,
    })
  }

  async function encodeOutput(job, runtime, videoInput, temporaryOutputPath, requestedBitrateKbps = null) {
    const { options } = job
    const muted = options.settings.audioMode === 'mute' || !options.probe.hasAudio
    const common = {
      ...videoInput,
      outputFormat: options.settings.outputFormat,
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
        qualityPreset: options.settings.qualityPreset,
      }, 'encoding')
      return null
    }

    const audioKbps = muted ? 0 : options.settings.audioKbps
    const videoBitrateKbps = requestedBitrateKbps || calculateTargetVideoBitrateKbps(
      options.settings.targetMb,
      options.probe.durationSeconds,
      audioKbps,
    )
    const profile = getVideoOutputProfile(options.settings.outputFormat)
    if (!profile.supportsTwoPass) {
      await encodeOnce(job, runtime, {
        ...common,
        videoBitrateKbps,
      }, 'encoding')
      return videoBitrateKbps
    }
    const passlogPath = path.join(job.tempDir, `${options.settings.outputFormat}-pass`)
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
    const videoInput = {
      inputPath: job.options.inputPath,
      outputDurationSeconds: job.options.probe.videoDurationSeconds || job.options.probe.durationSeconds,
    }
    return {
      bitrateKbps: await encodeOutput(job, runtime, videoInput, temporaryOutputPath),
      videoInput,
    }
  }

  async function collectSourceFrames(sourceDir) {
    const entries = await fsp.readdir(sourceDir)
    return entries
      .filter((entry) => /^source-\d{8}\.png$/i.test(entry))
      .sort()
      .map((entry) => path.join(sourceDir, entry))
  }

  function resolveAiFramePaths(tempDir) {
    const sourceDir = path.join(tempDir, 'source-frames')
    const upscaledDir = path.join(tempDir, 'upscaled-frames')
    return {
      sourceDir,
      sourcePattern: path.join(sourceDir, 'source-%08d.png'),
      upscaledDir,
      upscaledPattern: path.join(upscaledDir, 'source-%08d.png'),
    }
  }

  async function runAiPipeline(job, runtime, temporaryOutputPath) {
    const { options } = job
    const upscaleStatus = await dependencies.getUpscaylRuntimeStatus(dependencies.app)
    if (!upscaleStatus?.installed) throw new Error('超过 100% 的任务必须安装 Upscayl GPU 运行包。')
    const upscalePaths = dependencies.resolveUpscaylRuntimePaths(dependencies.app)
    const scale = getUpscaleScale(options.settings.percent)
    const framePaths = resolveAiFramePaths(job.tempDir)
    await fsp.mkdir(framePaths.sourceDir, { recursive: true })
    await fsp.mkdir(framePaths.upscaledDir, { recursive: true })
    emit(job.id, 'decoding', 0, '正在提取视频帧。')
    await executeProcess(job, runtime.ffmpegPath, buildDecodeFramesArgs({
      inputPath: options.inputPath,
      outputPattern: framePaths.sourcePattern,
      fps: options.settings.targetFps,
    }), {
      phase: 'decoding',
      durationSeconds: options.probe.durationSeconds,
      message: '正在提取视频帧。',
      failureMessage: '视频帧提取失败。',
    })
    const sourceFrames = await collectSourceFrames(framePaths.sourceDir)
    if (sourceFrames.length === 0) throw new Error('视频帧提取完成，但没有生成可处理帧。')

    emit(job.id, 'upscaling', 0, `正在批量 GPU 超分：0/${sourceFrames.length}`, 0, sourceFrames.length)
    const args = buildUpscaylArgs({
      inputPath: framePaths.sourceDir,
      outputPath: framePaths.upscaledDir,
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
    let completedFrames = 0
    const consumeUpscaylOutput = createUpscaylSuccessCounter((count) => {
      const nextCompleted = Math.min(sourceFrames.length, count)
      if (nextCompleted <= completedFrames) return
      completedFrames = nextCompleted
      emit(
        job.id,
        'upscaling',
        completedFrames / sourceFrames.length * 100,
        `正在批量 GPU 超分：${completedFrames}/${sourceFrames.length}`,
        completedFrames,
        sourceFrames.length,
      )
    })
    await executeProcess(job, upscalePaths.execPath, args, {
      cwd: upscalePaths.binDir,
      phase: 'upscaling',
      message: '正在批量 GPU 超分。',
      failureMessage: 'Upscayl 批量 GPU 超分失败。',
      maxOutputChars: 65_536,
      onOutput: consumeUpscaylOutput,
    })
    const upscaledFrames = await collectSourceFrames(framePaths.upscaledDir)
    validateMatchingFrameNames(sourceFrames, upscaledFrames)
    if (completedFrames < sourceFrames.length) {
      emit(job.id, 'upscaling', 100, `已完成批量 GPU 超分：${sourceFrames.length}/${sourceFrames.length}`, sourceFrames.length, sourceFrames.length)
    }

    const videoInput = {
      framePattern: framePaths.upscaledPattern,
      audioInputPath: options.inputPath,
      outputDurationSeconds: sourceFrames.length / options.settings.targetFps,
    }
    return {
      bitrateKbps: await encodeOutput(job, runtime, videoInput, temporaryOutputPath),
      videoInput,
    }
  }

  async function retryTargetSizeIfNeeded(job, runtime, videoInput, temporaryOutputPath, bitrateKbps) {
    if (!bitrateKbps) return
    const targetBytes = job.options.settings.targetMb * 1024 * 1024
    const actualBytes = (await fsp.stat(temporaryOutputPath)).size
    if (actualBytes <= targetBytes * 1.02) return
    const adjustedBitrate = Math.max(128, Math.floor(bitrateKbps * targetBytes / actualBytes * 0.98))
    await fsp.rm(temporaryOutputPath, { force: true })
    await encodeOutput(job, runtime, videoInput, temporaryOutputPath, adjustedBitrate)
    const retryBytes = (await fsp.stat(temporaryOutputPath)).size
    if (retryBytes > targetBytes * 1.02) {
      throw new Error('目标大小编码重试后仍超过目标大小 2%，未发布输出。')
    }
  }

  async function preflightStorage(job, scale) {
    const { options } = job
    const outputBytes = estimateOutputBytes(options)
    const temporaryBytes = scale
      ? estimateAiTemporaryBytes({
          frameCount: Math.ceil(options.probe.durationSeconds * options.settings.targetFps),
          sourceWidth: options.probe.width,
          sourceHeight: options.probe.height,
          upscaleWidth: options.probe.width * scale,
          upscaleHeight: options.probe.height * scale,
          sourceSize: options.probe.size,
          targetMb: options.settings.targetMb,
        })
      : outputBytes
    const temporaryFreeBytes = await dependencies.getFreeDiskBytes(job.tempDir)
    if (temporaryFreeBytes < temporaryBytes) {
      throw new Error(`临时磁盘空间不足，需要约 ${Math.ceil(temporaryBytes / ONE_GIB)} GB。`)
    }
    const outputFreeBytes = await dependencies.getFreeDiskBytes(options.outputDirectory)
    if (outputFreeBytes < outputBytes) {
      throw new Error(`输出磁盘空间不足，需要至少 ${Math.ceil(outputBytes / 1024 / 1024)} MB。`)
    }
    const writeProbePath = path.join(options.outputDirectory, `.gdt-video-write-${job.internalId}.tmp`)
    try {
      await fsp.writeFile(writeProbePath, '')
    } catch (error) {
      throw new Error(`输出目录不可写：${error.message}`)
    } finally {
      await fsp.rm(writeProbePath, { force: true })
    }
  }

  async function start(options) {
    if (runningJobId) throw new Error(`已有视频任务正在运行：${runningJobId}`)
    const id = validateVideoJobId(options?.jobId)
    const internalId = randomUUID()
    const tempRoot = resolveVideoProcessingTempRoot(dependencies.app)
    const tempDir = path.join(tempRoot, internalId)
    const controller = new AbortController()
    const job = { id, internalId, options, tempDir, controller }
    runningJobId = id
    activeJobs.set(id, job)
    const startedAt = Date.now()

    try {
      emit(id, 'checking', 0, '正在检查运行环境。')
      const runtime = await dependencies.getVideoRuntimeStatus(dependencies.app)
      if (!runtime?.installed) throw new Error('请先安装视频处理运行包。')
      const outputProfile = getVideoOutputProfile(options.settings.outputFormat)
      await fsp.mkdir(tempDir, { recursive: true })
      await fsp.mkdir(options.outputDirectory, { recursive: true })
      const temporaryOutputPath = path.join(tempDir, `output.${outputProfile.extension}`)
      const scale = getUpscaleScale(options.settings.percent)
      await preflightStorage(job, scale)
      const pipelineResult = scale
        ? await runAiPipeline(job, runtime, temporaryOutputPath)
        : await runConventionalPipeline(job, runtime, temporaryOutputPath)
      if (!fs.existsSync(temporaryOutputPath)) {
        throw new Error(`视频编码完成，但没有生成 ${outputProfile.containerLabel} 输出。`)
      }

      if (options.settings.qualityMode === 'target-size') {
        await retryTargetSizeIfNeeded(
          job,
          runtime,
          pipelineResult.videoInput,
          temporaryOutputPath,
          pipelineResult.bitrateKbps,
        )
      }

      emit(id, 'verifying', 0, `正在验证 ${outputProfile.containerLabel} 输出。`)
      const rawProbe = await probeFile(runtime, temporaryOutputPath, controller.signal)
      verifyVideoOutputProbe(rawProbe, {
        outputFormat: options.settings.outputFormat,
        width: options.settings.width,
        height: options.settings.height,
        fps: options.settings.targetFps,
        muted: options.settings.audioMode === 'mute' || !options.probe.hasAudio,
      })
      const finalPath = await resolveCollisionFreeOutputPath(
        options.outputDirectory,
        options.outputName,
        options.settings.outputFormat,
      )
      await moveFileAtomically(temporaryOutputPath, finalPath, internalId)
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
      try {
        await fsp.rm(tempDir, { recursive: true, force: true })
        await removeEmptyDirectory(tempRoot)
      } finally {
        activeJobs.delete(id)
        if (runningJobId === id) runningJobId = null
      }
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
      while (activeJobs.has(job.id)) {
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

  return {
    cancel,
    cleanupAbandonedTempDirs,
    isRunning: () => Boolean(runningJobId),
    shutdown,
    start,
  }
}

module.exports = {
  createUpscaylSuccessCounter,
  createVideoProcessingJobManager,
  estimateAiTemporaryBytes,
  estimateOutputBytes,
  killProcessTree,
  resolveCollisionFreeOutputPath,
  resolveVideoProcessingTempRoot,
  runNativeProcess,
  validateMatchingFrameNames,
  validateVideoJobId,
}
