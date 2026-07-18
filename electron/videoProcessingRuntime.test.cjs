const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const {
  VIDEO_RUNTIME_MANIFEST,
  getVideoRuntimeStatus,
  installVideoRuntime,
  resolveVideoRuntimePaths,
  safeZipEntryPath,
} = require('./videoProcessingRuntime.cjs')

function fakeApp(root) {
  return { getPath: () => root }
}

async function withTempRuntime(run) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'gdt-video-runtime-'))
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

test('pins the approved LGPL shared FFmpeg build', () => {
  assert.equal(VIDEO_RUNTIME_MANIFEST.version, '8.1.2-22-g94138f6973')
  assert.equal(VIDEO_RUNTIME_MANIFEST.releaseTag, 'autobuild-2026-07-17-13-22')
  assert.equal(
    VIDEO_RUNTIME_MANIFEST.assetName,
    'ffmpeg-n8.1.2-22-g94138f6973-win64-lgpl-shared-8.1.zip',
  )
  assert.equal(
    VIDEO_RUNTIME_MANIFEST.sha256,
    'fcbf0f5c58fec3e516e35ba26d81bc6cbaea09dde76bffd151fa93c0316b0b50',
  )
  assert.match(VIDEO_RUNTIME_MANIFEST.url, /win64-lgpl-shared/)
})

test('resolves the video runtime under local app data', () => withTempRuntime(async (root) => {
  const paths = resolveVideoRuntimePaths(fakeApp(root))
  assert.equal(paths.runtimeDir, path.join(root, 'GameDesignTools', 'VideoRuntime'))
  assert.equal(paths.ffmpegPath, path.join(paths.runtimeDir, 'bin', 'ffmpeg.exe'))
  assert.equal(paths.ffprobePath, path.join(paths.runtimeDir, 'bin', 'ffprobe.exe'))
}))

test('runtime status stays unavailable until both executables and manifest are present', () => withTempRuntime(async (root) => {
  const app = fakeApp(root)
  const paths = resolveVideoRuntimePaths(app)
  await fsp.mkdir(path.dirname(paths.ffmpegPath), { recursive: true })
  await fsp.writeFile(paths.ffmpegPath, 'ffmpeg')

  const status = await getVideoRuntimeStatus(app)

  assert.equal(status.installed, false)
  assert.match(status.message, /尚未安装/)
}))

test('rejects ZIP entries that escape the staging directory', () => {
  const root = path.resolve('D:\\runtime.staging')
  assert.equal(safeZipEntryPath(root, 'folder/bin/ffmpeg.exe'), path.join(root, 'folder', 'bin', 'ffmpeg.exe'))
  assert.throws(() => safeZipEntryPath(root, '../outside.exe'), /非法路径/)
  assert.throws(() => safeZipEntryPath(root, 'folder/../../outside.exe'), /非法路径/)
})

test('checksum failure preserves an existing verified runtime', () => withTempRuntime(async (root) => {
  const app = fakeApp(root)
  const paths = resolveVideoRuntimePaths(app)
  await fsp.mkdir(path.dirname(paths.ffmpegPath), { recursive: true })
  await fsp.writeFile(paths.ffmpegPath, 'existing-ffmpeg')
  await fsp.writeFile(paths.ffprobePath, 'existing-ffprobe')
  await fsp.writeFile(paths.manifestPath, JSON.stringify({ version: 'existing' }))

  await assert.rejects(() => installVideoRuntime(app, {
    downloadFile: async (_url, targetPath, onProgress) => {
      await fsp.mkdir(path.dirname(targetPath), { recursive: true })
      await fsp.writeFile(targetPath, 'bad archive')
      onProgress?.({ completed: 11, total: 11 })
    },
    hashFile: async () => 'wrong-checksum',
    extractZip: async () => { throw new Error('extract should not run') },
    runCommandOutput: async () => ({ ok: true, output: 'ok' }),
  }), /校验失败/)

  assert.equal(await fsp.readFile(paths.ffmpegPath, 'utf8'), 'existing-ffmpeg')
  assert.equal(JSON.parse(await fsp.readFile(paths.manifestPath, 'utf8')).version, 'existing')
}))

test('verified staged install replaces the runtime and reports progress', () => withTempRuntime(async (root) => {
  const app = fakeApp(root)
  const phases = []
  const status = await installVideoRuntime(app, {
    onProgress: (progress) => phases.push(progress.phase),
    downloadFile: async (_url, targetPath, onProgress) => {
      await fsp.mkdir(path.dirname(targetPath), { recursive: true })
      await fsp.writeFile(targetPath, 'archive')
      onProgress?.({ completed: 7, total: 7 })
    },
    hashFile: async () => VIDEO_RUNTIME_MANIFEST.sha256,
    extractZip: async (_archivePath, stagingDir) => {
      const runtimeRoot = path.join(stagingDir, 'ffmpeg-build')
      await fsp.mkdir(path.join(runtimeRoot, 'bin'), { recursive: true })
      await fsp.writeFile(path.join(runtimeRoot, 'bin', 'ffmpeg.exe'), 'new-ffmpeg')
      await fsp.writeFile(path.join(runtimeRoot, 'bin', 'ffprobe.exe'), 'new-ffprobe')
      await fsp.writeFile(path.join(runtimeRoot, 'LICENSE.txt'), 'LGPL')
    },
    runCommandOutput: async (command, args) => {
      assert.equal(fs.existsSync(command), true)
      assert.deepEqual(args, ['-version'])
      return { ok: true, output: 'ffmpeg version 8.1' }
    },
  })

  assert.equal(status.installed, true)
  assert.equal(status.version, VIDEO_RUNTIME_MANIFEST.version)
  assert.equal(await fsp.readFile(status.ffmpegPath, 'utf8'), 'new-ffmpeg')
  assert.deepEqual(phases, ['downloading', 'downloading', 'verifying', 'extracting', 'verifying', 'done'])
}))
