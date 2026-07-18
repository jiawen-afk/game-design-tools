const fs = require('node:fs')
const fsp = require('node:fs/promises')
const https = require('node:https')
const path = require('node:path')

const upscaylModels = [
  'upscayl-standard-4x',
  'upscayl-lite-4x',
  'high-fidelity-4x',
  'remacri-4x',
  'ultramix-balanced-4x',
  'ultrasharp-4x',
  'digital-art-4x',
]

const upscaylGpuIds = ['auto', '0', '1', '2']
const upscaylThreadProfileArgs = {
  balanced: '1:2:2',
  'low-memory': '1:1:1',
  throughput: '2:2:2',
}

const upscaylMirrorBaseUrls = [
  'https://gh.llkk.cc/https://raw.githubusercontent.com/upscayl/upscayl/main',
  'https://gh-proxy.com/https://raw.githubusercontent.com/upscayl/upscayl/main',
  'https://raw.githubusercontent.com/upscayl/upscayl/main',
]

function resolveUpscaylRuntimePaths(app) {
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

async function getUpscaylRuntimeStatus(app) {
  const paths = resolveUpscaylRuntimePaths(app)
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
  const gpuId = upscaylGpuIds.includes(String(options?.gpuId)) ? String(options.gpuId) : '0'
  const threadArgs = upscaylThreadProfileArgs[String(options?.threadProfile)] || upscaylThreadProfileArgs.balanced
  const args = [
    '-i', inputPath,
    '-o', outputPath,
    '-m', modelsPath,
    '-n', model,
    '-f', format === 'jpeg' ? 'jpg' : format,
    '-s', scale,
    '-c', '0',
  ]
  if (gpuId !== 'auto') args.push('-g', gpuId)
  args.push('-j', threadArgs)
  if (tileSize) args.push('-t', tileSize)
  if (options?.ttaMode === true) args.push('-x')
  return args
}

function registerUpscaylIpcHandlers({ app, ipcMain, runCommandOutput }) {
  ipcMain.handle('upscayl:status', async () => getUpscaylRuntimeStatus(app))

  ipcMain.handle('upscayl:install', async (event, options = {}) => {
    const paths = resolveUpscaylRuntimePaths(app)
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
    const status = await getUpscaylRuntimeStatus(app)
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
    const status = await getUpscaylRuntimeStatus(app)
    if (!status.installed) {
      throw new Error('尚未安装 Upscayl 运行包。')
    }
    const paths = resolveUpscaylRuntimePaths(app)
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
}

module.exports = {
  buildUpscaylArgs,
  downloadFileWithRetry,
  getUpscaylRuntimeStatus,
  registerUpscaylIpcHandlers,
  resolveUpscaylRuntimePaths,
  upscaylGpuIds,
  upscaylModels,
}
