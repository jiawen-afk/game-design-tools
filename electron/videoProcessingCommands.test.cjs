const test = require('node:test')
const assert = require('node:assert/strict')

const {
  buildDecodeFramesArgs,
  buildProbeArgs,
  buildTheoraEncodeArgs,
  mapProbeResult,
  parseFfmpegProgress,
  parseRational,
  verifyGodotOgvProbe,
} = require('./videoProcessingCommands.cjs')

test('parses FFprobe rational frame rates safely', () => {
  assert.equal(parseRational('30000/1001'), 29.97)
  assert.equal(parseRational('30/1'), 30)
  assert.equal(parseRational('0/0'), 0)
  assert.equal(parseRational('invalid'), 0)
})

test('builds a JSON FFprobe command without shell interpolation', () => {
  assert.deepEqual(buildProbeArgs('D:\\视频素材\\intro clip.mp4'), [
    '-v', 'error',
    '-show_format',
    '-show_streams',
    '-of', 'json',
    'D:\\视频素材\\intro clip.mp4',
  ])
})

test('maps the first video and audio streams into renderer metadata', () => {
  const result = mapProbeResult({
    format: { duration: '15.070000', size: '1000000' },
    streams: [
      {
        codec_type: 'video',
        codec_name: 'h264',
        width: 1920,
        height: 1080,
        pix_fmt: 'yuv420p',
        avg_frame_rate: '27060/901',
        duration: '15.016667',
        nb_frames: '451',
      },
      { codec_type: 'audio', codec_name: 'aac', duration: '15.070000', channels: 2, sample_rate: '44100' },
    ],
  }, 'D:\\视频素材\\intro clip.mp4')

  assert.deepEqual(result, {
    path: 'D:\\视频素材\\intro clip.mp4',
    name: 'intro clip.mp4',
    size: 1000000,
    durationSeconds: 15.07,
    videoDurationSeconds: 15.016667,
    width: 1920,
    height: 1080,
    averageFps: 30.033,
    videoCodec: 'h264',
    pixelFormat: 'yuv420p',
    hasAudio: true,
    audioCodec: 'aac',
    audioChannels: 2,
    audioSampleRate: 44100,
  })
})

test('derives video duration from frame count when the stream duration is absent', () => {
  const result = mapProbeResult({
    format: { duration: '15.07', size: '1' },
    streams: [{
      codec_type: 'video',
      codec_name: 'h264',
      width: 640,
      height: 360,
      avg_frame_rate: '30/1',
      nb_frames: '451',
    }],
  }, 'D:\\media\\fallback.mp4')

  assert.equal(result.videoDurationSeconds, 15.033333)
})

test('builds frame extraction at target FPS before AI upscaling', () => {
  const args = buildDecodeFramesArgs({
    inputPath: 'D:\\media\\intro.mp4',
    outputPattern: 'D:\\temp\\source-%08d.png',
    fps: 24,
  })
  assert.deepEqual(args, [
    '-y', '-i', 'D:\\media\\intro.mp4',
    '-map', '0:v:0',
    '-vf', 'fps=24',
    '-vsync', '0',
    '-progress', 'pipe:1', '-nostats',
    'D:\\temp\\source-%08d.png',
  ])
})

test('standard OGV encode uses Theora, yuv420p, Lanczos, and Vorbis', () => {
  const args = buildTheoraEncodeArgs({
    inputPath: 'D:\\视频\\intro.mp4',
    outputPath: 'D:\\输出\\intro.ogv',
    width: 1280,
    height: 720,
    fps: 30,
    quality: 6,
    muted: false,
    audioKbps: 96,
  })
  assert.deepEqual(args.slice(0, 3), ['-y', '-i', 'D:\\视频\\intro.mp4'])
  assert.ok(args.includes('libtheora'))
  assert.ok(args.includes('yuv420p'))
  assert.ok(args.includes('scale=1280:720:flags=lanczos,fps=30'))
  assert.ok(args.includes('libvorbis'))
  assert.ok(args.includes('96k'))
  assert.equal(args.at(-1), 'D:\\输出\\intro.ogv')
})

test('AI frame encode maps frame video and original audio inputs', () => {
  const args = buildTheoraEncodeArgs({
    framePattern: 'D:\\temp\\upscaled-%08d.png',
    audioInputPath: 'D:\\media\\intro.mp4',
    outputPath: 'D:\\out\\intro.ogv',
    width: 2880,
    height: 1620,
    fps: 24,
    quality: 8,
    muted: false,
    audioKbps: 128,
  })
  assert.deepEqual(args.slice(0, 7), [
    '-y', '-framerate', '24', '-i', 'D:\\temp\\upscaled-%08d.png', '-i', 'D:\\media\\intro.mp4',
  ])
  assert.ok(args.includes('0:v:0'))
  assert.ok(args.includes('1:a:0?'))
})

test('target-size pass one disables audio and writes null output', () => {
  const args = buildTheoraEncodeArgs({
    inputPath: 'D:\\media\\intro.mp4',
    outputPath: 'NUL',
    width: 1280,
    height: 720,
    fps: 30,
    videoBitrateKbps: 800,
    pass: 1,
    passlogPath: 'D:\\temp\\theora-pass',
    muted: false,
    audioKbps: 96,
  })
  assert.ok(args.includes('800k'))
  assert.ok(args.includes('-an'))
  assert.ok(args.includes('null'))
  assert.equal(args.at(-1), 'NUL')
})

test('parses FFmpeg progress into a bounded percentage', () => {
  assert.deepEqual(parseFfmpegProgress('frame=30\nout_time_us=5000000\nprogress=continue\n', 10), {
    completedSeconds: 5,
    percent: 50,
    done: false,
  })
  assert.deepEqual(parseFfmpegProgress('out_time_us=12000000\nprogress=end\n', 10), {
    completedSeconds: 10,
    percent: 100,
    done: true,
  })
})

test('Godot verifier accepts exact Ogg Theora Vorbis output', () => {
  const result = verifyGodotOgvProbe({
    format: { format_name: 'ogg', duration: '10', size: '1000' },
    streams: [
      { codec_type: 'video', codec_name: 'theora', pix_fmt: 'yuv420p', width: 1280, height: 720, avg_frame_rate: '30/1' },
      { codec_type: 'audio', codec_name: 'vorbis', channels: 2, sample_rate: '48000' },
    ],
  }, { width: 1280, height: 720, fps: 30, muted: false })
  assert.equal(result.videoCodec, 'theora')
  assert.equal(result.audioCodec, 'vorbis')
})

test('Godot verifier uses declared CFR when statistical average drifts', () => {
  const cases = [
    { target: 29.94, declared: '1497/50', average: '359/12' },
    { target: 30.067, declared: '30067/1000', average: '30/1' },
  ]
  for (const item of cases) {
    const result = verifyGodotOgvProbe({
      format: { format_name: 'ogg' },
      streams: [{
        codec_type: 'video',
        codec_name: 'theora',
        pix_fmt: 'yuv420p',
        width: 1280,
        height: 720,
        r_frame_rate: item.declared,
        avg_frame_rate: item.average,
      }],
    }, { width: 1280, height: 720, fps: item.target, muted: true })
    assert.equal(result.fps, item.target)
  }
})

test('Godot verifier rejects a wrong declared CFR even when average matches', () => {
  assert.throws(() => verifyGodotOgvProbe({
    format: { format_name: 'ogg' },
    streams: [{
      codec_type: 'video',
      codec_name: 'theora',
      pix_fmt: 'yuv420p',
      width: 1280,
      height: 720,
      r_frame_rate: '25/1',
      avg_frame_rate: '30/1',
    }],
  }, { width: 1280, height: 720, fps: 30, muted: true }), /目标=30.*声明=25.*平均=30.*判定=声明帧率/)
})

test('Godot verifier falls back to average FPS when declared rate is unavailable', () => {
  const result = verifyGodotOgvProbe({
    format: { format_name: 'ogg' },
    streams: [{
      codec_type: 'video',
      codec_name: 'theora',
      pix_fmt: 'yuv420p',
      width: 1280,
      height: 720,
      r_frame_rate: '0/0',
      avg_frame_rate: '30067/1000',
    }],
  }, { width: 1280, height: 720, fps: 30.067, muted: true })
  assert.equal(result.fps, 30.067)
})

test('Godot verifier reports both raw rates when neither is available', () => {
  assert.throws(() => verifyGodotOgvProbe({
    format: { format_name: 'ogg' },
    streams: [{
      codec_type: 'video',
      codec_name: 'theora',
      pix_fmt: 'yuv420p',
      width: 1280,
      height: 720,
      r_frame_rate: '0/0',
      avg_frame_rate: 'N/A',
    }],
  }, { width: 1280, height: 720, fps: 30, muted: true }), /目标=30.*声明=0 \(0\/0\).*平均=0 \(N\/A\).*判定=平均帧率兜底/)
})

test('Godot verifier rejects wrong codecs and unexpected audio', () => {
  assert.throws(() => verifyGodotOgvProbe({
    format: { format_name: 'ogg' },
    streams: [{ codec_type: 'video', codec_name: 'vp9', pix_fmt: 'yuv420p', width: 1280, height: 720, avg_frame_rate: '30/1' }],
  }, { width: 1280, height: 720, fps: 30, muted: true }), /Theora/)
  assert.throws(() => verifyGodotOgvProbe({
    format: { format_name: 'ogg' },
    streams: [
      { codec_type: 'video', codec_name: 'theora', pix_fmt: 'yuv420p', width: 1280, height: 720, avg_frame_rate: '30/1' },
      { codec_type: 'audio', codec_name: 'vorbis' },
    ],
  }, { width: 1280, height: 720, fps: 30, muted: true }), /不应包含音轨/)
})
