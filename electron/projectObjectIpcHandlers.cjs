const {
  createLocalProjectObjectStorage,
} = require('./projectLocalObjectStorage.cjs')
const {
  createProjectAssetCacheStorage,
} = require('./projectAssetCacheStorage.cjs')
const {
  deleteKodoObject,
  getKodoObject,
  putKodoObject,
} = require('./projectKodoStorage.cjs')
const {
  getProjectConnectionProfile,
  resolveProjectAssetCacheRootPath,
  resolveProjectLocalObjectRootPath,
} = require('./projectStorageIpcContext.cjs')

function registerProjectObjectIpcHandlers({ app, ipcMain }) {
  ipcMain.handle('project-local-object:put', async (_event, objectKey, data, mimeType) => (
    createLocalProjectObjectStorage(resolveProjectLocalObjectRootPath(app))
      .putObject(String(objectKey || ''), Buffer.from(data), { mimeType })
  ))

  ipcMain.handle('project-local-object:get', async (_event, objectKey) => (
    createLocalProjectObjectStorage(resolveProjectLocalObjectRootPath(app))
      .getObject(String(objectKey || ''))
  ))

  ipcMain.handle('project-local-object:delete', async (_event, objectKey) => (
    createLocalProjectObjectStorage(resolveProjectLocalObjectRootPath(app))
      .deleteObject(String(objectKey || ''))
  ))

  ipcMain.handle('project-asset-cache:get', async (_event, ref, expectedFingerprint) => (
    createProjectAssetCacheStorage(resolveProjectAssetCacheRootPath(app))
      .getCachedResource(ref || {}, String(expectedFingerprint || ''))
  ))

  ipcMain.handle('project-asset-cache:put', async (_event, ref, fingerprint, data, mimeType) => (
    createProjectAssetCacheStorage(resolveProjectAssetCacheRootPath(app))
      .putCachedResource(ref || {}, String(fingerprint || ''), Buffer.from(data), { mimeType })
  ))

  ipcMain.handle('project-asset-cache:delete-resource', async (_event, ref) => (
    createProjectAssetCacheStorage(resolveProjectAssetCacheRootPath(app))
      .deleteCachedResource(ref || {})
  ))

  ipcMain.handle('project-asset-cache:delete-project', async (_event, projectId) => (
    createProjectAssetCacheStorage(resolveProjectAssetCacheRootPath(app))
      .deleteProjectCache(String(projectId || ''))
  ))

  ipcMain.handle('project-kodo-object:put', async (_event, profileId, objectKey, data, mimeType) => {
    const profile = await getProjectConnectionProfile(app, String(profileId || ''))
    if (!profile || profile.type !== 'qiniu_kodo') throw new Error('七牛 Kodo 配置不存在。')
    return putKodoObject(profile, String(objectKey || ''), Buffer.from(data), { mimeType })
  })

  ipcMain.handle('project-kodo-object:get', async (_event, profileId, objectKey) => {
    const profile = await getProjectConnectionProfile(app, String(profileId || ''))
    if (!profile || profile.type !== 'qiniu_kodo') throw new Error('七牛 Kodo 配置不存在。')
    return getKodoObject(profile, String(objectKey || ''))
  })

  ipcMain.handle('project-kodo-object:delete', async (_event, profileId, objectKey) => {
    const profile = await getProjectConnectionProfile(app, String(profileId || ''))
    if (!profile || profile.type !== 'qiniu_kodo') throw new Error('七牛 Kodo 配置不存在。')
    return deleteKodoObject(profile, String(objectKey || ''))
  })
}

module.exports = {
  registerProjectObjectIpcHandlers,
}
