import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildVideoOutputName,
  calculateTargetVideoBitrateKbps,
  defaultVideoProcessingSettings,
  deriveResizeFromHeight,
  deriveResizeFromPercent,
  deriveResizeFromWidth,
  getUpscaleScaleForPercent,
  getVideoParentDirectory,
  normalizeEvenDimension,
  resolveCollisionFreeOutputName,
  toVideoFileUrl,
  validateVideoProcessingSettings,
  videoJobReducer,
  type VideoMediaProbe,
  type VideoProcessingJob,
} from './videoProcessingModel'

const probe: VideoMediaProbe = {
  path: 'D:\\media\\boss-intro.mp4',
  name: 'boss-intro.mp4',
  size: 24 * 1024 * 1024,
  durationSeconds: 60,
  videoDurationSeconds: 60,
  width: 1920,
  height: 1080,
  averageFps: 30,
  videoCodec: 'h264',
  pixelFormat: 'yuv420p',
  hasAudio: true,
  audioCodec: 'aac',
  audioChannels: 2,
  audioSampleRate: 48000,
}

test('normalizes target dimensions to positive even integers', () => {
  assert.equal(normalizeEvenDimension(-1), 2)
  assert.equal(normalizeEvenDimension(721), 722)
  assert.equal(normalizeEvenDimension(722), 722)
})

test('percentage resize remains aspect locked and exact at common scales', () => {
  assert.deepEqual(deriveResizeFromPercent(1920, 1080, 150), {
    percent: 150,
    width: 2880,
    height: 1620,
  })
  assert.deepEqual(deriveResizeFromPercent(1920, 1080, 12), {
    percent: 25,
    width: 480,
    height: 270,
  })
})

test('width and height inputs synchronize percentage and the opposite dimension', () => {
  assert.deepEqual(deriveResizeFromWidth(1920, 1080, 1001), {
    percent: 52.19,
    width: 1002,
    height: 564,
  })
  assert.deepEqual(deriveResizeFromHeight(1920, 1080, 721), {
    percent: 66.85,
    width: 1284,
    height: 722,
  })
})

test('selects approved Upscayl stages at percentage boundaries', () => {
  assert.equal(getUpscaleScaleForPercent(100), null)
  assert.equal(getUpscaleScaleForPercent(101), 2)
  assert.equal(getUpscaleScaleForPercent(200), 2)
  assert.equal(getUpscaleScaleForPercent(201), 3)
  assert.equal(getUpscaleScaleForPercent(300), 3)
  assert.equal(getUpscaleScaleForPercent(301), 4)
  assert.equal(getUpscaleScaleForPercent(400), 4)
})

test('target bitrate reserves Ogg overhead and selected audio bitrate', () => {
  assert.equal(calculateTargetVideoBitrateKbps({
    targetMb: 10,
    durationSeconds: 60,
    audioKbps: 96,
  }), 1246)
})

test('rejects target sizes that leave less than 128 kbps for video', () => {
  assert.throws(() => calculateTargetVideoBitrateKbps({
    targetMb: 1,
    durationSeconds: 60,
    audioKbps: 160,
  }), /目标文件大小过小/)
})

test('builds safe descriptive OGV names and collision suffixes', () => {
  assert.equal(
    buildVideoOutputName('boss:intro.mp4', 150, { mode: 'quality', preset: 'balanced' }),
    'boss_intro_150pct_balanced.ogv',
  )
  assert.equal(
    buildVideoOutputName('intro.mov', 50, { mode: 'target-size', targetMb: 8.5 }),
    'intro_50pct_target-8.5mb.ogv',
  )
  assert.equal(
    resolveCollisionFreeOutputName('intro_50pct_balanced.ogv', new Set([
      'intro_50pct_balanced.ogv',
      'intro_50pct_balanced-2.ogv',
    ])),
    'intro_50pct_balanced-3.ogv',
  )
})

test('converts Windows and UNC media paths to encoded local file URLs', () => {
  assert.equal(
    toVideoFileUrl('D:\\游戏 视频\\片头#1.mp4'),
    'file:///D:/%E6%B8%B8%E6%88%8F%20%E8%A7%86%E9%A2%91/%E7%89%87%E5%A4%B4%231.mp4',
  )
  assert.equal(
    toVideoFileUrl('\\\\media-server\\shared folder\\intro.mp4'),
    'file://media-server/shared%20folder/intro.mp4',
  )
})

test('resolves each completed output parent directory independently', () => {
  assert.equal(getVideoParentDirectory('D:\\exports\\boss\\intro.ogv'), 'D:\\exports\\boss')
  assert.equal(getVideoParentDirectory('\\\\server\\share\\intro.ogv'), '\\\\server\\share')
})

test('defaults preserve source FPS and audio while using balanced quality', () => {
  const settings = defaultVideoProcessingSettings(probe)
  assert.equal(settings.percent, 100)
  assert.equal(settings.width, 1920)
  assert.equal(settings.height, 1080)
  assert.equal(settings.targetFps, 30)
  assert.equal(settings.audioMode, 'vorbis')
  assert.equal(settings.audioKbps, 96)
  assert.equal(settings.qualityPreset, 'balanced')
})

test('validation requires FFmpeg for all tasks and Upscayl for enlargement', () => {
  const settings = { ...defaultVideoProcessingSettings(probe), percent: 150, width: 2880, height: 1620 }
  assert.deepEqual(validateVideoProcessingSettings(probe, settings, {
    ffmpegInstalled: false,
    upscaylInstalled: false,
  }), ['请先安装视频处理运行包。', '超过 100% 的任务必须安装 Upscayl GPU 运行包。'])
  assert.deepEqual(validateVideoProcessingSettings(probe, settings, {
    ffmpegInstalled: true,
    upscaylInstalled: true,
  }), [])
})

test('validation rejects FPS above source and invalid target size', () => {
  const settings = {
    ...defaultVideoProcessingSettings(probe),
    targetFps: 60,
    qualityMode: 'target-size' as const,
    targetMb: 1,
    audioKbps: 160 as const,
  }
  const errors = validateVideoProcessingSettings(probe, settings, {
    ffmpegInstalled: true,
    upscaylInstalled: true,
  })
  assert.equal(errors.some((error) => error.includes('不能高于源视频')), true)
  assert.equal(errors.some((error) => error.includes('目标文件大小过小')), true)
})

test('failed jobs retry as a new queued attempt without mutating the original', () => {
  const original: VideoProcessingJob = {
    id: 'job-a',
    input: probe,
    settings: defaultVideoProcessingSettings(probe),
    phase: 'failed',
    progress: 42,
    message: '编码失败',
    error: 'encode failed',
    outputPath: '',
    outputSize: 0,
  }
  const retried = videoJobReducer(original, { type: 'retry', nextId: 'job-b' })
  assert.equal(retried.id, 'job-b')
  assert.equal(retried.phase, 'queued')
  assert.equal(retried.progress, 0)
  assert.equal(retried.error, '')
  assert.equal(original.id, 'job-a')
  assert.equal(original.phase, 'failed')
})

test('job reducer records progress and completion results', () => {
  const queued: VideoProcessingJob = {
    id: 'job-a',
    input: probe,
    settings: defaultVideoProcessingSettings(probe),
    phase: 'queued',
    progress: 0,
    message: '',
    error: '',
    outputPath: '',
    outputSize: 0,
  }
  const encoding = videoJobReducer(queued, {
    type: 'progress', phase: 'encoding', percent: 55, message: '正在编码',
  })
  const completed = videoJobReducer(encoding, {
    type: 'complete', outputPath: 'D:\\out\\boss-intro.ogv', outputSize: 1000,
  })
  assert.equal(encoding.phase, 'encoding')
  assert.equal(encoding.progress, 55)
  assert.equal(completed.phase, 'completed')
  assert.equal(completed.progress, 100)
  assert.equal(completed.outputSize, 1000)
})
