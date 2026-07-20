const path = require('node:path')

function roundTo(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function parseRational(value) {
  const text = String(value || '')
  const match = text.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/)
  if (!match) return 0
  const numerator = Number(match[1])
  const denominator = Number(match[2])
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0
  const result = numerator / denominator
  return Number.isFinite(result) && result > 0 ? roundTo(result) : 0
}

function buildProbeArgs(filePath) {
  return [
    '-v', 'error',
    '-show_format',
    '-show_streams',
    '-of', 'json',
    String(filePath),
  ]
}

function mapProbeResult(payload, filePath) {
  const streams = Array.isArray(payload?.streams) ? payload.streams : []
  const video = streams.find((stream) => stream?.codec_type === 'video')
  if (!video) throw new Error('视频文件不包含可读取的视频流。')
  const audio = streams.find((stream) => stream?.codec_type === 'audio')
  const durationSeconds = Number(payload?.format?.duration || video.duration || 0)
  const averageFps = parseRational(video.avg_frame_rate) || parseRational(video.r_frame_rate)
  const streamDurationSeconds = Number(video.duration || 0)
  const frameCount = Number(video.nb_frames || 0)
  const derivedFrameDuration = frameCount > 0 && averageFps > 0 ? frameCount / averageFps : 0
  const videoDurationSeconds = streamDurationSeconds > 0
    ? streamDurationSeconds
    : derivedFrameDuration > 0
      ? roundTo(derivedFrameDuration, 6)
      : durationSeconds
  return {
    path: String(filePath),
    name: path.basename(String(filePath)),
    size: Math.max(0, Number(payload?.format?.size || 0)),
    durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0,
    videoDurationSeconds: Number.isFinite(videoDurationSeconds) && videoDurationSeconds > 0
      ? videoDurationSeconds
      : 0,
    width: Math.max(0, Number(video.width || 0)),
    height: Math.max(0, Number(video.height || 0)),
    averageFps,
    videoCodec: String(video.codec_name || ''),
    pixelFormat: String(video.pix_fmt || ''),
    hasAudio: Boolean(audio),
    audioCodec: String(audio?.codec_name || ''),
    audioChannels: Math.max(0, Number(audio?.channels || 0)),
    audioSampleRate: Math.max(0, Number(audio?.sample_rate || 0)),
  }
}

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error('视频命令包含无效数值。')
  return Number.isInteger(number) ? String(number) : String(roundTo(number))
}

function buildPreviewArgs(options) {
  return [
    '-y',
    '-ss', formatNumber(Math.max(0, Number(options.timestampSeconds || 0))),
    '-i', String(options.inputPath),
    '-frames:v', '1',
    '-vf', `scale=${Number(options.width)}:${Number(options.height)}:flags=lanczos`,
    String(options.outputPath),
  ]
}

function buildDecodeFramesArgs(options) {
  return [
    '-y', '-i', String(options.inputPath),
    '-map', '0:v:0',
    '-vf', `fps=${formatNumber(options.fps)}`,
    '-vsync', '0',
    '-progress', 'pipe:1', '-nostats',
    String(options.outputPattern),
  ]
}

function buildTheoraEncodeArgs(options) {
  const args = ['-y']
  const fps = formatNumber(options.fps)
  const usingFrames = Boolean(options.framePattern)
  if (usingFrames) {
    args.push('-framerate', fps, '-i', String(options.framePattern))
    if (!options.muted && options.audioInputPath) {
      args.push('-i', String(options.audioInputPath))
    }
  } else {
    if (!options.inputPath) throw new Error('视频编码缺少输入路径。')
    args.push('-i', String(options.inputPath))
  }

  args.push('-map', '0:v:0')
  if (!options.muted && Number(options.pass || 0) !== 1) {
    const audioMap = usingFrames && options.audioInputPath ? '1:a:0?' : '0:a:0?'
    args.push('-map', audioMap)
  }
  args.push(
    '-vf', `scale=${Number(options.width)}:${Number(options.height)}:flags=lanczos,fps=${fps}`,
    '-c:v', 'libtheora',
    '-pix_fmt', 'yuv420p',
  )

  if (Number.isFinite(Number(options.videoBitrateKbps)) && Number(options.videoBitrateKbps) > 0) {
    args.push('-b:v', `${Math.round(Number(options.videoBitrateKbps))}k`)
  } else {
    args.push('-q:v', String(Number(options.quality || 6)))
  }

  if (options.pass === 1 || options.pass === 2) {
    if (!options.passlogPath) throw new Error('双遍编码缺少 passlog 路径。')
    args.push('-pass', String(options.pass), '-passlogfile', String(options.passlogPath))
  }

  if (options.pass === 1) {
    args.push('-an', '-f', 'null')
  } else if (options.muted) {
    args.push('-an', '-f', 'ogg')
  } else {
    args.push('-c:a', 'libvorbis', '-b:a', `${Number(options.audioKbps || 96)}k`, '-ac', '2', '-f', 'ogg')
  }
  const outputDurationSeconds = Number(options.outputDurationSeconds)
  if (Number.isFinite(outputDurationSeconds) && outputDurationSeconds > 0) {
    args.push('-t', formatNumber(outputDurationSeconds))
  }
  args.push('-progress', 'pipe:1', '-nostats', String(options.outputPath))
  return args
}

function parseProgressPairs(text) {
  const pairs = new Map()
  for (const line of String(text || '').split(/\r?\n/)) {
    const separator = line.indexOf('=')
    if (separator <= 0) continue
    pairs.set(line.slice(0, separator), line.slice(separator + 1))
  }
  return pairs
}

function parseFfmpegProgress(text, durationSeconds) {
  const pairs = parseProgressPairs(text)
  const duration = Math.max(0, Number(durationSeconds || 0))
  const microseconds = Number(pairs.get('out_time_us') || pairs.get('out_time_ms') || 0)
  const rawCompleted = Number.isFinite(microseconds) ? microseconds / 1_000_000 : 0
  const done = pairs.get('progress') === 'end'
  const completedSeconds = duration > 0
    ? Math.min(duration, Math.max(0, done ? duration : rawCompleted))
    : Math.max(0, rawCompleted)
  const percent = duration > 0
    ? Math.min(100, Math.max(0, Math.round(completedSeconds / duration * 100)))
    : done ? 100 : 0
  return { completedSeconds: roundTo(completedSeconds), percent, done }
}

function verifyGodotOgvProbe(payload, expected) {
  const formatNames = String(payload?.format?.format_name || '').split(',')
  if (!formatNames.includes('ogg')) throw new Error('输出容器不是 Ogg。')
  const streams = Array.isArray(payload?.streams) ? payload.streams : []
  const videoStreams = streams.filter((stream) => stream?.codec_type === 'video')
  if (videoStreams.length !== 1) throw new Error('输出必须只包含一个视频流。')
  const video = videoStreams[0]
  if (video.codec_name !== 'theora') throw new Error('输出视频编码不是 Theora。')
  if (video.pix_fmt !== 'yuv420p') throw new Error('输出像素格式不是 yuv420p。')
  if (Number(video.width) !== Number(expected.width) || Number(video.height) !== Number(expected.height)) {
    throw new Error('输出分辨率与目标分辨率不一致。')
  }
  const declaredFps = parseRational(video.r_frame_rate)
  const averageFps = parseRational(video.avg_frame_rate)
  const usingDeclaredFps = declaredFps > 0
  const fps = usingDeclaredFps ? declaredFps : averageFps
  const targetFps = Number(expected.fps)
  if (!fps || Math.abs(fps - targetFps) > 0.02) {
    const metric = usingDeclaredFps ? '声明帧率' : '平均帧率兜底'
    throw new Error(
      `输出帧率与目标帧率不一致：目标=${targetFps}，` +
      `声明=${declaredFps || 0} (${String(video.r_frame_rate || '缺失')})，` +
      `平均=${averageFps || 0} (${String(video.avg_frame_rate || '缺失')})，判定=${metric}。`,
    )
  }

  const audioStreams = streams.filter((stream) => stream?.codec_type === 'audio')
  if (expected.muted && audioStreams.length > 0) throw new Error('静音输出不应包含音轨。')
  if (!expected.muted) {
    if (audioStreams.length !== 1) throw new Error('输出必须包含一个 Vorbis 音轨。')
    if (audioStreams[0].codec_name !== 'vorbis') throw new Error('输出音频编码不是 Vorbis。')
  }
  const unsupportedStreams = streams.filter((stream) => !['video', 'audio'].includes(stream?.codec_type))
  if (unsupportedStreams.length > 0) throw new Error('输出包含 Godot 视频不需要的额外媒体流。')

  const declaredVideoDuration = Number(video.duration || 0)
  const frameCount = Number(video.nb_frames || 0)
  const videoDurationSeconds = declaredVideoDuration > 0
    ? declaredVideoDuration
    : frameCount > 0 && fps > 0
      ? frameCount / fps
      : 0
  const audioDurationSeconds = audioStreams.reduce((maximum, stream) => {
    const duration = Number(stream.duration || 0)
    return Number.isFinite(duration) && duration > maximum ? duration : maximum
  }, 0)
  const rawContainerDuration = Number(payload?.format?.duration || 0)
  const containerDurationSeconds = Number.isFinite(rawContainerDuration) && rawContainerDuration > 0
    ? rawContainerDuration
    : 0
  const tailDurationSeconds = Math.max(audioDurationSeconds, containerDurationSeconds) - videoDurationSeconds
  const tailToleranceSeconds = Math.max(0.05, 1 / fps + 0.01)
  if (videoDurationSeconds > 0 && tailDurationSeconds > tailToleranceSeconds) {
    throw new Error(
      `输出音频或容器尾部超过视频：视频=${roundTo(videoDurationSeconds, 6)} 秒，` +
      `音频=${roundTo(audioDurationSeconds, 6)} 秒，容器=${roundTo(containerDurationSeconds, 6)} 秒，` +
      `尾部=${roundTo(tailDurationSeconds, 6)} 秒，允许=${roundTo(tailToleranceSeconds, 6)} 秒。`,
    )
  }

  return {
    container: 'ogg',
    videoCodec: 'theora',
    pixelFormat: 'yuv420p',
    width: Number(video.width),
    height: Number(video.height),
    fps,
    audioCodec: audioStreams[0]?.codec_name || '',
    videoDurationSeconds,
    durationSeconds: Number(payload?.format?.duration || 0),
    size: Number(payload?.format?.size || 0),
  }
}

module.exports = {
  buildDecodeFramesArgs,
  buildPreviewArgs,
  buildProbeArgs,
  buildTheoraEncodeArgs,
  mapProbeResult,
  parseFfmpegProgress,
  parseRational,
  verifyGodotOgvProbe,
}
