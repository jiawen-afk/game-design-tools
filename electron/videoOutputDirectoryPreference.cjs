const fsp = require('node:fs/promises')
const path = require('node:path')

const preferenceFileName = 'video-output-directory.json'

function resolveVideoOutputDirectoryPreferencePath(app) {
  return path.join(path.resolve(app.getPath('userData')), preferenceFileName)
}

async function resolveDirectoryInfo(directoryPath) {
  if (typeof directoryPath !== 'string' || !directoryPath.trim()) {
    throw new Error('视频输出目录无效。')
  }
  const resolved = path.resolve(directoryPath)
  const stats = await fsp.stat(resolved)
  if (!stats.isDirectory()) throw new Error('视频输出路径不是目录。')
  return { name: path.basename(resolved), path: resolved }
}

async function clearVideoOutputDirectoryPreference(preferencePath) {
  try {
    await fsp.rm(preferencePath, { force: true })
  } catch {}
}

async function loadVideoOutputDirectoryPreference(app) {
  const preferencePath = resolveVideoOutputDirectoryPreferencePath(app)
  let source
  try {
    source = await fsp.readFile(preferencePath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    await clearVideoOutputDirectoryPreference(preferencePath)
    return null
  }

  try {
    const stored = JSON.parse(source)
    if (stored?.version !== 1) throw new Error('视频输出目录偏好版本无效。')
    return await resolveDirectoryInfo(stored.outputDirectory)
  } catch {
    await clearVideoOutputDirectoryPreference(preferencePath)
    return null
  }
}

async function saveVideoOutputDirectoryPreference(app, directoryPath) {
  const directory = await resolveDirectoryInfo(directoryPath)
  const preferencePath = resolveVideoOutputDirectoryPreferencePath(app)
  const temporaryPath = `${preferencePath}.${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`
  await fsp.mkdir(path.dirname(preferencePath), { recursive: true })
  try {
    await fsp.writeFile(temporaryPath, `${JSON.stringify({
      version: 1,
      outputDirectory: directory.path,
    }, null, 2)}\n`, 'utf8')
    await fsp.rename(temporaryPath, preferencePath)
  } finally {
    await fsp.rm(temporaryPath, { force: true })
  }
  return directory
}

function createVideoOutputDirectorySession(app) {
  const selectedOutputDirectories = new Set()
  let currentDirectory = null
  const restorationPromise = loadVideoOutputDirectoryPreference(app).then((directory) => {
    if (directory) {
      currentDirectory = directory
      selectedOutputDirectories.add(directory.path)
    }
  })

  async function restore() {
    await restorationPromise
    return currentDirectory
  }

  async function remember(directoryPath) {
    await restorationPromise
    const directory = await saveVideoOutputDirectoryPreference(app, directoryPath)
    currentDirectory = directory
    selectedOutputDirectories.add(directory.path)
    return directory
  }

  return {
    get: () => currentDirectory,
    remember,
    restore,
    selectedOutputDirectories,
  }
}

module.exports = {
  createVideoOutputDirectorySession,
  loadVideoOutputDirectoryPreference,
  resolveVideoOutputDirectoryPreferencePath,
  saveVideoOutputDirectoryPreference,
}
