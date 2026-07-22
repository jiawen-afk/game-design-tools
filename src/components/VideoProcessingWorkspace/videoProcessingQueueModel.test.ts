import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applySettingsToQueuedJobs,
  createRetryVideoJob,
  getNextQueuedVideoJob,
  getVideoQueueValidationFailures,
  hasPendingOrActiveVideoJobs,
  shouldAutoPauseVideoQueue,
  updateVideoQueueJob,
} from './videoProcessingQueueModel'
import {
  defaultVideoProcessingSettings,
  type VideoMediaProbe,
  type VideoProcessingJob,
} from './videoProcessingModel'

const probe: VideoMediaProbe = {
  path: 'D:\\media\\intro.mp4',
  name: 'intro.mp4',
  size: 1_000_000,
  durationSeconds: 5,
  videoDurationSeconds: 5,
  width: 640,
  height: 360,
  averageFps: 30,
  videoCodec: 'h264',
  pixelFormat: 'yuv420p',
  hasAudio: true,
  audioCodec: 'aac',
  audioChannels: 2,
  audioSampleRate: 48000,
}

function videoJob(id: string, phase: VideoProcessingJob['phase']): VideoProcessingJob {
  return {
    id,
    input: { ...probe, name: `${id}.mp4`, path: `D:\\media\\${id}.mp4` },
    settings: defaultVideoProcessingSettings(probe),
    phase,
    progress: 0,
    message: '',
    error: '',
    outputPath: '',
    outputSize: 0,
  }
}

test('returns the first queued job only when the queue is not paused or active', () => {
  const jobs = [videoJob('done', 'completed'), videoJob('first', 'queued'), videoJob('second', 'queued')]
  assert.equal(getNextQueuedVideoJob(jobs, false, null)?.id, 'first')
  assert.equal(getNextQueuedVideoJob(jobs, true, null), null)
  assert.equal(getNextQueuedVideoJob(jobs, false, 'running'), null)
})

test('applies settings only to queued jobs', () => {
  const queued = videoJob('queued', 'queued')
  const running = videoJob('running', 'encoding')
  const completed = videoJob('completed', 'completed')
  const nextSettings = { ...queued.settings, percent: 50, width: 320, height: 180 }

  const result = applySettingsToQueuedJobs([queued, running, completed], nextSettings)

  assert.equal(result[0].settings.percent, 50)
  assert.equal(result[1], running)
  assert.equal(result[2], completed)
})

test('applied settings preserve each queued source aspect, FPS, and audio capability', () => {
  const source = videoJob('source', 'queued')
  const other = videoJob('other', 'queued')
  other.input = { ...other.input, width: 1280, height: 720, averageFps: 24, hasAudio: false }
  source.settings = { ...source.settings, percent: 50, width: 320, height: 180, targetFps: 30, audioMode: 'keep' }

  const result = applySettingsToQueuedJobs([source, other], source.settings)

  assert.equal(result[1].settings.width, 640)
  assert.equal(result[1].settings.height, 360)
  assert.equal(result[1].settings.targetFps, 24)
  assert.equal(result[1].settings.audioMode, 'mute')
})

test('collects queued validation failures before queue start', () => {
  const queued = videoJob('queued', 'queued')
  const completed = videoJob('completed', 'completed')
  const failures = getVideoQueueValidationFailures([queued, completed], {
    ffmpegInstalled: false,
    upscaylInstalled: false,
  })

  assert.deepEqual(failures.map((failure) => failure.jobId), ['queued'])
  assert.match(failures[0].errors.join('\n'), /安装视频处理运行包/)
})

test('updates only the matching queue job through the reducer', () => {
  const first = videoJob('first', 'queued')
  const second = videoJob('second', 'queued')
  const result = updateVideoQueueJob([first, second], 'second', {
    type: 'progress', phase: 'upscaling', percent: 40, message: 'GPU 超分',
  })

  assert.equal(result[0], first)
  assert.equal(result[1].phase, 'upscaling')
  assert.equal(result[1].progress, 40)
})

test('retry creates a new queued attempt and keeps the failed row immutable', () => {
  const failed = { ...videoJob('failed', 'failed'), error: 'encode error', progress: 60 }
  const retry = createRetryVideoJob(failed, 'retry-1')

  assert.equal(retry.id, 'retry-1')
  assert.equal(retry.phase, 'queued')
  assert.equal(retry.progress, 0)
  assert.equal(retry.error, '')
  assert.equal(failed.id, 'failed')
  assert.equal(failed.phase, 'failed')
})

test('detects work that must be canceled before leaving the workspace', () => {
  assert.equal(hasPendingOrActiveVideoJobs([videoJob('queued', 'queued')]), true)
  assert.equal(hasPendingOrActiveVideoJobs([videoJob('running', 'encoding')]), true)
  assert.equal(hasPendingOrActiveVideoJobs([videoJob('done', 'completed'), videoJob('failed', 'failed')]), false)
})

test('auto pauses a running video queue after every job becomes terminal', () => {
  for (const phase of ['completed', 'failed', 'canceled'] as const) {
    assert.equal(shouldAutoPauseVideoQueue([videoJob('a', phase)], false, null, null), true)
  }
})

test('does not auto pause while video queue work remains active', () => {
  assert.equal(shouldAutoPauseVideoQueue([videoJob('a', 'queued')], false, null, null), false)
  assert.equal(shouldAutoPauseVideoQueue([videoJob('a', 'completed')], false, 'a', null), false)
  assert.equal(shouldAutoPauseVideoQueue([videoJob('a', 'completed')], false, null, 'a'), false)
})

test('does not auto pause an empty or already paused video queue', () => {
  assert.equal(shouldAutoPauseVideoQueue([], false, null, null), false)
  assert.equal(shouldAutoPauseVideoQueue([videoJob('a', 'completed')], true, null, null), false)
})
