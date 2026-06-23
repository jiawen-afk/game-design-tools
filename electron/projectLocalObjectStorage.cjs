const fsp = require('node:fs/promises')
const path = require('node:path')

function normalizeObjectKey(objectKey) {
  const parts = String(objectKey || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
  if (parts.length === 0) throw new Error('对象 Key 不能为空。')
  if (parts.some((part) => part === '.' || part === '..')) throw new Error('对象 Key 不能包含相对路径。')
  return parts
}

function resolveObjectPath(rootPath, objectKey) {
  const root = path.resolve(String(rootPath || ''))
  if (!root) throw new Error('本地对象存储根目录不能为空。')
  const target = path.resolve(root, ...normalizeObjectKey(objectKey))
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`
  if (target !== root && !target.startsWith(rootPrefix)) throw new Error('对象 Key 超出本地对象存储根目录。')
  return target
}

function metaPathForObjectPath(objectPath) {
  return `${objectPath}.meta.json`
}

class LocalProjectObjectStorage {
  constructor(rootPath) {
    this.rootPath = rootPath
  }

  async putObject(objectKey, data, options = {}) {
    const target = resolveObjectPath(this.rootPath, objectKey)
    await fsp.mkdir(path.dirname(target), { recursive: true })
    await fsp.writeFile(target, Buffer.from(data))
    await fsp.writeFile(metaPathForObjectPath(target), JSON.stringify({
      mimeType: String(options.mimeType || 'application/octet-stream'),
    }, null, 2))
    return true
  }

  async getObject(objectKey) {
    const target = resolveObjectPath(this.rootPath, objectKey)
    let data
    try {
      data = await fsp.readFile(target)
    } catch (error) {
      if (error?.code === 'ENOENT') throw new Error(`对象不存在：${objectKey}`)
      throw error
    }
    let mimeType = 'application/octet-stream'
    try {
      const parsed = JSON.parse(await fsp.readFile(metaPathForObjectPath(target), 'utf8'))
      mimeType = String(parsed?.mimeType || mimeType)
    } catch {}
    return { data, mimeType }
  }

  async deleteObject(objectKey) {
    const target = resolveObjectPath(this.rootPath, objectKey)
    await fsp.rm(target, { force: true })
    await fsp.rm(metaPathForObjectPath(target), { force: true })
    return true
  }
}

function createLocalProjectObjectStorage(rootPath) {
  return new LocalProjectObjectStorage(rootPath)
}

module.exports = {
  LocalProjectObjectStorage,
  createLocalProjectObjectStorage,
  resolveObjectPath,
}
