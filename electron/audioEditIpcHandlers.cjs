const fsp = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const audioMimeTypes = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
}

function audioEditOutputDir(app) {
  return path.join(process.env.LOCALAPPDATA || app.getPath('userData'), 'GameDesignTools', 'AudioEdits')
}

function sanitizeAudioEditFileName(fileName) {
  const rawName = String(fileName || 'audio-clip.wav')
  const baseName = path.basename(rawName, path.extname(rawName))
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${baseName || 'audio-clip'}.wav`
}

function assertAudioFilePath(filePath) {
  const targetPath = path.resolve(String(filePath || ''))
  const extension = path.extname(targetPath).toLowerCase()
  if (!audioMimeTypes[extension]) {
    throw new Error('只允许读取常见音频文件。')
  }
  return {
    targetPath,
    mimeType: audioMimeTypes[extension],
  }
}

function registerAudioEditIpcHandlers({ app, dialog, ipcMain }) {
  ipcMain.handle('audio-edit:save', async (_event, options = {}) => {
    const outputDir = audioEditOutputDir(app)
    await fsp.mkdir(outputDir, { recursive: true })
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const safeName = sanitizeAudioEditFileName(options.fileName)
    const outputPath = path.join(outputDir, `${stamp}-${safeName}`)
    await fsp.writeFile(outputPath, Buffer.from(options.data))
    return {
      fileName: path.basename(outputPath),
      audioUrl: pathToFileURL(outputPath).toString(),
      audioPath: outputPath,
    }
  })

  ipcMain.handle('audio-edit:read-file', async (_event, filePath) => {
    const { targetPath, mimeType } = assertAudioFilePath(filePath)
    const data = await fsp.readFile(targetPath)
    return {
      name: path.basename(targetPath),
      data,
      mimeType,
    }
  })

  ipcMain.handle('audio-edit:export-as', async (_event, options = {}) => {
    if (!dialog?.showSaveDialog) throw new Error('当前桌面运行时不可用，无法导出剪辑音频。')
    const safeName = sanitizeAudioEditFileName(options.fileName)
    const result = await dialog.showSaveDialog({
      title: '导出新音频',
      defaultPath: safeName,
      filters: [{ name: 'WAV 音频', extensions: ['wav'] }],
    })
    if (result.canceled || !result.filePath) return null
    const outputPath = path.resolve(result.filePath)
    await fsp.mkdir(path.dirname(outputPath), { recursive: true })
    await fsp.writeFile(outputPath, Buffer.from(options.data))
    return {
      fileName: path.basename(outputPath),
      audioUrl: pathToFileURL(outputPath).toString(),
      audioPath: outputPath,
    }
  })
}

module.exports = {
  audioEditOutputDir,
  registerAudioEditIpcHandlers,
  sanitizeAudioEditFileName,
}
