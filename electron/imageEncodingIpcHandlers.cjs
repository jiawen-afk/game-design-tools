const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

const encoderRuntimeNames = {
  'cwebp-lossless': process.platform === 'win32' ? 'cwebp.exe' : 'cwebp',
  oxipng: process.platform === 'win32' ? 'oxipng.exe' : 'oxipng',
}

function resolveImageEncoderPath(resolveUnpackedPath, encoder) {
  const runtimeName = encoderRuntimeNames[encoder]
  if (!runtimeName) throw new Error(`不支持的图片编码器：${encoder}`)
  return resolveUnpackedPath('scripts', 'image-encoders', `${process.platform}-${process.arch}`, runtimeName)
}

function encodedName(inputName, extension) {
  const baseName = path.basename(String(inputName || 'image'), path.extname(String(inputName || 'image'))) || 'image'
  return `${baseName}.${extension}`
}

function assertBundledEncoder(resolveUnpackedPath, encoder) {
  const encoderPath = resolveImageEncoderPath(resolveUnpackedPath, encoder)
  if (!fs.existsSync(encoderPath)) {
    throw new Error(`缺少内置图片编码器 ${path.basename(encoderPath)}，请重新构建或安装完整桌面版本。`)
  }
  return encoderPath
}

function buildEncoderCommand({ encoderPath, encoder, inputPath, outputPath }) {
  if (encoder === 'cwebp-lossless') {
    return {
      command: encoderPath,
      args: [inputPath, '-lossless', '-exact', '-alpha_q', '100', '-m', '6', '-o', outputPath],
      cwd: path.dirname(encoderPath),
    }
  }
  if (encoder === 'oxipng') {
    return {
      command: encoderPath,
      args: ['-o', '4', '--strip', 'safe', '--out', outputPath, inputPath],
      cwd: path.dirname(encoderPath),
    }
  }
  throw new Error(`不支持的图片编码器：${encoder}`)
}

function registerImageEncodingIpcHandlers({ app, ipcMain, resolveUnpackedPath, runCommandOutput }) {
  ipcMain.handle('image-encoding:encode', async (_event, options = {}) => {
    const encoder = String(options.encoder || '')
    const encoderPath = assertBundledEncoder(resolveUnpackedPath, encoder)
    const tempDir = path.join(process.env.LOCALAPPDATA || app.getPath('temp'), 'GameDesignTools', 'Temp', 'ImageEncoding')
    await fsp.mkdir(tempDir, { recursive: true })
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const inputPath = path.join(tempDir, `${stamp}-input.png`)
    const outputExtension = encoder === 'cwebp-lossless' ? 'webp' : 'png'
    const mimeType = encoder === 'cwebp-lossless' ? 'image/webp' : 'image/png'
    const outputPath = path.join(tempDir, `${stamp}-encoded.${outputExtension}`)
    await fsp.writeFile(inputPath, Buffer.from(options.data))
    const command = buildEncoderCommand({ encoderPath, encoder, inputPath, outputPath })
    const result = await runCommandOutput(command.command, command.args, { cwd: command.cwd })
    if (!result.ok || !fs.existsSync(outputPath)) {
      throw new Error(result.output || '图片编码失败。')
    }
    const data = await fsp.readFile(outputPath)
    void fsp.rm(inputPath, { force: true }).catch(() => {})
    void fsp.rm(outputPath, { force: true }).catch(() => {})
    return {
      name: encodedName(options.inputName, outputExtension),
      mimeType,
      data,
    }
  })
}

module.exports = {
  buildEncoderCommand,
  registerImageEncodingIpcHandlers,
  resolveImageEncoderPath,
}
