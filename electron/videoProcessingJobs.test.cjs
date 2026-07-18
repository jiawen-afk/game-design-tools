const test = require('node:test')
const assert = require('node:assert/strict')
const fsp = require('node:fs/promises')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const {
  createVideoProcessingJobManager,
  estimateAiTemporaryBytes,
  resolveVideoProcessingTempRoot,
} = require('./videoProcessingJobs.cjs')

function fakeApp(root) {
  return { getPath: () => root }
}

function sourceProbe(overrides = {}) {
  return {
    path: 'D:\\media\\intro.mp4',
    name: 'intro.mp4',
    size: 10_000_000,
    durationSeconds: 2,
    width: 640,
    height: 360,
    averageFps: 2,
    videoCodec: 'h264',
    pixelFormat: 'yuv420p',
    hasAudio: true,
    audioCodec: 'aac',
    audioChannels: 2,
    audioSampleRate: 48000,
    ...overrides,
  }
}

function settings(overrides = {}) {
  return {
    percent: 50,
    width: 320,
    height: 180,
    qualityMode: 'quality',
    qualityPreset: 'balanced',
    targetMb: null,
    targetFps: 2,
    audioMode: 'vorbis',
    audioKbps: 96,
    upscaylModel: 'upscayl-standard-4x',
    gpuId: 'auto',
    tileSize: 128,
    ttaMode: false,
    threadProfile: 'balanced',
    ...overrides,
  }
}

function rawOutputProbe(width = 320, height = 180, fps = '2/1', muted = false) {
  return {
    format: { format_name: 'ogg', duration: '2', size: '6' },
    streams: [
      { codec_type: 'video', codec_name: 'theora', pix_fmt: 'yuv420p', width, height, avg_frame_rate: fps },
      ...(muted ? [] : [{ codec_type: 'audio', codec_name: 'vorbis', channels: 2, sample_rate: '48000' }]),
    ],
  }
}

async function withTempManager(run) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'gdt-video-jobs-'))
  const previousLocalAppData = process.env.LOCALAPPDATA
  process.env.LOCALAPPDATA = root
  try {
    await run(root)
  } finally {
    if (previousLocalAppData === undefined) delete process.env.LOCALAPPDATA
    else process.env.LOCALAPPDATA = previousLocalAppData
    await fsp.rm(root, { recursive: true, force: true })
  }
}

function managerDependencies(root, overrides = {}) {
  return {
    app: fakeApp(root),
    getVideoRuntimeStatus: async () => ({
      installed: true,
      ffmpegPath: 'D:\\runtime\\ffmpeg.exe',
      ffprobePath: 'D:\\runtime\\ffprobe.exe',
    }),
    getUpscaylRuntimeStatus: async () => ({ installed: true, models: ['upscayl-standard-4x'] }),
    resolveUpscaylRuntimePaths: () => ({
      execPath: 'D:\\upscayl\\upscayl-bin.exe',
      modelsDir: 'D:\\upscayl\\models',
      binDir: 'D:\\upscayl\\bin',
    }),
    getFreeDiskBytes: async () => Number.MAX_SAFE_INTEGER,
    probeFile: async () => rawOutputProbe(),
    emitProgress: () => {},
    ...overrides,
  }
}

function job(root, overrides = {}) {
  return {
    jobId: 'job-1',
    inputPath: 'D:\\media\\intro.mp4',
    outputDirectory: path.join(root, 'output'),
    outputName: 'intro_50pct_balanced.ogv',
    probe: sourceProbe(),
    settings: settings(),
    ...overrides,
  }
}

test('estimates AI temporary storage conservatively', () => {
  assert.equal(estimateAiTemporaryBytes({
    frameCount: 10,
    sourceWidth: 100,
    sourceHeight: 50,
    upscaleWidth: 200,
    upscaleHeight: 100,
    sourceSize: 1_000_000,
    targetMb: null,
  }), 1_343_277_280)
})

test('conventional job encodes, verifies, moves output, and cleans temp files', () => withTempManager(async (root) => {
  const phases = []
  const calls = []
  const dependencies = managerDependencies(root, {
    emitProgress: (progress) => phases.push(progress.phase),
    runProcess: async ({ command, args, onOutput }) => {
      calls.push({ command, args })
      onOutput?.('out_time_us=2000000\nprogress=end\n')
      const outputPath = args.at(-1)
      if (outputPath.endsWith('.ogv')) {
        await fsp.mkdir(path.dirname(outputPath), { recursive: true })
        await fsp.writeFile(outputPath, 'output')
      }
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  const result = await manager.start(job(root))

  assert.equal(fs.existsSync(result.outputPath), true)
  assert.equal(path.basename(result.outputPath), 'intro_50pct_balanced.ogv')
  assert.equal(calls[0].command, 'D:\\runtime\\ffmpeg.exe')
  assert.equal(phases.includes('encoding'), true)
  assert.deepEqual(phases.slice(-2), ['verifying', 'completed'])
  assert.equal(fs.existsSync(resolveVideoProcessingTempRoot(fakeApp(root))), false)
}))

test('conventional job preflights temporary and destination disk space', () => withTempManager(async (root) => {
  let processCalls = 0
  const dependencies = managerDependencies(root, {
    getFreeDiskBytes: async (targetPath) => targetPath.endsWith('output') ? Number.MAX_SAFE_INTEGER : 0,
    runProcess: async () => {
      processCalls += 1
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  await assert.rejects(() => manager.start(job(root)), /临时磁盘空间不足/)
  assert.equal(processCalls, 0)
}))

test('job rejects an output volume without enough free space', () => withTempManager(async (root) => {
  const outputDirectory = path.join(root, 'output')
  const dependencies = managerDependencies(root, {
    getFreeDiskBytes: async (targetPath) => targetPath === outputDirectory ? 0 : Number.MAX_SAFE_INTEGER,
  })
  const manager = createVideoProcessingJobManager(dependencies)

  await assert.rejects(() => manager.start(job(root)), /输出磁盘空间不足/)
}))

test('cancel aborts the active task and removes its temporary directory', () => withTempManager(async (root) => {
  let observedSignal = null
  const dependencies = managerDependencies(root, {
    runProcess: ({ signal }) => new Promise((_resolve, reject) => {
      observedSignal = signal
      signal.addEventListener('abort', () => reject(new Error('native process aborted')), { once: true })
    }),
  })
  const manager = createVideoProcessingJobManager(dependencies)
  const pending = manager.start(job(root))
  while (!observedSignal) await new Promise((resolve) => setImmediate(resolve))

  assert.equal(await manager.cancel('job-1'), true)
  await assert.rejects(pending, /任务已取消/)
  assert.equal(observedSignal.aborted, true)
  assert.equal(fs.existsSync(resolveVideoProcessingTempRoot(fakeApp(root))), false)
}))

test('job manager reports whether a native job is active', () => withTempManager(async (root) => {
  let observedSignal = null
  const dependencies = managerDependencies(root, {
    runProcess: ({ signal }) => new Promise((_resolve, reject) => {
      observedSignal = signal
      signal.addEventListener('abort', () => reject(new Error('native process aborted')), { once: true })
    }),
  })
  const manager = createVideoProcessingJobManager(dependencies)
  assert.equal(manager.isRunning(), false)
  const pending = manager.start(job(root))
  while (!observedSignal) await new Promise((resolve) => setImmediate(resolve))
  assert.equal(manager.isRunning(), true)
  await manager.cancel('job-1')
  await assert.rejects(pending, /任务已取消/)
  assert.equal(manager.isRunning(), false)
}))

test('AI job decodes and upscales frames serially before encoding', () => withTempManager(async (root) => {
  const calls = []
  const dependencies = managerDependencies(root, {
    probeFile: async () => rawOutputProbe(960, 540),
    runProcess: async ({ command, args }) => {
      calls.push({ command, args })
      const outputPath = args.at(-1)
      if (outputPath.includes('source-%08d.png')) {
        const directory = path.dirname(outputPath)
        await fsp.mkdir(directory, { recursive: true })
        await fsp.writeFile(path.join(directory, 'source-00000001.png'), 'one')
        await fsp.writeFile(path.join(directory, 'source-00000002.png'), 'two')
      } else if (command.endsWith('upscayl-bin.exe')) {
        const target = args[args.indexOf('-o') + 1]
        await fsp.writeFile(target, 'upscaled')
      } else if (outputPath.endsWith('.ogv')) {
        await fsp.writeFile(outputPath, 'output')
      }
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  await manager.start(job(root, {
    outputName: 'intro_150pct_balanced.ogv',
    settings: settings({ percent: 150, width: 960, height: 540 }),
  }))

  assert.equal(calls.filter((call) => call.command.endsWith('upscayl-bin.exe')).length, 2)
  assert.equal(calls.at(-1).args.includes('D:\\media\\intro.mp4'), true)
}))

test('target-size job retries once when the first output exceeds the size ceiling', () => withTempManager(async (root) => {
  let passTwoCount = 0
  const dependencies = managerDependencies(root, {
    runProcess: async ({ args }) => {
      const outputPath = args.at(-1)
      if (args.includes('-pass') && args[args.indexOf('-pass') + 1] === '2') {
        passTwoCount += 1
        await fsp.mkdir(path.dirname(outputPath), { recursive: true })
        await fsp.writeFile(outputPath, Buffer.alloc(passTwoCount === 1 ? 1_100_000 : 900_000))
      }
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  const result = await manager.start(job(root, {
    outputName: 'intro_50pct_target-1mb.ogv',
    settings: settings({ qualityMode: 'target-size', targetMb: 1 }),
  }))

  assert.equal(passTwoCount, 2)
  assert.equal(result.outputSize, 900_000)
}))

test('target-size job rejects a retry that still exceeds the size ceiling', () => withTempManager(async (root) => {
  const dependencies = managerDependencies(root, {
    runProcess: async ({ args }) => {
      const outputPath = args.at(-1)
      if (args.includes('-pass') && args[args.indexOf('-pass') + 1] === '2') {
        await fsp.mkdir(path.dirname(outputPath), { recursive: true })
        await fsp.writeFile(outputPath, Buffer.alloc(1_100_000))
      }
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  await assert.rejects(() => manager.start(job(root, {
    outputName: 'intro_50pct_target-1mb.ogv',
    settings: settings({ qualityMode: 'target-size', targetMb: 1 }),
  })), /重试后仍超过目标大小/)
  assert.equal(fs.existsSync(path.join(root, 'output', 'intro_50pct_target-1mb.ogv')), false)
}))

test('quality presets map to the approved Theora q:v values', () => withTempManager(async (root) => {
  const observedQuality = new Map()
  const dependencies = managerDependencies(root, {
    runProcess: async ({ args }) => {
      const outputPath = args.at(-1)
      if (outputPath.endsWith('.ogv')) {
        const qualityIndex = args.indexOf('-q:v')
        observedQuality.set(path.basename(outputPath), Number(args[qualityIndex + 1]))
        await fsp.mkdir(path.dirname(outputPath), { recursive: true })
        await fsp.writeFile(outputPath, 'output')
      }
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  for (const [preset, expected] of [['high', 8], ['balanced', 6], ['extreme', 4]]) {
    await manager.start(job(root, {
      jobId: `quality-${preset}`,
      outputName: `intro_${preset}.ogv`,
      settings: settings({ qualityPreset: preset }),
    }))
    assert.equal([...observedQuality.values()].at(-1), expected)
  }
}))

test('no-audio source is muted and reduced FPS reaches the encoder', () => withTempManager(async (root) => {
  let encodeArgs = null
  const dependencies = managerDependencies(root, {
    probeFile: async () => rawOutputProbe(320, 180, '12/1', true),
    runProcess: async ({ args }) => {
      const outputPath = args.at(-1)
      if (outputPath.endsWith('.ogv')) {
        encodeArgs = args
        await fsp.mkdir(path.dirname(outputPath), { recursive: true })
        await fsp.writeFile(outputPath, 'output')
      }
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  await manager.start(job(root, {
    jobId: 'muted-reduced-fps',
    outputName: 'intro_12fps_muted.ogv',
    probe: sourceProbe({ averageFps: 30, hasAudio: false, audioCodec: '', audioChannels: 0, audioSampleRate: 0 }),
    settings: settings({ targetFps: 12, audioMode: 'vorbis' }),
  }))

  assert.ok(encodeArgs.includes('-an'))
  assert.ok(encodeArgs.includes('scale=320:180:flags=lanczos,fps=12'))
  assert.equal(encodeArgs.includes('libvorbis'), false)
}))

test('verification failure does not publish an invalid output', () => withTempManager(async (root) => {
  const dependencies = managerDependencies(root, {
    probeFile: async () => ({
      format: { format_name: 'ogg' },
      streams: [{ codec_type: 'video', codec_name: 'vp9', pix_fmt: 'yuv420p', width: 320, height: 180, avg_frame_rate: '2/1' }],
    }),
    runProcess: async ({ args }) => {
      const outputPath = args.at(-1)
      if (outputPath.endsWith('.ogv')) {
        await fsp.mkdir(path.dirname(outputPath), { recursive: true })
        await fsp.writeFile(outputPath, 'invalid')
      }
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  await assert.rejects(() => manager.start(job(root)), /Theora/)
  assert.equal(fs.existsSync(path.join(root, 'output', 'intro_50pct_balanced.ogv')), false)
}))
