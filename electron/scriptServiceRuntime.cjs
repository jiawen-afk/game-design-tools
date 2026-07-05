const { spawn: defaultSpawn } = require('node:child_process')

const allowedServiceActions = new Set(['start', 'stop', 'restart', 'status'])
const defaultServiceCommandTimeoutMs = 45000

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

function runServiceCommand({
  action = 'status',
  servicePath,
  spawn = defaultSpawn,
  timeoutMs = defaultServiceCommandTimeoutMs,
}) {
  const nextAction = normalizeServiceAction(action)
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', servicePath, nextAction], {
      windowsHide: true,
    })
    let output = ''
    let settled = false
    const timeout = setTimeout(() => {
      const timeoutOutput = [
        output.trim(),
        `服务命令执行超时（${nextAction}，超过 ${Math.round(timeoutMs / 1000)} 秒）。`,
        '命令可能仍在后台清理或加载，请稍后点击“检测服务”确认状态。',
      ].filter(Boolean).join('\n')
      try { child.kill?.() } catch {}
      settle({ ok: false, output: timeoutOutput })
    }, timeoutMs)
    timeout.unref?.()

    const settle = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve(result)
    }

    child.stdout.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.stderr.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.on('error', (error) => settle({ ok: false, output: error.message }))
    child.on('close', (code) => settle({ ok: code === 0, output: output.trim() }))
  })
}

module.exports = {
  launchSetupTerminal,
  normalizeServiceAction,
  runServiceCommand,
}
