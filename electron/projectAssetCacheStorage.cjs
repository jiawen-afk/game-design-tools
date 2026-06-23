const fsp = require('node:fs/promises')
const path = require('node:path')

function normalizeCachePart(value, label) {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error(`${label}不能为空。`)
  const parts = normalized.replace(/\\/g, '/').split('/').filter(Boolean)
  if (parts.length !== 1 || parts.some((part) => part === '.' || part === '..')) {
    throw new Error(`${label}不能包含相对路径。`)
  }
  return parts[0]
}

function normalizeRole(role) {
  const normalized = normalizeCachePart(role, '资源角色')
  if (normalized !== 'primary' && normalized !== 'sprite_index') throw new Error('资源角色不合法。')
  return normalized
}

function resolveProjectCacheRootPath(rootPath, projectId) {
  const root = path.resolve(String(rootPath || ''))
  if (!root) throw new Error('资产缓存根目录不能为空。')
  const target = path.resolve(root, normalizeCachePart(projectId, '项目 ID'))
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`
  if (target !== root && !target.startsWith(rootPrefix)) throw new Error('项目缓存路径超出资产缓存根目录。')
  return target
}

function resolveProjectAssetCachePath(rootPath, ref) {
  const projectRoot = resolveProjectCacheRootPath(rootPath, ref.projectId)
  const target = path.resolve(
    projectRoot,
    normalizeRole(ref.role),
    normalizeCachePart(ref.resourceId, '资源 ID'),
  )
  const projectRootPrefix = projectRoot.endsWith(path.sep) ? projectRoot : `${projectRoot}${path.sep}`
  if (target !== projectRoot && !target.startsWith(projectRootPrefix)) throw new Error('资源缓存路径超出项目缓存目录。')
  return target
}

function dataPathForCachePath(cachePath) {
  return path.join(cachePath, 'data')
}

function metaPathForCachePath(cachePath) {
  return path.join(cachePath, 'meta.json')
}

class ProjectAssetCacheStorage {
  constructor(rootPath) {
    this.rootPath = rootPath
  }

  async getCachedResource(ref, expectedFingerprint) {
    const cachePath = resolveProjectAssetCachePath(this.rootPath, ref)
    let meta
    try {
      meta = JSON.parse(await fsp.readFile(metaPathForCachePath(cachePath), 'utf8'))
    } catch (error) {
      if (error?.code === 'ENOENT') return null
      throw error
    }
    if (String(meta.objectKey || '') !== String(ref.objectKey || '')) return null
    if (String(meta.fingerprint || '') !== String(expectedFingerprint || '')) return null
    let data
    try {
      data = await fsp.readFile(dataPathForCachePath(cachePath))
    } catch (error) {
      if (error?.code === 'ENOENT') return null
      throw error
    }
    await this.writeMeta(cachePath, {
      ...meta,
      lastAccessedAt: new Date().toISOString(),
    })
    return {
      data,
      mimeType: String(meta.mimeType || ref.mimeType || 'application/octet-stream'),
    }
  }

  async putCachedResource(ref, fingerprint, data, options = {}) {
    const cachePath = resolveProjectAssetCachePath(this.rootPath, ref)
    await fsp.mkdir(cachePath, { recursive: true })
    await fsp.writeFile(dataPathForCachePath(cachePath), Buffer.from(data))
    const now = new Date().toISOString()
    await this.writeMeta(cachePath, {
      projectId: String(ref.projectId || ''),
      objectKey: String(ref.objectKey || ''),
      resourceRole: String(ref.role || ''),
      resourceId: String(ref.resourceId || ''),
      mimeType: String(options.mimeType || ref.mimeType || 'application/octet-stream'),
      sizeBytes: typeof ref.sizeBytes === 'number' ? ref.sizeBytes : null,
      hashSha256: ref.hashSha256 || null,
      fingerprint: String(fingerprint || ''),
      cachedAt: now,
      lastAccessedAt: now,
    })
    return true
  }

  async deleteCachedResource(ref) {
    const cachePath = resolveProjectAssetCachePath(this.rootPath, ref)
    await fsp.rm(cachePath, { recursive: true, force: true })
    return true
  }

  async deleteProjectCache(projectId) {
    const projectRoot = resolveProjectCacheRootPath(this.rootPath, projectId)
    await fsp.rm(projectRoot, { recursive: true, force: true })
    return true
  }

  async writeMeta(cachePath, meta) {
    await fsp.writeFile(metaPathForCachePath(cachePath), JSON.stringify(meta, null, 2))
  }
}

function createProjectAssetCacheStorage(rootPath) {
  return new ProjectAssetCacheStorage(rootPath)
}

module.exports = {
  ProjectAssetCacheStorage,
  createProjectAssetCacheStorage,
  resolveProjectAssetCachePath,
  resolveProjectCacheRootPath,
}
