const { app, BrowserWindow, dialog, ipcMain, screen, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const https = require('node:https')
const os = require('node:os')
const path = require('node:path')
const {
  initializeRemoteDatabaseSchema,
  verifyRemoteDatabaseProfile,
} = require('./projectRemoteDatabase.cjs')
const {
  createRemoteProjectRepository,
} = require('./projectRemoteRepository.cjs')
const {
  createLocalProjectRepository,
} = require('./projectLocalRepository.cjs')
const {
  createLocalProjectObjectStorage,
} = require('./projectLocalObjectStorage.cjs')
const {
  deleteKodoObject,
  getKodoObject,
  putKodoObject,
  verifyKodoProfile,
} = require('./projectKodoStorage.cjs')

const allowedPersonalSpaceRoots = new Set()
const projectConnectionProfileFileName = 'project-connection-profiles.json'

function getPackageVersion() {
  try {
    return parseJsonText(fs.readFileSync(resolveAppPath('package.json'), 'utf8')).version || app.getVersion()
  } catch {
    return app.getVersion()
  }
}

function getAppReleaseTag() {
  return 'windows-x64-latest'
}

const appUpdateStatus = {
  appName: 'Game Design Tools',
  currentVersion: app.getVersion(),
  channel: getAppReleaseTag(),
  phase: 'idle',
  checking: false,
  updateAvailable: false,
  updateDownloaded: false,
  latestVersion: '',
  downloadPercent: 0,
  message: '尚未检查更新。',
  error: '',
}

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.allowPrerelease = false
autoUpdater.setFeedURL({
  provider: 'generic',
  url: `https://github.com/jiawen-afk/game-design-tools/releases/download/${appUpdateStatus.channel}`,
})

function resolveAppPath(...parts) {
  return path.join(app.getAppPath(), ...parts)
}

function getAppUpdateStatus() {
  return { ...appUpdateStatus }
}

function broadcastAppUpdateStatus() {
  const status = getAppUpdateStatus()
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('app-update:status', status)
  }
  return status
}

function setAppUpdateStatus(nextStatus) {
  Object.assign(appUpdateStatus, nextStatus)
  return broadcastAppUpdateStatus()
}

function resolveUnpackedPath(...parts) {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', ...parts)
    : resolveAppPath(...parts)
}

function resolveDeploymentScript(fileName) {
  return resolveUnpackedPath('scripts', fileName)
}

function resolveVoxcpmInstallPaths() {
  const localAppData = process.env.LOCALAPPDATA || ''
  const stateDir = path.join(localAppData, 'GameDesignTools', 'VoxCPM')
  const cmdDir = path.join(localAppData, 'GameDesignTools', 'bin')
  return {
    cmdDir,
    stateDir,
    configPath: path.join(stateDir, 'voxcpm-config.json'),
    servicePath: path.join(cmdDir, 'voxcpm-service.ps1'),
  }
}

function resolveProjectConnectionProfilePath() {
  return path.join(app.getPath('userData'), projectConnectionProfileFileName)
}

function resolveProjectLocalDatabasePath() {
  return path.join(app.getPath('userData'), 'project-space.sqlite')
}

function resolveProjectLocalObjectRootPath() {
  return path.join(app.getPath('userData'), 'project-objects')
}

async function readProjectConnectionProfiles() {
  try {
    const parsed = parseJsonText(await fsp.readFile(resolveProjectConnectionProfilePath(), 'utf8'))
    return Array.isArray(parsed?.profiles) ? parsed.profiles : []
  } catch {
    return []
  }
}

async function writeProjectConnectionProfiles(profiles) {
  const profilePath = resolveProjectConnectionProfilePath()
  await fsp.mkdir(path.dirname(profilePath), { recursive: true })
  await fsp.writeFile(profilePath, JSON.stringify({ profiles }, null, 2))
}

function createProfileId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

function normalizeProjectConnectionType(value) {
  return value === 'database' || value === 'qiniu_kodo' ? value : ''
}

function redactProjectProfileInput(input) {
  if (input?.type === 'database') {
    const payload = input.payload || {}
    const provider = payload.provider === 'mysql' ? 'mysql' : 'postgresql'
    const host = String(payload.host || '').trim()
    const port = Number(payload.port || (provider === 'mysql' ? 3306 : 5432))
    const database = String(payload.database || '').trim()
    const username = String(payload.username || '').trim()
    return {
      type: 'database',
      displayName: String(input.displayName || `${provider} ${database || host}`).trim() || '远程数据库',
      redactedSummary: `${username}@${host}:${port}/${database}${payload.ssl ? ' (SSL)' : ''}`,
    }
  }
  if (input?.type === 'qiniu_kodo') {
    const payload = input.payload || {}
    const bucket = String(payload.bucket || '').trim()
    const region = String(payload.region || '').trim()
    const domain = String(payload.domain || '').trim()
    return {
      type: 'qiniu_kodo',
      displayName: String(input.displayName || `Kodo ${bucket}`).trim() || '七牛 Kodo',
      redactedSummary: `${bucket}@${region}${domain ? ` ${domain}` : ''}`,
    }
  }
  throw new Error('项目连接配置类型无效。')
}

function projectProfileSummary(profile) {
  return {
    id: profile.id,
    type: profile.type,
    displayName: profile.displayName,
    redactedSummary: profile.redactedSummary,
    lastVerifiedAt: profile.lastVerifiedAt || null,
  }
}

async function getProjectConnectionProfile(profileId) {
  const profiles = await readProjectConnectionProfiles()
  return profiles.find((profile) => profile.id === profileId) || null
}

async function getRemoteDatabaseRepository(profileId) {
  const profiles = await readProjectConnectionProfiles()
  const databaseProfiles = profiles.filter((profile) => profile.type === 'database')
  const profile = profileId
    ? databaseProfiles.find((item) => item.id === profileId)
    : databaseProfiles.find((item) => item.lastVerifiedAt) || databaseProfiles[0]
  if (!profile) throw new Error('远程数据库配置不存在。')
  return createRemoteProjectRepository(profile)
}

function getLocalProjectRepository() {
  return createLocalProjectRepository(resolveProjectLocalDatabasePath())
}

const upscaylModels = [
  'upscayl-standard-4x',
  'upscayl-lite-4x',
  'high-fidelity-4x',
  'remacri-4x',
  'ultramix-balanced-4x',
  'ultrasharp-4x',
  'digital-art-4x',
]

const upscaylMirrorBaseUrls = [
  'https://gh.llkk.cc/https://raw.githubusercontent.com/upscayl/upscayl/main',
  'https://gh-proxy.com/https://raw.githubusercontent.com/upscayl/upscayl/main',
  'https://raw.githubusercontent.com/upscayl/upscayl/main',
]

function resolveUpscaylRuntimePaths() {
  const localAppData = process.env.LOCALAPPDATA || app.getPath('userData')
  const runtimeDir = path.join(localAppData, 'GameDesignTools', 'UpscaylRuntime')
  return {
    runtimeDir,
    binDir: path.join(runtimeDir, 'bin'),
    modelsDir: path.join(runtimeDir, 'models'),
    manifestPath: path.join(runtimeDir, 'runtime-manifest.json'),
    execPath: path.join(runtimeDir, 'bin', 'upscayl-bin.exe'),
  }
}

function getUpscaylInstallFiles(baseUrl) {
  const base = String(baseUrl || upscaylMirrorBaseUrls[0]).replace(/\/+$/, '')
  return [
    { url: `${base}/resources/win/bin/upscayl-bin.exe`, targetPath: path.join('bin', 'upscayl-bin.exe') },
    { url: `${base}/resources/win/bin/vcomp140.dll`, targetPath: path.join('bin', 'vcomp140.dll') },
    { url: `${base}/resources/win/bin/vcomp140d.dll`, targetPath: path.join('bin', 'vcomp140d.dll') },
    ...upscaylModels.flatMap((model) => [
      { url: `${base}/resources/models/${model}.param`, targetPath: path.join('models', `${model}.param`) },
      { url: `${base}/resources/models/${model}.bin`, targetPath: path.join('models', `${model}.bin`) },
    ]),
  ]
}

async function getUpscaylRuntimeStatus() {
  const paths = resolveUpscaylRuntimePaths()
  const availableModels = []
  for (const model of upscaylModels) {
    if (
      fs.existsSync(path.join(paths.modelsDir, `${model}.param`)) &&
      fs.existsSync(path.join(paths.modelsDir, `${model}.bin`))
    ) {
      availableModels.push(model)
    }
  }
  const installed = fs.existsSync(paths.execPath) && availableModels.length > 0
  return {
    installed,
    path: paths.runtimeDir,
    models: availableModels,
    message: installed ? 'Upscayl 运行包已安装。' : '尚未安装 Upscayl 运行包，普通导出不受影响。',
  }
}

function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume()
        downloadFile(response.headers.location, targetPath).then(resolve, reject)
        return
      }
      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`下载失败 ${response.statusCode}: ${url}`))
        return
      }
      const file = fs.createWriteStream(targetPath)
      response.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
      file.on('error', reject)
    })
    request.on('error', reject)
    request.setTimeout(60000, () => {
      request.destroy(new Error(`下载超时: ${url}`))
    })
  })
}

async function downloadFileWithRetry(url, targetPath, maxAttempts = 3, onAttempt = () => {}) {
  let lastError = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    onAttempt(attempt, maxAttempts)
    try {
      await downloadFile(url, targetPath)
      return
    } catch (error) {
      lastError = error
      await fsp.rm(targetPath, { force: true }).catch(() => {})
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
      }
    }
  }
  throw lastError || new Error(`下载失败: ${url}`)
}

function buildUpscaylArgs({ inputPath, outputPath, modelsPath, format, options }) {
  const model = upscaylModels.includes(options?.model) ? options.model : 'upscayl-standard-4x'
  const scale = [2, 3, 4].includes(Number(options?.scale)) ? String(Number(options.scale)) : '4'
  const tileSize = Number(options?.tileSize) >= 32 ? String(Math.round(Number(options.tileSize))) : ''
  const args = [
    '-i', inputPath,
    '-o', outputPath,
    '-m', modelsPath,
    '-n', model,
    '-f', format === 'jpeg' ? 'jpg' : format,
    '-s', scale,
    '-c', '0',
  ]
  if (tileSize) args.push('-t', tileSize)
  if (options?.ttaMode === true) args.push('-x')
  return args
}

function normalizePath(value) {
  return path.resolve(String(value || ''))
}

function isInside(parent, child) {
  const relative = path.relative(parent, child)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function registerPersonalSpaceRoot(rootPath) {
  const normalized = normalizePath(rootPath)
  allowedPersonalSpaceRoots.add(normalized)
  return normalized
}

function assertAllowedPersonalSpacePath(targetPath) {
  const normalized = normalizePath(targetPath)
  for (const root of allowedPersonalSpaceRoots) {
    if (isInside(root, normalized)) return normalized
  }
  throw new Error('路径未授权，请先在个人空间中选择资源目录。')
}

function assertSafeChildName(name) {
  const value = String(name || '').trim()
  if (!value || value.includes('/') || value.includes('\\') || value === '.' || value === '..') {
    throw new Error('资源名称无效。')
  }
  return value
}

async function directoryExists(targetPath) {
  try {
    return (await fsp.stat(targetPath)).isDirectory()
  } catch {
    return false
  }
}

function runCommandOutput(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true, ...options })
    let output = ''
    child.stdout?.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.stderr?.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.on('error', (error) => resolve({ ok: false, output: error.message }))
    child.on('close', (code) => resolve({ ok: code === 0, output: output.trim() }))
  })
}

function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function getInitialWindowBounds() {
  const workAreaSize = screen.getPrimaryDisplay().workAreaSize
  return {
    width: Math.max(980, Math.min(1280, workAreaSize.width - 48)),
    height: Math.max(640, Math.min(860, workAreaSize.height - 48)),
  }
}

function createWindow() {
  const bounds = getInitialWindowBounds()
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 980,
    minHeight: 640,
    title: 'Game Design Tools',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.removeMenu()
  void win.loadFile(resolveAppPath('dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  if (app.isPackaged) {
    setTimeout(() => {
      void checkForAppUpdates({ silent: true }).catch(() => {})
    }, 5000)
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

autoUpdater.on('checking-for-update', () => {
  setAppUpdateStatus({
    phase: 'checking',
    checking: true,
    error: '',
    message: '正在检查更新...',
  })
})

autoUpdater.on('update-available', (info) => {
  setAppUpdateStatus({
    phase: 'available',
    checking: false,
    updateAvailable: true,
    updateDownloaded: false,
    latestVersion: info?.version || '',
    downloadPercent: 0,
    error: '',
    message: `发现新版本 ${info?.version || ''}，正在下载。`.trim(),
  })
})

autoUpdater.on('update-not-available', (info) => {
  setAppUpdateStatus({
    phase: 'latest',
    checking: false,
    updateAvailable: false,
    updateDownloaded: false,
    latestVersion: info?.version || appUpdateStatus.currentVersion,
    downloadPercent: 0,
    error: '',
    message: '已是最新版本。',
  })
})

autoUpdater.on('download-progress', (progress) => {
  const percent = Math.max(0, Math.min(100, Number(progress?.percent || 0)))
  setAppUpdateStatus({
    phase: 'downloading',
    checking: false,
    updateAvailable: true,
    updateDownloaded: false,
    downloadPercent: Math.round(percent),
    error: '',
    message: '正在下载更新...',
  })
})

autoUpdater.on('update-downloaded', (info) => {
  setAppUpdateStatus({
    phase: 'downloaded',
    checking: false,
    updateAvailable: true,
    updateDownloaded: true,
    latestVersion: info?.version || appUpdateStatus.latestVersion,
    downloadPercent: 100,
    error: '',
    message: '更新已下载，重启后安装。',
  })
})

autoUpdater.on('error', (error) => {
  setAppUpdateStatus({
    phase: 'error',
    checking: false,
    error: error?.message || '更新检查失败。',
    message: error?.message || '更新检查失败。',
  })
})

async function checkForAppUpdates(options = {}) {
  if (!app.isPackaged) {
    return setAppUpdateStatus({
      phase: 'unavailable',
      checking: false,
      error: '',
      message: options.silent ? '开发环境不会自动更新。' : '开发环境不会自动更新，请使用已安装的客户端检查更新。',
    })
  }
  await autoUpdater.checkForUpdates()
  return getAppUpdateStatus()
}

ipcMain.handle('personal-space:select-directory', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择个人空间资源目录',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const selectedPath = registerPersonalSpaceRoot(result.filePaths[0])
  return { name: path.basename(selectedPath), path: selectedPath }
})

ipcMain.handle('personal-space:register-directory', async (_event, rootPath) => {
  const selectedPath = normalizePath(rootPath)
  if (!(await directoryExists(selectedPath))) throw new Error('个人空间资源目录不存在。')
  registerPersonalSpaceRoot(selectedPath)
  return { name: path.basename(selectedPath), path: selectedPath }
})

ipcMain.handle('personal-space:ensure-directory', async (_event, parentPath, name, options = {}) => {
  const parent = assertAllowedPersonalSpacePath(parentPath)
  const target = assertAllowedPersonalSpacePath(path.join(parent, assertSafeChildName(name)))
  if (options.create) await fsp.mkdir(target, { recursive: true })
  if (!(await directoryExists(target))) throw new Error(`目录不存在：${name}`)
  return { name: path.basename(target), path: target }
})

ipcMain.handle('personal-space:get-file', async (_event, parentPath, name, options = {}) => {
  const parent = assertAllowedPersonalSpacePath(parentPath)
  const target = assertAllowedPersonalSpacePath(path.join(parent, assertSafeChildName(name)))
  if (!options.create && !fs.existsSync(target)) throw new Error(`文件不存在：${name}`)
  return { name: path.basename(target), path: target }
})

ipcMain.handle('personal-space:write-file', async (_event, filePath, data) => {
  const target = assertAllowedPersonalSpacePath(filePath)
  await fsp.mkdir(path.dirname(target), { recursive: true })
  await fsp.writeFile(target, Buffer.from(data))
  return true
})

ipcMain.handle('personal-space:read-file', async (_event, filePath) => {
  const target = assertAllowedPersonalSpacePath(filePath)
  const data = await fsp.readFile(target)
  return { name: path.basename(target), data }
})

ipcMain.handle('personal-space:remove-entry', async (_event, parentPath, name) => {
  const parent = assertAllowedPersonalSpacePath(parentPath)
  const target = assertAllowedPersonalSpacePath(path.join(parent, assertSafeChildName(name)))
  await fsp.rm(target, { recursive: true, force: false })
  return true
})

ipcMain.handle('file:save', async (_event, fileName, data) => {
  const safeName = path.basename(String(fileName || 'export.bin'))
  const result = await dialog.showSaveDialog({
    title: '保存导出文件',
    defaultPath: safeName,
  })
  if (result.canceled || !result.filePath) return null
  await fsp.writeFile(result.filePath, Buffer.from(data))
  return { name: path.basename(result.filePath), path: result.filePath }
})

ipcMain.handle('project-profile:list', async (_event, type) => {
  const normalizedType = normalizeProjectConnectionType(type)
  const profiles = await readProjectConnectionProfiles()
  return profiles
    .filter((profile) => !normalizedType || profile.type === normalizedType)
    .map(projectProfileSummary)
})

ipcMain.handle('project-profile:save', async (_event, input = {}) => {
  const profiles = await readProjectConnectionProfiles()
  const redacted = redactProjectProfileInput(input)
  const now = new Date().toISOString()
  const id = String(input.id || createProfileId())
  const nextProfile = {
    id,
    type: redacted.type,
    displayName: redacted.displayName,
    redactedSummary: redacted.redactedSummary,
    encryptedPayload: {
      algorithm: 'placeholder-local-json',
      payload: Buffer.from(JSON.stringify(input.payload || {}), 'utf8').toString('base64'),
    },
    createdAt: profiles.find((profile) => profile.id === id)?.createdAt || now,
    updatedAt: now,
    lastVerifiedAt: null,
  }
  const nextProfiles = profiles.filter((profile) => profile.id !== id)
  nextProfiles.push(nextProfile)
  await writeProjectConnectionProfiles(nextProfiles)
  return projectProfileSummary(nextProfile)
})

ipcMain.handle('project-profile:delete', async (_event, profileId) => {
  const id = String(profileId || '')
  const profiles = await readProjectConnectionProfiles()
  const nextProfiles = profiles.filter((profile) => profile.id !== id)
  await writeProjectConnectionProfiles(nextProfiles)
  return nextProfiles.length !== profiles.length
})

ipcMain.handle('project-profile:verify-database', async (_event, profileId) => {
  const profile = await getProjectConnectionProfile(String(profileId || ''))
  if (!profile || profile.type !== 'database') {
    return { ok: false, message: '远程数据库配置不存在。', lastVerifiedAt: null }
  }
  const result = await verifyRemoteDatabaseProfile(profile)
  if (result.ok) {
    const now = result.lastVerifiedAt || new Date().toISOString()
    const profiles = await readProjectConnectionProfiles()
    await writeProjectConnectionProfiles(profiles.map((item) => (
      item.id === profile.id ? { ...item, lastVerifiedAt: now, updatedAt: now } : item
    )))
  }
  return result
})

ipcMain.handle('project-profile:initialize-database-schema', async (_event, profileId, dialect) => {
  const profile = await getProjectConnectionProfile(String(profileId || ''))
  if (!profile || profile.type !== 'database') {
    return { ok: false, message: '远程数据库配置不存在。', lastVerifiedAt: null }
  }
  if (dialect !== 'postgresql' && dialect !== 'mysql') {
    return { ok: false, message: '初始化表结构仅支持 PostgreSQL 或 MySQL。', lastVerifiedAt: profile.lastVerifiedAt || null }
  }
  return initializeRemoteDatabaseSchema(profile)
})

ipcMain.handle('project-profile:verify-kodo', async (_event, profileId, projectId) => {
  const profile = await getProjectConnectionProfile(String(profileId || ''))
  if (!profile || profile.type !== 'qiniu_kodo') {
    return { ok: false, message: '七牛 Kodo 配置不存在。', lastVerifiedAt: null }
  }
  const result = await verifyKodoProfile(profile, { projectId })
  if (result.ok) {
    const now = result.lastVerifiedAt || new Date().toISOString()
    const profiles = await readProjectConnectionProfiles()
    await writeProjectConnectionProfiles(profiles.map((item) => (
      item.id === profile.id ? { ...item, lastVerifiedAt: now, updatedAt: now } : item
    )))
  }
  return result
})

ipcMain.handle('project-local-repository:initialize', async () => {
  await getLocalProjectRepository().initializeSchema()
  return true
})

ipcMain.handle('project-local-repository:create-project', async (_event, input = {}) => (
  getLocalProjectRepository().createProject(input)
))

ipcMain.handle('project-local-repository:create-remote-project', async (_event, input = {}) => (
  getLocalProjectRepository().createRemoteProject(input)
))

ipcMain.handle('project-local-repository:update-project', async (_event, projectId, input = {}) => (
  getLocalProjectRepository().updateProject(String(projectId || ''), input)
))

ipcMain.handle('project-local-repository:list-projects', async () => (
  getLocalProjectRepository().listProjects()
))

ipcMain.handle('project-local-repository:get-project', async (_event, projectId) => (
  getLocalProjectRepository().getProject(String(projectId || ''))
))

ipcMain.handle('project-local-repository:import-rows', async (_event, rows) => {
  await getLocalProjectRepository().importProjectRows(rows)
  return true
})

ipcMain.handle('project-local-repository:export-rows', async (_event, projectId) => (
  getLocalProjectRepository().exportProjectRows(String(projectId || ''))
))

ipcMain.handle('project-local-repository:list-assets', async (_event, projectId) => (
  getLocalProjectRepository().listAssets(String(projectId || ''))
))

ipcMain.handle('project-local-repository:delete-project', async (_event, projectId) => {
  await getLocalProjectRepository().deleteProject(String(projectId || ''))
  return true
})

ipcMain.handle('project-local-object:put', async (_event, objectKey, data, mimeType) => (
  createLocalProjectObjectStorage(resolveProjectLocalObjectRootPath())
    .putObject(String(objectKey || ''), Buffer.from(data), { mimeType })
))

ipcMain.handle('project-local-object:get', async (_event, objectKey) => (
  createLocalProjectObjectStorage(resolveProjectLocalObjectRootPath())
    .getObject(String(objectKey || ''))
))

ipcMain.handle('project-local-object:delete', async (_event, objectKey) => (
  createLocalProjectObjectStorage(resolveProjectLocalObjectRootPath())
    .deleteObject(String(objectKey || ''))
))

ipcMain.handle('project-remote-repository:create-project', async (_event, input = {}) => {
  const repository = await getRemoteDatabaseRepository(String(input.databaseProfileId || ''))
  return repository.createRemoteProject(input)
})

ipcMain.handle('project-remote-repository:update-project', async (_event, projectId, input = {}, databaseProfileId = '') => {
  const repository = await getRemoteDatabaseRepository(String(databaseProfileId || input.databaseProfileId || ''))
  return repository.updateProject(String(projectId || ''), input)
})

ipcMain.handle('project-remote-repository:list-projects', async (_event, databaseProfileId) => {
  const repository = await getRemoteDatabaseRepository(String(databaseProfileId || ''))
  return repository.listProjects()
})

ipcMain.handle('project-remote-repository:get-project', async (_event, projectId, databaseProfileId) => {
  const repository = await getRemoteDatabaseRepository(String(databaseProfileId || ''))
  return repository.getProject(String(projectId || ''))
})

ipcMain.handle('project-remote-repository:import-rows', async (_event, rows, databaseProfileId) => {
  const repository = await getRemoteDatabaseRepository(String(databaseProfileId || rows?.settings?.remote_database_profile_id || ''))
  await repository.importProjectRows(rows)
  return true
})

ipcMain.handle('project-remote-repository:export-rows', async (_event, projectId, databaseProfileId) => {
  const repository = await getRemoteDatabaseRepository(String(databaseProfileId || ''))
  return repository.exportProjectRows(String(projectId || ''))
})

ipcMain.handle('project-remote-repository:list-assets', async (_event, projectId, databaseProfileId) => {
  const repository = await getRemoteDatabaseRepository(String(databaseProfileId || ''))
  return repository.listAssets(String(projectId || ''))
})

ipcMain.handle('project-remote-repository:delete-project', async (_event, projectId, databaseProfileId) => {
  const repository = await getRemoteDatabaseRepository(String(databaseProfileId || ''))
  await repository.deleteProject(String(projectId || ''))
  return true
})

ipcMain.handle('project-kodo-object:put', async (_event, profileId, objectKey, data, mimeType) => {
  const profile = await getProjectConnectionProfile(String(profileId || ''))
  if (!profile || profile.type !== 'qiniu_kodo') throw new Error('七牛 Kodo 配置不存在。')
  return putKodoObject(profile, String(objectKey || ''), Buffer.from(data), { mimeType })
})

ipcMain.handle('project-kodo-object:get', async (_event, profileId, objectKey) => {
  const profile = await getProjectConnectionProfile(String(profileId || ''))
  if (!profile || profile.type !== 'qiniu_kodo') throw new Error('七牛 Kodo 配置不存在。')
  return getKodoObject(profile, String(objectKey || ''))
})

ipcMain.handle('project-kodo-object:delete', async (_event, profileId, objectKey) => {
  const profile = await getProjectConnectionProfile(String(profileId || ''))
  if (!profile || profile.type !== 'qiniu_kodo') throw new Error('七牛 Kodo 配置不存在。')
  return deleteKodoObject(profile, String(objectKey || ''))
})

ipcMain.handle('app-update:get-status', async () => getAppUpdateStatus())

ipcMain.handle('app-update:check', async () => checkForAppUpdates({ silent: false }))

ipcMain.handle('app-update:install', async () => {
  if (!appUpdateStatus.updateDownloaded) {
    throw new Error('尚未下载可安装的更新。')
  }
  autoUpdater.quitAndInstall(false, true)
  return true
})

ipcMain.handle('upscayl:status', async () => getUpscaylRuntimeStatus())

ipcMain.handle('upscayl:install', async (event, options = {}) => {
  const paths = resolveUpscaylRuntimePaths()
  const mirrorBaseUrl = String(options.mirrorBaseUrl || upscaylMirrorBaseUrls[0])
  const files = getUpscaylInstallFiles(mirrorBaseUrl)
  await fsp.mkdir(paths.binDir, { recursive: true })
  await fsp.mkdir(paths.modelsDir, { recursive: true })

  for (let index = 0; index < files.length; index += 1) {
    const item = files[index]
    const target = path.join(paths.runtimeDir, item.targetPath)
    await fsp.mkdir(path.dirname(target), { recursive: true })
    await downloadFileWithRetry(item.url, target, 3, (attempt, maxAttempts) => {
      event.sender.send('upscayl:install-progress', {
        phase: 'downloading',
        fileName: item.targetPath,
        completed: index,
        total: files.length,
        percent: Math.round((index / files.length) * 100),
        message: `下载 ${item.targetPath}（第 ${attempt}/${maxAttempts} 次）`,
      })
    })
  }

  event.sender.send('upscayl:install-progress', {
    phase: 'verifying',
    fileName: '',
    completed: files.length,
    total: files.length,
    percent: 100,
    message: '校验运行包',
  })
  await fsp.writeFile(paths.manifestPath, JSON.stringify({
    version: 'upscayl-2.15-runtime',
    mirrorBaseUrl,
    installedAt: new Date().toISOString(),
  }, null, 2))
  const status = await getUpscaylRuntimeStatus()
  event.sender.send('upscayl:install-progress', {
    phase: status.installed ? 'done' : 'error',
    fileName: '',
    completed: files.length,
    total: files.length,
    percent: 100,
    message: status.message,
  })
  return status
})

ipcMain.handle('upscayl:upscale', async (_event, options = {}) => {
  const status = await getUpscaylRuntimeStatus()
  if (!status.installed) {
    throw new Error('尚未安装 Upscayl 运行包。')
  }
  const paths = resolveUpscaylRuntimePaths()
  const tempDir = path.join(process.env.LOCALAPPDATA || app.getPath('temp'), 'GameDesignTools', 'Temp', 'ImageProcessing')
  await fsp.mkdir(tempDir, { recursive: true })
  const format = String(options.outputFormat || 'png').toLowerCase()
  const extension = format === 'jpeg' ? 'jpg' : format
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const inputPath = path.join(tempDir, `${stamp}-input.png`)
  const outputPath = path.join(tempDir, `${stamp}-upscaled.${extension}`)
  await fsp.writeFile(inputPath, Buffer.from(options.data))
  const args = buildUpscaylArgs({
    inputPath,
    outputPath,
    modelsPath: paths.modelsDir,
    format,
    options: options.options || {},
  })
  const result = await runCommandOutput(paths.execPath, args, { cwd: paths.binDir })
  if (!result.ok || !fs.existsSync(outputPath)) {
    throw new Error(result.output || '高清化处理失败。')
  }
  const data = await fsp.readFile(outputPath)
  void fsp.rm(inputPath, { force: true }).catch(() => {})
  void fsp.rm(outputPath, { force: true }).catch(() => {})
  return {
    name: `${path.basename(String(options.inputName || 'image'), path.extname(String(options.inputName || 'image')))}-upscaled.${extension}`,
    data,
  }
})

ipcMain.handle('shell:open-path', async (_event, targetPath) => {
  const error = await shell.openPath(normalizePath(targetPath))
  if (error) throw new Error(error)
  return true
})

ipcMain.handle('hardware:detect', async () => {
  const base = {
    platform: process.platform,
    arch: process.arch,
    cpuModel: os.cpus()[0]?.model || 'Unknown CPU',
    cpuCores: os.cpus().length,
    memoryGb: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10,
    nvidiaSmi: '',
  }

  return new Promise((resolve) => {
    const probe = spawn('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], {
      windowsHide: true,
    })
    let stdout = ''
    probe.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8') })
    probe.on('error', () => resolve(base))
    probe.on('close', (code) => resolve({ ...base, nvidiaSmi: code === 0 ? stdout.trim() : '' }))
  })
})

ipcMain.handle('voxcpm:run-setup', async (_event, options = {}) => {
  const scriptPath = resolveDeploymentScript('deploy-voxcpm.ps1')
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`VoxCPM 安装脚本不存在：${scriptPath}`)
  }

  const modelPath = String(options.modelPath || 'D:\\models\\VoxCPM2')
  const model = String(options.model || 'VoxCPM2')
  const source = String(options.source || 'auto')

  return new Promise((resolve, reject) => {
    const child = spawn('cmd.exe', [
      '/c',
      'start',
      'VoxCPM 安装依赖',
      'powershell.exe',
      '-NoExit',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      modelPath,
      model,
      source,
    ], {
      detached: true,
      windowsHide: false,
      stdio: 'ignore',
    })
    let settled = false
    const settle = (handler) => {
      if (settled) return
      settled = true
      handler()
    }
    child.unref()
    child.on('error', (error) => settle(() => reject(new Error(`PowerShell 安装终端启动失败：${error.message}`))))
    child.on('close', (code) => {
      if (code === 0) settle(() => resolve({ started: true, scriptPath }))
      else settle(() => reject(new Error(`PowerShell 安装终端启动失败，退出码：${code}`)))
    })
  })
})

ipcMain.handle('voxcpm:setup-status', async () => {
  const { configPath, servicePath } = resolveVoxcpmInstallPaths()
  const missing = []
  const details = []
  let config = null

  if (fs.existsSync(servicePath)) details.push(`服务管理脚本：${servicePath}`)
  else missing.push(`缺少服务管理脚本：${servicePath}`)

  if (fs.existsSync(configPath)) {
    try {
      config = parseJsonText(await fsp.readFile(configPath, 'utf8'))
      details.push(`安装配置：${configPath}`)
    } catch (error) {
      missing.push(`安装配置无法读取：${error.message}`)
    }
  } else {
    missing.push(`缺少安装配置：${configPath}`)
  }

  const pythonCommand = config?.PythonCommand ? String(config.PythonCommand) : ''
  const repoDir = config?.RepoDir ? String(config.RepoDir) : ''
  if (pythonCommand) {
    if (fs.existsSync(pythonCommand)) details.push(`Python：${pythonCommand}`)
    else missing.push(`Python 解释器不存在：${pythonCommand}`)
  }
  if (repoDir) {
    if (fs.existsSync(repoDir)) details.push(`VoxCPM 仓库：${repoDir}`)
    else missing.push(`VoxCPM 仓库不存在：${repoDir}`)
  }
  if (pythonCommand && fs.existsSync(pythonCommand)) {
    const pythonArgs = config && Array.isArray(config.PythonArgs)
      ? config.PythonArgs.map((item) => String(item)).filter(Boolean)
      : []
    const probe = await runCommandOutput(
      pythonCommand,
      [
        ...pythonArgs,
        '-c',
        'import voxcpm; import torch; print("voxcpm ok"); print("torch ok")',
      ],
      repoDir && fs.existsSync(repoDir) ? { cwd: repoDir } : {},
    )
    if (probe.ok) details.push(`Python 依赖：${probe.output || 'voxcpm ok, torch ok'}`)
    else missing.push(`Python 依赖不可用：${probe.output || 'import voxcpm / import torch 失败'}`)
  }

  if (missing.length === 0) {
    return { ok: true, output: ['VoxCPM 依赖已安装。', ...details].join('\n') }
  }
  return { ok: false, output: ['尚未完成 VoxCPM 依赖安装。', ...missing, ...details].join('\n') }
})

ipcMain.handle('voxcpm:service', async (_event, action = 'status') => {
  const allowedActions = new Set(['start', 'stop', 'restart', 'status'])
  const nextAction = allowedActions.has(action) ? action : 'status'
  const { servicePath } = resolveVoxcpmInstallPaths()
  if (!fs.existsSync(servicePath)) {
    return { ok: false, output: '尚未安装 VoxCPM 服务管理命令，请先安装依赖。' }
  }

  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', servicePath, nextAction], {
      windowsHide: true,
    })
    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.stderr.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.on('error', (error) => resolve({ ok: false, output: error.message }))
    child.on('close', (code) => resolve({ ok: code === 0, output: output.trim() }))
  })
})
