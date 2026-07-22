const test = require('node:test')
const assert = require('node:assert/strict')
const fsp = require('node:fs/promises')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const {
  createUpscaylSuccessCounter,
  createVideoProcessingJobManager,
  estimateAiTemporaryBytes,
  resolveVideoProcessingTempRoot,
  validateMatchingFrameNames,
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
    videoDurationSeconds: 2,
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
    outputFormat: 'ogv',
    percent: 50,
    width: 320,
    height: 180,
    qualityMode: 'quality',
    qualityPreset: 'balanced',
    targetMb: null,
    targetFps: 2,
    audioMode: 'keep',
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

function rawOutputProbeFor(format, width = 320, height = 180, fps = '2/1', muted = false) {
  const profiles = {
    ogv: { formatName: 'ogg', videoCodec: 'theora', audioCodec: 'vorbis' },
    webm: { formatName: 'matroska,webm', videoCodec: 'vp9', audioCodec: 'opus' },
    mp4: { formatName: 'mov,mp4,m4a,3gp,3g2,mj2', videoCodec: 'h264', audioCodec: 'aac' },
  }
  const profile = profiles[format]
  return {
    format: { format_name: profile.formatName, duration: '2', size: '6' },
    streams: [
      { codec_type: 'video', codec_name: profile.videoCodec, pix_fmt: 'yuv420p', width, height, r_frame_rate: fps, duration: '2' },
      ...(muted ? [] : [{ codec_type: 'audio', codec_name: profile.audioCodec, duration: '2' }]),
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

test('batch upscale requires the exact same numbered frame names', () => {
  assert.doesNotThrow(() => validateMatchingFrameNames(
    ['D:\\source\\source-00000001.png', 'D:\\source\\source-00000002.png'],
    ['D:\\output\\source-00000001.png', 'D:\\output\\source-00000002.png'],
  ))
  assert.throws(() => validateMatchingFrameNames(
    ['D:\\source\\source-00000001.png', 'D:\\source\\source-00000002.png'],
    ['D:\\output\\source-00000001.png', 'D:\\output\\source-00000003.png'],
  ), /批量输出帧不匹配/)
})

test('batch upscale progress counts split success markers incrementally', () => {
  const completed = []
  const consume = createUpscaylSuccessCounter((count) => completed.push(count))
  consume(`${'diagnostic '.repeat(20_000)}Upscayled Succ`)
  consume('essfully!\nUpscayled Successfully!\n')
  assert.deepEqual(completed, [1, 2])
})

test('conventional job encodes, verifies, moves output, and cleans temp files', () => withTempManager(async (root) => {
  const phases = []
  const calls = []
  const dependencies = managerDependencies(root, {
    emitProgress: (progress) => phases.push(progress.phase),
    runProcess: async (request) => {
      const { command, args, onOutput } = request
      calls.push(request)
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
  const conventionalEncode = calls.find((call) => call.args.at(-1).endsWith('.ogv'))
  assert.deepEqual(
    conventionalEncode.args.slice(conventionalEncode.args.indexOf('-t'), conventionalEncode.args.indexOf('-t') + 2),
    ['-t', '2'],
  )
  assert.equal(phases.includes('encoding'), true)
  assert.deepEqual(phases.slice(-2), ['verifying', 'completed'])
  assert.equal(fs.existsSync(resolveVideoProcessingTempRoot(fakeApp(root))), false)
}))

test('conventional jobs publish WebM and MP4 with their selected codecs and extensions', () => withTempManager(async (root) => {
  const calls = []
  const dependencies = managerDependencies(root, {
    probeFile: async (filePath) => rawOutputProbeFor(path.extname(filePath).slice(1)),
    runProcess: async (request) => {
      calls.push(request)
      const outputPath = request.args.at(-1)
      if (/\.(webm|mp4)$/i.test(outputPath)) {
        await fsp.mkdir(path.dirname(outputPath), { recursive: true })
        await fsp.writeFile(outputPath, 'output')
      }
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  for (const item of [
    { format: 'webm', encoder: 'libvpx-vp9', audio: 'libopus' },
    { format: 'mp4', encoder: 'libopenh264', audio: 'aac' },
  ]) {
    const result = await manager.start(job(root, {
      jobId: `job-${item.format}`,
      outputName: `intro_50pct_balanced.${item.format}`,
      settings: settings({ outputFormat: item.format }),
    }))
    assert.equal(path.extname(result.outputPath), `.${item.format}`)
    const encode = calls.findLast((call) => call.args.at(-1).endsWith(`.${item.format}`))
    assert.ok(encode.args.includes(item.encoder))
    assert.ok(encode.args.includes(item.audio))
  }
}))

test('rejects unsafe renderer job ids before creating filesystem paths', () => withTempManager(async (root) => {
  const manager = createVideoProcessingJobManager(managerDependencies(root))
  await assert.rejects(
    () => manager.start(job(root, { jobId: 'x\\..\\..\\victim' })),
    /jobId 无效/,
  )
  assert.equal(fs.existsSync(path.join(root, 'victim')), false)
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

test('shutdown waits until active job temporary directory cleanup finishes', () => withTempManager(async (root) => {
  let observedSignal = null
  let releaseCleanup
  let markCleanupStarted
  const cleanupStarted = new Promise((resolve) => { markCleanupStarted = resolve })
  const originalRm = fsp.rm
  const tempRoot = resolveVideoProcessingTempRoot(fakeApp(root))
  fsp.rm = async (targetPath, options) => {
    const target = String(targetPath)
    if (target.startsWith(`${tempRoot}${path.sep}`) && options?.recursive) {
      markCleanupStarted()
      await new Promise((resolve) => { releaseCleanup = resolve })
    }
    return originalRm(targetPath, options)
  }
  let pending
  try {
    const manager = createVideoProcessingJobManager(managerDependencies(root, {
      runProcess: ({ signal }) => new Promise((_resolve, reject) => {
        observedSignal = signal
        signal.addEventListener('abort', () => reject(new Error('native process aborted')), { once: true })
      }),
    }))
    pending = manager.start(job(root))
    const pendingRejection = assert.rejects(pending, /任务已取消/)
    while (!observedSignal) await new Promise((resolve) => setImmediate(resolve))

    const shutdown = manager.shutdown()
    await cleanupStarted
    const state = await Promise.race([
      shutdown.then(() => 'finished'),
      new Promise((resolve) => setTimeout(() => resolve('waiting'), 50)),
    ])
    assert.equal(state, 'waiting')
    releaseCleanup()
    await shutdown
    await pendingRejection
  } finally {
    releaseCleanup?.()
    if (pending) await pending.catch(() => {})
    fsp.rm = originalRm
  }
}))

test('AI job keeps the GPU model loaded by upscaling the frame directory in one process', () => withTempManager(async (root) => {
  const calls = []
  const progress = []
  const dependencies = managerDependencies(root, {
    probeFile: async () => rawOutputProbe(960, 540),
    emitProgress: (event) => progress.push(event),
    runProcess: async (request) => {
      const { command, args, onOutput } = request
      calls.push(request)
      const outputPath = args.at(-1)
      if (outputPath.includes('source-%08d.png')) {
        const directory = path.dirname(outputPath)
        await fsp.mkdir(directory, { recursive: true })
        await fsp.writeFile(path.join(directory, 'source-00000001.png'), 'one')
        await fsp.writeFile(path.join(directory, 'source-00000002.png'), 'two')
      } else if (command.endsWith('upscayl-bin.exe')) {
        const input = args[args.indexOf('-i') + 1]
        const target = args[args.indexOf('-o') + 1]
        if (path.extname(target)) {
          await fsp.writeFile(target, 'upscaled')
        } else {
          await fsp.mkdir(target, { recursive: true })
          for (const name of await fsp.readdir(input)) {
            await fsp.writeFile(path.join(target, name), 'upscaled')
            onOutput?.('Upscayled Successfully!\n')
          }
        }
      } else if (outputPath.endsWith('.ogv')) {
        await fsp.writeFile(outputPath, 'output')
      }
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  await manager.start(job(root, {
    outputName: 'intro_150pct_balanced.ogv',
    settings: settings({ percent: 150, width: 960, height: 540, threadProfile: 'throughput' }),
  }))

  const upscaleCalls = calls.filter((call) => call.command.endsWith('upscayl-bin.exe'))
  assert.equal(upscaleCalls.length, 1)
  assert.equal(path.basename(upscaleCalls[0].args[upscaleCalls[0].args.indexOf('-i') + 1]), 'source-frames')
  assert.equal(path.basename(upscaleCalls[0].args[upscaleCalls[0].args.indexOf('-o') + 1]), 'upscaled-frames')
  assert.equal(upscaleCalls[0].args[upscaleCalls[0].args.indexOf('-j') + 1], '2:2:2')
  assert.equal(upscaleCalls[0].maxOutputChars, 65_536)
  assert.ok(progress.some((event) => event.phase === 'upscaling' && event.completed === 2 && event.total === 2))
  const aiEncode = calls.find((call) => call.args.at(-1).endsWith('.ogv'))
  assert.equal(aiEncode.args.includes('D:\\media\\intro.mp4'), true)
  assert.deepEqual(
    aiEncode.args.slice(aiEncode.args.indexOf('-t'), aiEncode.args.indexOf('-t') + 2),
    ['-t', '1'],
  )
}))

test('target-size job retries once when the first output exceeds the size ceiling', () => withTempManager(async (root) => {
  let passTwoCount = 0
  const passTwoArgs = []
  const dependencies = managerDependencies(root, {
    runProcess: async ({ args }) => {
      const outputPath = args.at(-1)
      if (args.includes('-pass') && args[args.indexOf('-pass') + 1] === '2') {
        passTwoCount += 1
        passTwoArgs.push(args)
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
  for (const args of passTwoArgs) {
    assert.deepEqual(args.slice(args.indexOf('-t'), args.indexOf('-t') + 2), ['-t', '2'])
  }
  assert.equal(result.outputSize, 900_000)
}))

test('MP4 target-size job uses a single bitrate-controlled encode without pass flags', () => withTempManager(async (root) => {
  const encodeCalls = []
  const dependencies = managerDependencies(root, {
    probeFile: async () => rawOutputProbeFor('mp4'),
    runProcess: async ({ args }) => {
      const outputPath = args.at(-1)
      if (outputPath.endsWith('.mp4')) {
        encodeCalls.push(args)
        await fsp.mkdir(path.dirname(outputPath), { recursive: true })
        await fsp.writeFile(outputPath, Buffer.alloc(900_000))
      }
      return { ok: true, output: '' }
    },
  })
  const manager = createVideoProcessingJobManager(dependencies)

  const result = await manager.start(job(root, {
    jobId: 'target-size-mp4',
    outputName: 'intro_50pct_target-1mb.mp4',
    settings: settings({ outputFormat: 'mp4', qualityMode: 'target-size', targetMb: 1 }),
  }))

  assert.equal(encodeCalls.length, 1)
  assert.equal(encodeCalls[0].includes('-pass'), false)
  assert.ok(encodeCalls[0].includes('-b:v'))
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
    settings: settings({ targetFps: 12, audioMode: 'keep' }),
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
