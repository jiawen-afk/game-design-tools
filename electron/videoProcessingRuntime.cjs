const crypto = require('node:crypto')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const https = require('node:https')
const path = require('node:path')
const { pipeline } = require('node:stream/promises')
const { spawn } = require('node:child_process')
const yauzl = require('yauzl')

const VIDEO_RUNTIME_MANIFEST = Object.freeze({
  version: '8.1.2-22-g94138f6973',
  releaseTag: 'autobuild-2026-07-17-13-22',
  assetName: 'ffmpeg-n8.1.2-22-g94138f6973-win64-lgpl-shared-8.1.zip',
  url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-07-17-13-22/ffmpeg-n8.1.2-22-g94138f6973-win64-lgpl-shared-8.1.zip',
  sha256: 'fcbf0f5c58fec3e516e35ba26d81bc6cbaea09dde76bffd151fa93c0316b0b50',
})

function resolveVideoRuntimePaths(app) {
  const localAppData = process.env.LOCALAPPDATA || app.getPath('userData')
  const parentDir = path.join(localAppData, 'GameDesignTools')
  const runtimeDir = path.join(parentDir, 'VideoRuntime')
  return {
    parentDir,
    runtimeDir,
    stagingDir: path.join(parentDir, 'VideoRuntime.staging'),
    backupDir: path.join(parentDir, 'VideoRuntime.backup'),
    downloadPath: path.join(parentDir, `${VIDEO_RUNTIME_MANIFEST.assetName}.download`),
    ffmpegPath: path.join(runtimeDir, 'bin', 'ffmpeg.exe'),
    ffprobePath: path.join(runtimeDir, 'bin', 'ffprobe.exe'),
    manifestPath: path.join(runtimeDir, 'runtime-manifest.json'),
  }
}

async function readInstalledManifest(manifestPath) {
  try {
    return JSON.parse(await fsp.readFile(manifestPath, 'utf8'))
  } catch {
    return null
  }
}

async function getVideoRuntimeStatus(app) {
  const paths = resolveVideoRuntimePaths(app)
  const manifest = await readInstalledManifest(paths.manifestPath)
  const installed = Boolean(
    manifest?.version === VIDEO_RUNTIME_MANIFEST.version &&
    fs.existsSync(paths.ffmpegPath) &&
    fs.existsSync(paths.ffprobePath),
  )
  return {
    installed,
    version: installed ? manifest.version : '',
    path: paths.runtimeDir,
    ffmpegPath: paths.ffmpegPath,
    ffprobePath: paths.ffprobePath,
    message: installed
      ? `视频处理运行包 ${manifest.version} 已安装。`
      : '尚未安装视频处理运行包。',
  }
}

function safeZipEntryPath(rootDir, entryName) {
  const root = path.resolve(rootDir)
  const normalizedEntry = String(entryName || '').replace(/\\/g, '/')
  if (!normalizedEntry || normalizedEntry.startsWith('/') || /^[a-zA-Z]:/.test(normalizedEntry)) {
    throw new Error(`压缩包包含非法路径：${entryName}`)
  }
  const target = path.resolve(root, normalizedEntry.split('/').join(path.sep))
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`压缩包包含非法路径：${entryName}`)
  }
  return target
}

function openZip(archivePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true, decodeStrings: true }, (error, zipFile) => {
      if (error) reject(error)
      else resolve(zipFile)
    })
  })
}

function openZipEntryStream(zipFile, entry) {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error) reject(error)
      else resolve(stream)
    })
  })
}

async function extractZip(archivePath, targetDir) {
  await fsp.mkdir(targetDir, { recursive: true })
  const zipFile = await openZip(archivePath)
  return new Promise((resolve, reject) => {
    let settled = false
    const fail = (error) => {
      if (settled) return
      settled = true
      try { zipFile.close() } catch {}
      reject(error)
    }
    zipFile.on('error', fail)
    zipFile.on('end', () => {
      if (settled) return
      settled = true
      resolve()
    })
    zipFile.on('entry', (entry) => {
      void (async () => {
        const outputPath = safeZipEntryPath(targetDir, entry.fileName)
        if (/\/$/.test(entry.fileName)) {
          await fsp.mkdir(outputPath, { recursive: true })
        } else {
          await fsp.mkdir(path.dirname(outputPath), { recursive: true })
          const input = await openZipEntryStream(zipFile, entry)
          await pipeline(input, fs.createWriteStream(outputPath))
        }
        zipFile.readEntry()
      })().catch(fail)
    })
    zipFile.readEntry()
  })
}

function downloadFile(url, targetPath, onProgress, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'Game-Design-Tools' } }, (response) => {
      const statusCode = Number(response.statusCode || 0)
      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        response.resume()
        if (redirectsLeft <= 0) {
          reject(new Error('视频处理运行包下载重定向次数过多。'))
          return
        }
        const nextUrl = new URL(response.headers.location, url).toString()
        downloadFile(nextUrl, targetPath, onProgress, redirectsLeft - 1).then(resolve, reject)
        return
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume()
        reject(new Error(`视频处理运行包下载失败：HTTP ${statusCode}`))
        return
      }
      const total = Number(response.headers['content-length'] || 0)
      let completed = 0
      const output = fs.createWriteStream(targetPath)
      response.on('data', (chunk) => {
        completed += chunk.length
        onProgress?.({ completed, total })
      })
      output.on('error', reject)
      response.on('error', reject)
      output.on('finish', () => output.close(resolve))
      response.pipe(output)
    })
    request.on('error', reject)
  })
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256')
  await pipeline(fs.createReadStream(filePath), hash)
  return hash.digest('hex')
}

function runCommandOutput(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true })
    let output = ''
    child.stdout?.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.stderr?.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.on('error', (error) => resolve({ ok: false, output: error.message }))
    child.on('close', (code) => resolve({ ok: code === 0, output: output.trim() }))
  })
}

async function findExtractedRuntimeRoot(stagingDir) {
  const queue = [stagingDir]
  while (queue.length > 0) {
    const current = queue.shift()
    const ffmpegPath = path.join(current, 'bin', 'ffmpeg.exe')
    const ffprobePath = path.join(current, 'bin', 'ffprobe.exe')
    if (fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)) return current
    const entries = await fsp.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) queue.push(path.join(current, entry.name))
    }
  }
  throw new Error('视频处理运行包中缺少 ffmpeg.exe 或 ffprobe.exe。')
}

function emitInstallProgress(onProgress, phase, completed, total, message) {
  const percent = total > 0 ? Math.min(100, Math.round(completed / total * 100)) : 0
  onProgress?.({ phase, completed, total, percent, message })
}

async function replaceRuntimeAtomically(paths, runtimeRoot) {
  await fsp.rm(paths.backupDir, { recursive: true, force: true })
  const hadRuntime = fs.existsSync(paths.runtimeDir)
  if (hadRuntime) await fsp.rename(paths.runtimeDir, paths.backupDir)
  try {
    await fsp.rename(runtimeRoot, paths.runtimeDir)
    await fsp.rm(paths.backupDir, { recursive: true, force: true })
  } catch (error) {
    await fsp.rm(paths.runtimeDir, { recursive: true, force: true })
    if (hadRuntime && fs.existsSync(paths.backupDir)) {
      await fsp.rename(paths.backupDir, paths.runtimeDir)
    }
    throw error
  }
}

async function installVideoRuntime(app, options = {}) {
  const paths = resolveVideoRuntimePaths(app)
  const onProgress = options.onProgress
  const download = options.downloadFile || downloadFile
  const calculateHash = options.hashFile || hashFile
  const unpack = options.extractZip || extractZip
  const run = options.runCommandOutput || runCommandOutput
  await fsp.mkdir(paths.parentDir, { recursive: true })
  await fsp.rm(paths.stagingDir, { recursive: true, force: true })
  await fsp.rm(paths.downloadPath, { force: true })

  try {
    emitInstallProgress(onProgress, 'downloading', 0, 0, '正在下载视频处理运行包。')
    await download(VIDEO_RUNTIME_MANIFEST.url, paths.downloadPath, ({ completed, total }) => {
      emitInstallProgress(onProgress, 'downloading', completed, total, '正在下载视频处理运行包。')
    })

    emitInstallProgress(onProgress, 'verifying', 0, 0, '正在校验运行包。')
    const checksum = await calculateHash(paths.downloadPath)
    if (String(checksum).toLowerCase() !== VIDEO_RUNTIME_MANIFEST.sha256) {
      throw new Error('视频处理运行包 SHA-256 校验失败。')
    }

    emitInstallProgress(onProgress, 'extracting', 0, 0, '正在解压视频处理运行包。')
    await unpack(paths.downloadPath, paths.stagingDir)
    const runtimeRoot = await findExtractedRuntimeRoot(paths.stagingDir)
    const stagedFfmpegPath = path.join(runtimeRoot, 'bin', 'ffmpeg.exe')
    const stagedFfprobePath = path.join(runtimeRoot, 'bin', 'ffprobe.exe')

    emitInstallProgress(onProgress, 'verifying', 0, 0, '正在验证 FFmpeg 和 FFprobe。')
    const [ffmpegCheck, ffprobeCheck] = await Promise.all([
      run(stagedFfmpegPath, ['-version']),
      run(stagedFfprobePath, ['-version']),
    ])
    if (!ffmpegCheck.ok || !ffprobeCheck.ok) {
      throw new Error(ffmpegCheck.output || ffprobeCheck.output || 'FFmpeg 运行验证失败。')
    }

    await fsp.writeFile(
      path.join(runtimeRoot, 'runtime-manifest.json'),
      JSON.stringify({
        version: VIDEO_RUNTIME_MANIFEST.version,
        releaseTag: VIDEO_RUNTIME_MANIFEST.releaseTag,
        assetName: VIDEO_RUNTIME_MANIFEST.assetName,
        sha256: VIDEO_RUNTIME_MANIFEST.sha256,
        installedAt: new Date().toISOString(),
      }, null, 2),
      'utf8',
    )
    await replaceRuntimeAtomically(paths, runtimeRoot)
    emitInstallProgress(onProgress, 'done', 1, 1, '视频处理运行包已安装。')
    return getVideoRuntimeStatus(app)
  } catch (error) {
    emitInstallProgress(onProgress, 'error', 0, 0, error instanceof Error ? error.message : String(error))
    throw error
  } finally {
    await fsp.rm(paths.stagingDir, { recursive: true, force: true })
    await fsp.rm(paths.downloadPath, { force: true })
  }
}

module.exports = {
  VIDEO_RUNTIME_MANIFEST,
  downloadFile,
  extractZip,
  getVideoRuntimeStatus,
  hashFile,
  installVideoRuntime,
  resolveVideoRuntimePaths,
  safeZipEntryPath,
}
