import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('desktop API exposes typed video processing operations', () => {
  const apiPath = 'src/desktopVideoProcessingApi.ts'
  assert.ok(existsSync(apiPath), `${apiPath} should exist`)
  const apiSource = readFileSync(apiPath, 'utf8')
  const desktopApiSource = readFileSync('src/desktopApi.ts', 'utf8')

  assert.match(apiSource, /export interface DesktopVideoProcessingApi/)
  assert.match(apiSource, /chooseVideoFiles\(\)/)
  assert.match(apiSource, /chooseVideoOutputDirectory\(\)/)
  assert.match(apiSource, /queryVideoRuntimeStatus\(\)/)
  assert.match(apiSource, /installVideoRuntime\(\)/)
  assert.match(apiSource, /probeVideoFile\(filePath: string\)/)
  assert.match(apiSource, /createVideoFramePreview/)
  assert.match(apiSource, /startVideoProcessingJob/)
  assert.match(apiSource, /cancelVideoProcessingJob\(jobId: string\)/)
  assert.match(apiSource, /onVideoRuntimeInstallProgress/)
  assert.match(apiSource, /onVideoProcessingProgress/)
  assert.match(desktopApiSource, /DesktopVideoProcessingApi/)
})

test('preload maps video operations to focused IPC channels', () => {
  const preloadSource = readFileSync('electron/preload.cjs', 'utf8')

  assert.match(preloadSource, /chooseVideoFiles: \(\) => invoke\('video-processing:choose-files'\)/)
  assert.match(preloadSource, /chooseVideoOutputDirectory: \(\) => invoke\('video-processing:choose-output-directory'\)/)
  assert.match(preloadSource, /queryVideoRuntimeStatus: \(\) => invoke\('video-processing:runtime-status'\)/)
  assert.match(preloadSource, /installVideoRuntime: \(\) => invoke\('video-processing:install-runtime'\)/)
  assert.match(preloadSource, /probeVideoFile: \(filePath\) => invoke\('video-processing:probe', filePath\)/)
  assert.match(preloadSource, /createVideoFramePreview: \(options\) => invoke\('video-processing:preview', options\)/)
  assert.match(preloadSource, /startVideoProcessingJob: \(options\) => invoke\('video-processing:start', options\)/)
  assert.match(preloadSource, /cancelVideoProcessingJob: \(jobId\) => invoke\('video-processing:cancel', jobId\)/)
  assert.match(preloadSource, /onVideoRuntimeInstallProgress: \(listener\) => on\('video-processing:runtime-progress', listener\)/)
  assert.match(preloadSource, /onVideoProcessingProgress: \(listener\) => on\('video-processing:progress', listener\)/)
})

test('electron main delegates video processing IPC to a focused module', () => {
  const handlerPath = 'electron/videoProcessingIpcHandlers.cjs'
  assert.ok(existsSync(handlerPath), `${handlerPath} should exist`)
  const handlerSource = readFileSync(handlerPath, 'utf8')
  const mainSource = readFileSync('electron/main.cjs', 'utf8')

  assert.match(mainSource, /registerVideoProcessingIpcHandlers/)
  assert.doesNotMatch(mainSource, /video-processing:choose-files/)
  assert.doesNotMatch(mainSource, /video-processing:start/)
  assert.doesNotMatch(mainSource, /buildTheoraEncodeArgs/)
  assert.match(handlerSource, /videoProcessingRuntime\.cjs/)
  assert.match(handlerSource, /videoProcessingCommands\.cjs/)
  assert.match(handlerSource, /videoProcessingJobs\.cjs/)
  assert.match(handlerSource, /video-processing:choose-files/)
  assert.match(handlerSource, /video-processing:choose-output-directory/)
  assert.match(handlerSource, /video-processing:runtime-status/)
  assert.match(handlerSource, /video-processing:install-runtime/)
  assert.match(handlerSource, /video-processing:probe/)
  assert.match(handlerSource, /video-processing:preview/)
  assert.match(handlerSource, /video-processing:start/)
  assert.match(handlerSource, /video-processing:cancel/)
  assert.match(handlerSource, /const previewLifecycle = createVideoPreviewLifecycle\(\)/)
  assert.match(handlerSource, /String\(jobId\) === '__preview__'/)
  assert.match(handlerSource, /manager\.isRunning\(\)/)
  assert.match(handlerSource, /await fsp\.rm\(directory, \{ recursive: true, force: true \}\)/)
  assert.doesNotMatch(handlerSource, /Buffer\.from\(options\.data/)
})

test('desktop shutdown waits for active video cleanup before quitting', async () => {
  const modulePath = 'electron/videoProcessingShutdown.cjs'
  assert.ok(existsSync(modulePath), `${modulePath} should exist`)
  const { registerAwaitedVideoProcessingShutdown } = require('../electron/videoProcessingShutdown.cjs')
  let beforeQuit: ((event: { preventDefault(): void }) => void) | null = null
  let quitCalls = 0
  let resolveShutdown!: () => void
  const shutdown = new Promise<void>((resolve) => { resolveShutdown = resolve })
  const app = {
    on(event: string, listener: (event: { preventDefault(): void }) => void) {
      if (event === 'before-quit') beforeQuit = listener
    },
    quit() { quitCalls += 1 },
  }
  registerAwaitedVideoProcessingShutdown(app, { shutdown: () => shutdown })
  let prevented = 0

  const triggerBeforeQuit = beforeQuit as unknown as (event: { preventDefault(): void }) => void
  assert.ok(triggerBeforeQuit)
  triggerBeforeQuit({ preventDefault: () => { prevented += 1 } })
  assert.equal(prevented, 1)
  assert.equal(quitCalls, 0)
  resolveShutdown()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(quitCalls, 1)

  triggerBeforeQuit({ preventDefault: () => { prevented += 1 } })
  assert.equal(prevented, 1)

  const jobsSource = readFileSync('electron/videoProcessingJobs.cjs', 'utf8')
  assert.match(jobsSource, /while \(activeJobs\.has\(job\.id\)\)/)
  assert.doesNotMatch(jobsSource, /attempt < 100/)
})

test('native start options use a fresh probe and reject unselected output paths', () => {
  const { normalizeVideoStartOptions } = require('../electron/videoProcessingIpcHandlers.cjs')
  const outputDirectory = 'D:\\output'
  const nativeProbe = {
    path: 'D:\\media\\intro.mp4', name: 'intro.mp4', size: 1000,
    durationSeconds: 10, width: 1920, height: 1080, averageFps: 30,
    videoCodec: 'h264', pixelFormat: 'yuv420p', hasAudio: true,
    audioCodec: 'aac', audioChannels: 2, audioSampleRate: 48000,
  }
  const options = {
    jobId: 'job-1', inputPath: nativeProbe.path, outputDirectory,
    outputName: 'intro.ogv', probe: { ...nativeProbe, width: 2, height: 2 },
    settings: {
      percent: 50, width: 960, height: 540, qualityMode: 'quality', qualityPreset: 'balanced',
      targetMb: null, targetFps: 24, audioMode: 'vorbis', audioKbps: 96,
      upscaylModel: 'upscayl-standard-4x', gpuId: 'auto', tileSize: 128,
      ttaMode: false, threadProfile: 'balanced',
    },
  }

  const normalized = normalizeVideoStartOptions(options, nativeProbe, new Set([outputDirectory]))
  assert.equal(normalized.probe, nativeProbe)
  assert.equal(normalized.settings.width, 960)
  assert.throws(
    () => normalizeVideoStartOptions({ ...options, outputDirectory: 'D:\\other' }, nativeProbe, new Set([outputDirectory])),
    /输出目录必须通过选择器确认/,
  )
  assert.throws(
    () => normalizeVideoStartOptions({ ...options, settings: { ...options.settings, targetFps: 60 } }, nativeProbe, new Set([outputDirectory])),
    /目标帧率不能高于源视频/,
  )
  assert.throws(
    () => normalizeVideoStartOptions({ ...options, jobId: 'x\\..\\..\\victim' }, nativeProbe, new Set([outputDirectory])),
    /jobId 无效/,
  )
})

test('native preview options enforce settings bounds and clamp timestamp', () => {
  const { normalizeVideoPreviewOptions } = require('../electron/videoProcessingIpcHandlers.cjs')
  const probe = {
    path: 'D:\\media\\intro.mp4', name: 'intro.mp4', size: 1000,
    durationSeconds: 10, width: 1920, height: 1080, averageFps: 30,
    videoCodec: 'h264', pixelFormat: 'yuv420p', hasAudio: true,
    audioCodec: 'aac', audioChannels: 2, audioSampleRate: 48000,
  }
  const settings = {
    percent: 200, width: 3840, height: 2160, qualityMode: 'quality', qualityPreset: 'balanced',
    targetMb: null, targetFps: 24, audioMode: 'vorbis', audioKbps: 96,
    upscaylModel: 'upscayl-standard-4x', gpuId: 'auto', tileSize: 128,
    ttaMode: false, threadProfile: 'balanced',
  }

  const normalized = normalizeVideoPreviewOptions({
    inputPath: probe.path,
    timestampSeconds: 999,
    settings,
  }, probe)
  assert.equal(normalized.timestampSeconds, 10)
  assert.equal(normalized.settings.width, 3840)
  assert.throws(
    () => normalizeVideoPreviewOptions({ inputPath: probe.path, timestampSeconds: 0, settings: { ...settings, percent: 500 } }, probe),
    /25% 到 400%/,
  )
  assert.throws(
    () => normalizeVideoPreviewOptions({ inputPath: probe.path, timestampSeconds: 0, settings: { ...settings, gpuId: '-1' } }, probe),
    /Upscayl GPU 高级设置无效/,
  )
  assert.throws(
    () => normalizeVideoPreviewOptions({ inputPath: probe.path, timestampSeconds: 0, settings: { ...settings, upscaylModel: '..\\fake' } }, probe),
    /Upscayl GPU 高级设置无效/,
  )
})

test('preview lifecycle aborts cancellation and shutdown waits for cleanup', async () => {
  const { createVideoPreviewLifecycle } = require('../electron/videoProcessingIpcHandlers.cjs')
  const lifecycle = createVideoPreviewLifecycle()
  let activeSignal: AbortSignal | null = null
  let releasePreview!: () => void
  let markStarted!: () => void
  const started = new Promise<void>((resolve) => { markStarted = resolve })
  const preview = lifecycle.run(async (signal: AbortSignal) => {
    activeSignal = signal
    markStarted()
    await new Promise<void>((resolve) => { releasePreview = resolve })
    return 'finished'
  })
  await started

  assert.equal(lifecycle.isRunning(), true)
  assert.equal(lifecycle.cancel(), true)
  assert.equal((activeSignal as unknown as AbortSignal).aborted, true)
  let shutdownFinished = false
  const shutdown = lifecycle.shutdown().then(() => { shutdownFinished = true })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(shutdownFinished, false)

  releasePreview()
  assert.equal(await preview, 'finished')
  await shutdown
  assert.equal(lifecycle.isRunning(), false)
  assert.equal(lifecycle.cancel(), false)
})
