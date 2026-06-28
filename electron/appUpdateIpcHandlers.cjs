const fs = require('node:fs')
const { autoUpdater } = require('electron-updater')

function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function getAppReleaseTag() {
  return 'windows-x64-latest'
}

function registerAppUpdateIpcHandlers({ app, BrowserWindow, ipcMain, resolveAppPath }) {
  function getPackageVersion() {
    try {
      return parseJsonText(fs.readFileSync(resolveAppPath('package.json'), 'utf8')).version || app.getVersion()
    } catch {
      return app.getVersion()
    }
  }

  const appUpdateStatus = {
    appName: 'Game Design Tools',
    currentVersion: getPackageVersion(),
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

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: `https://github.com/jiawen-afk/game-design-tools/releases/download/${appUpdateStatus.channel}`,
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

  ipcMain.handle('app-update:get-status', async () => getAppUpdateStatus())

  ipcMain.handle('app-update:check', async () => checkForAppUpdates({ silent: false }))

  ipcMain.handle('app-update:install', async () => {
    if (!appUpdateStatus.updateDownloaded) {
      throw new Error('尚未下载可安装的更新。')
    }
    autoUpdater.quitAndInstall(false, true)
    return true
  })

  return {
    checkForAppUpdates,
    getAppUpdateStatus,
  }
}

module.exports = {
  registerAppUpdateIpcHandlers,
}
