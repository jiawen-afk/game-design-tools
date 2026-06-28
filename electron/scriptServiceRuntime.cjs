const { spawn: defaultSpawn } = require('node:child_process')

const allowedServiceActions = new Set(['start', 'stop', 'restart', 'status'])

function normalizeServiceAction(action) {
  return allowedServiceActions.has(action) ? action : 'status'
}

function launchSetupTerminal({ args = [], scriptPath, spawn = defaultSpawn, title }) {
  return new Promise((resolve, reject) => {
    const child = spawn('cmd.exe', [
      '/c',
      'start',
      title,
      'powershell.exe',
      '-NoExit',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      ...args,
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
}

function runServiceCommand({ action = 'status', servicePath, spawn = defaultSpawn }) {
  const nextAction = normalizeServiceAction(action)
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
}

module.exports = {
  launchSetupTerminal,
  normalizeServiceAction,
  runServiceCommand,
}
