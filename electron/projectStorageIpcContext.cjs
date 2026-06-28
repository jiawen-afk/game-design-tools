const path = require('node:path')

const {
  createRemoteProjectRepository,
} = require('./projectRemoteRepository.cjs')
const {
  createLocalProjectRepository,
} = require('./projectLocalRepository.cjs')
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

module.exports = {
  getLocalProjectRepository,
  getProjectConnectionProfile,
  getProjectConnectionProfileStore,
  getRemoteDatabaseRepository,
  resolveProjectAssetCacheRootPath,
  resolveProjectConnectionProfilePath,
  resolveProjectLocalDatabasePath,
  resolveProjectLocalObjectRootPath,
}
