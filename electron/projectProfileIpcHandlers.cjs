const {
  initializeRemoteDatabaseSchema,
  verifyRemoteDatabaseProfile,
} = require('./projectRemoteDatabase.cjs')
const {
  verifyKodoProfile,
} = require('./projectKodoStorage.cjs')
const {
  mergeProjectProfilePayload,
} = require('./projectConnectionProfiles.cjs')
const {
  getProjectConnectionProfile,
  getProjectConnectionProfileStore,
} = require('./projectStorageIpcContext.cjs')

function registerProjectProfileIpcHandlers({ app, ipcMain }) {
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
}

module.exports = {
  registerProjectProfileIpcHandlers,
}
