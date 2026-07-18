const { spawn } = require('node:child_process')

function runCommandOutput(command, args, options = {}, spawnProcess = spawn) {
  return new Promise((resolve) => {
    let child
    try {
      child = spawnProcess(command, args, { windowsHide: true, ...options })
    } catch (error) {
      resolve({ ok: false, output: error instanceof Error ? error.message : String(error) })
      return
    }
    let output = ''
    let processError = ''
    child.stdout?.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.stderr?.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.on('error', (error) => { processError = error.message })
    child.on('close', (code) => resolve({
      ok: code === 0 && !processError,
      output: output.trim() || processError,
    }))
  })
}

module.exports = { runCommandOutput }
