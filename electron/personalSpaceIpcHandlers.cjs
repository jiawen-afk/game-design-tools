const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

const allowedPersonalSpaceRoots = new Set()

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
  throw new Error('路径未授权，请先在项目空间中选择资源目录。')
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

function registerPersonalSpaceIpcHandlers({ dialog, ipcMain }) {
  ipcMain.handle('personal-space:select-directory', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择项目空间资源目录',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const selectedPath = registerPersonalSpaceRoot(result.filePaths[0])
    return { name: path.basename(selectedPath), path: selectedPath }
  })

  ipcMain.handle('personal-space:register-directory', async (_event, rootPath) => {
    const selectedPath = normalizePath(rootPath)
    if (!(await directoryExists(selectedPath))) throw new Error('项目空间资源目录不存在。')
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
}

module.exports = {
  assertAllowedPersonalSpacePath,
  registerPersonalSpaceIpcHandlers,
  registerPersonalSpaceRoot,
}
