const path = require('node:path')

const {
  initializeRemoteDatabaseSchema,
  verifyRemoteDatabaseProfile,
} = require('./projectRemoteDatabase.cjs')
const {
  createRemoteProjectRepository,
} = require('./projectRemoteRepository.cjs')
const {
  createLocalProjectRepository,
} = require('./projectLocalRepository.cjs')
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
  verifyKodoProfile,
} = require('./projectKodoStorage.cjs')
const {
  mergeProjectProfilePayload,
} = require('./projectConnectionProfiles.cjs')
const {
  createProjectConnectionProfileStore,
} = require('./projectConnectionProfileStore.cjs')

const projectConnectionProfileFileName = 'project-connection-profiles.json'

function resolveProjectConnectionProfilePath(app) {
  return path.join(app.getPath('userData'), projectConnectionProfileFileName)
}

function resolveProjectLocalDatabasePath(app) {
  return path.join(app.getPath('userData'), 'project-space.sqlite')
}

function resolveProjectLocalObjectRootPath(app) {
  return path.join(app.getPath('userData'), 'project-objects')
}

function resolveProjectAssetCacheRootPath(app) {
  return path.join(app.getPath('userData'), 'project-asset-cache')
}

function getProjectConnectionProfileStore(app) {
  return createProjectConnectionProfileStore(resolveProjectConnectionProfilePath(app))
}

async function getProjectConnectionProfile(app, profileId) {
  return getProjectConnectionProfileStore(app).get(profileId)
}

async function getRemoteDatabaseRepository(app, profileId) {
  if (!String(profileId || '').trim()) throw new Error('远程数据库配置不存在。')
  const profiles = await getProjectConnectionProfileStore(app).readRawProfiles()
  const databaseProfiles = profiles.filter((profile) => profile.type === 'database')
  const profile = databaseProfiles.find((item) => item.id === profileId)
  if (!profile) throw new Error('远程数据库配置不存在。')
  return createRemoteProjectRepository(profile)
}

function getLocalProjectRepository(app) {
  return createLocalProjectRepository(resolveProjectLocalDatabasePath(app))
}

function registerProjectStorageIpcHandlers({ app, ipcMain }) {
  ipcMain.handle('project-profile:list', async (_event, type) => {
    return getProjectConnectionProfileStore(app).list(type)
  })

  ipcMain.handle('project-profile:get', async (_event, profileId) => (
    getProjectConnectionProfileStore(app).editable(String(profileId || ''))
  ))

  ipcMain.handle('project-profile:save', async (_event, input = {}) => {
    return getProjectConnectionProfileStore(app).save(input)
  })

  ipcMain.handle('project-profile:delete', async (_event, profileId) => {
    return getProjectConnectionProfileStore(app).delete(String(profileId || ''))
  })

  ipcMain.handle('project-profile:verify-database', async (_event, profileId) => {
    const profile = await getProjectConnectionProfile(app, String(profileId || ''))
    if (!profile || profile.type !== 'database') {
      return { ok: false, message: '远程数据库配置不存在。', lastVerifiedAt: null }
    }
    const result = await verifyRemoteDatabaseProfile(profile)
    if (result.ok) {
      const now = result.lastVerifiedAt || new Date().toISOString()
      await getProjectConnectionProfileStore(app).markVerified(profile.id, now)
    }
    return result
  })

  ipcMain.handle('project-profile:verify-database-draft', async (_event, input = {}, profileId = '') => {
    const existingProfile = profileId ? await getProjectConnectionProfile(app, String(profileId || '')) : null
    const payload = mergeProjectProfilePayload({ type: 'database', payload: input }, existingProfile)
    const profile = {
      id: 'draft',
      type: 'database',
      lastVerifiedAt: null,
      encryptedPayload: {
        payload: Buffer.from(JSON.stringify(payload || {}), 'utf8').toString('base64'),
      },
    }
    return verifyRemoteDatabaseProfile(profile)
  })

  ipcMain.handle('project-profile:initialize-database-schema', async (_event, profileId, dialect) => {
    const profile = await getProjectConnectionProfile(app, String(profileId || ''))
    if (!profile || profile.type !== 'database') {
      return { ok: false, message: '远程数据库配置不存在。', lastVerifiedAt: null }
    }
    if (dialect !== 'postgresql' && dialect !== 'mysql') {
      return { ok: false, message: '初始化表结构仅支持 PostgreSQL 或 MySQL。', lastVerifiedAt: profile.lastVerifiedAt || null }
    }
    const result = await initializeRemoteDatabaseSchema(profile)
    if (result.ok) {
      const now = result.lastVerifiedAt || new Date().toISOString()
      await getProjectConnectionProfileStore(app).markSchemaInitialized(profile.id, now)
    }
    return result
  })

  ipcMain.handle('project-profile:verify-kodo', async (_event, profileId, projectId) => {
    const profile = await getProjectConnectionProfile(app, String(profileId || ''))
    if (!profile || profile.type !== 'qiniu_kodo') {
      return { ok: false, message: '七牛 Kodo 配置不存在。', lastVerifiedAt: null }
    }
    const result = await verifyKodoProfile(profile, { projectId })
    if (result.ok) {
      const now = result.lastVerifiedAt || new Date().toISOString()
      await getProjectConnectionProfileStore(app).markVerified(profile.id, now)
    }
    return result
  })

  ipcMain.handle('project-profile:verify-kodo-draft', async (_event, input = {}, projectId, profileId = '') => {
    const existingProfile = profileId ? await getProjectConnectionProfile(app, String(profileId || '')) : null
    const payload = mergeProjectProfilePayload({ type: 'qiniu_kodo', payload: input }, existingProfile)
    const profile = {
      id: 'draft',
      type: 'qiniu_kodo',
      lastVerifiedAt: null,
      encryptedPayload: {
        payload: Buffer.from(JSON.stringify(payload || {}), 'utf8').toString('base64'),
      },
    }
    return verifyKodoProfile(profile, { projectId })
  })

  ipcMain.handle('project-local-repository:initialize', async () => {
    await getLocalProjectRepository(app).initializeSchema()
    return true
  })

  ipcMain.handle('project-local-repository:create-project', async (_event, input = {}) => (
    getLocalProjectRepository(app).createProject(input)
  ))

  ipcMain.handle('project-local-repository:create-remote-project', async (_event, input = {}) => (
    getLocalProjectRepository(app).createRemoteProject(input)
  ))

  ipcMain.handle('project-local-repository:update-project', async (_event, projectId, input = {}) => (
    getLocalProjectRepository(app).updateProject(String(projectId || ''), input)
  ))

  ipcMain.handle('project-local-repository:list-projects', async () => (
    getLocalProjectRepository(app).listProjects()
  ))

  ipcMain.handle('project-local-repository:get-project', async (_event, projectId) => (
    getLocalProjectRepository(app).getProject(String(projectId || ''))
  ))

  ipcMain.handle('project-local-repository:import-rows', async (_event, rows) => {
    await getLocalProjectRepository(app).importProjectRows(rows)
    return true
  })

  ipcMain.handle('project-local-repository:export-rows', async (_event, projectId) => (
    getLocalProjectRepository(app).exportProjectRows(String(projectId || ''))
  ))

  ipcMain.handle('project-local-repository:list-assets', async (_event, projectId) => (
    getLocalProjectRepository(app).listAssets(String(projectId || ''))
  ))

  ipcMain.handle('project-local-repository:add-cleanup-tasks', async (_event, tasks = []) => {
    await getLocalProjectRepository(app).addCleanupTasks(Array.isArray(tasks) ? tasks : [])
    return true
  })

  ipcMain.handle('project-local-repository:list-cleanup-tasks', async (_event, projectId) => (
    getLocalProjectRepository(app).listCleanupTasks(String(projectId || ''))
  ))

  ipcMain.handle('project-local-repository:delete-project', async (_event, projectId) => {
    await getLocalProjectRepository(app).deleteProject(String(projectId || ''))
    return true
  })

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

  ipcMain.handle('project-remote-repository:create-project', async (_event, input = {}) => {
    const repository = await getRemoteDatabaseRepository(app, String(input.databaseProfileId || ''))
    return repository.createRemoteProject(input)
  })

  ipcMain.handle('project-remote-repository:update-project', async (_event, projectId, input = {}, databaseProfileId = '') => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || input.databaseProfileId || ''))
    return repository.updateProject(String(projectId || ''), input)
  })

  ipcMain.handle('project-remote-repository:list-projects', async (_event, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.listProjects()
  })

  ipcMain.handle('project-remote-repository:get-project', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.getProject(String(projectId || ''))
  })

  ipcMain.handle('project-remote-repository:import-rows', async (_event, rows, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    await repository.importProjectRows(rows)
    return true
  })

  ipcMain.handle('project-remote-repository:export-rows', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.exportProjectRows(String(projectId || ''))
  })

  ipcMain.handle('project-remote-repository:list-assets', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.listAssets(String(projectId || ''))
  })

  ipcMain.handle('project-remote-repository:add-cleanup-tasks', async (_event, tasks = [], databaseProfileId) => {
    const normalizedTasks = Array.isArray(tasks) ? tasks : []
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    await repository.addCleanupTasks(normalizedTasks)
    return true
  })

  ipcMain.handle('project-remote-repository:list-cleanup-tasks', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    return repository.listCleanupTasks(String(projectId || ''))
  })

  ipcMain.handle('project-remote-repository:delete-project', async (_event, projectId, databaseProfileId) => {
    const repository = await getRemoteDatabaseRepository(app, String(databaseProfileId || ''))
    await repository.deleteProject(String(projectId || ''))
    return true
  })

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
  registerProjectStorageIpcHandlers,
}
