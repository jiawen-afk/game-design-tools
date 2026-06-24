const fsp = require('node:fs/promises')
const path = require('node:path')

const {
  editableProjectProfile,
  mergeProjectProfilePayload,
  projectProfileSummary,
} = require('./projectConnectionProfiles.cjs')

function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function normalizeProjectConnectionType(value) {
  return value === 'database' || value === 'qiniu_kodo' ? value : ''
}

function defaultCreateProfileId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

function redactProjectProfileInput(input) {
  if (input?.type === 'database') {
    const payload = input.payload || {}
    const provider = payload.provider === 'mysql' ? 'mysql' : 'postgresql'
    const host = String(payload.host || '').trim()
    const port = Number(payload.port || (provider === 'mysql' ? 3306 : 5432))
    const database = String(payload.database || '').trim()
    const username = String(payload.username || '').trim()
    return {
      type: 'database',
      displayName: String(input.displayName || `${provider} ${database || host}`).trim() || '远程数据库',
      redactedSummary: `${username}@${host}:${port}/${database}${payload.ssl ? ' (SSL)' : ''}`,
    }
  }
  if (input?.type === 'qiniu_kodo') {
    const payload = input.payload || {}
    const bucket = String(payload.bucket || '').trim()
    const region = String(payload.region || '').trim()
    const domain = String(payload.domain || '').trim()
    return {
      type: 'qiniu_kodo',
      displayName: String(input.displayName || `Kodo ${bucket}`).trim() || '七牛 Kodo',
      redactedSummary: `${bucket}@${region}${domain ? ` ${domain}` : ''}`,
    }
  }
  throw new Error('项目连接配置类型无效。')
}

function createProjectConnectionProfileStore(profilePath, options = {}) {
  const now = options.now || (() => new Date().toISOString())
  const createProfileId = options.createProfileId || defaultCreateProfileId

  async function readRawProfiles() {
    try {
      const parsed = parseJsonText(await fsp.readFile(profilePath, 'utf8'))
      return Array.isArray(parsed?.profiles) ? parsed.profiles : []
    } catch {
      return []
    }
  }

  async function writeRawProfiles(profiles) {
    await fsp.mkdir(path.dirname(profilePath), { recursive: true })
    await fsp.writeFile(profilePath, JSON.stringify({ profiles }, null, 2))
  }

  async function get(profileId) {
    const profiles = await readRawProfiles()
    return profiles.find((profile) => profile.id === profileId) || null
  }

  async function list(type) {
    const normalizedType = normalizeProjectConnectionType(type)
    const profiles = await readRawProfiles()
    return profiles
      .filter((profile) => !normalizedType || profile.type === normalizedType)
      .map(projectProfileSummary)
  }

  async function save(input = {}) {
    const profiles = await readRawProfiles()
    const id = String(input.id || createProfileId())
    const existingProfile = profiles.find((profile) => profile.id === id) || null
    const payload = mergeProjectProfilePayload(input, existingProfile)
    const redacted = redactProjectProfileInput({ ...input, payload })
    const updatedAt = now()
    const hasLastVerifiedAt = Object.prototype.hasOwnProperty.call(input, 'lastVerifiedAt')
    const hasSchemaInitializedAt = Object.prototype.hasOwnProperty.call(input, 'schemaInitializedAt')
    const nextProfile = {
      id,
      type: redacted.type,
      displayName: redacted.displayName,
      redactedSummary: redacted.redactedSummary,
      encryptedPayload: {
        algorithm: 'placeholder-local-json',
        payload: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
      },
      createdAt: existingProfile?.createdAt || updatedAt,
      updatedAt,
      lastVerifiedAt: hasLastVerifiedAt ? input.lastVerifiedAt || null : existingProfile?.lastVerifiedAt || null,
      schemaInitializedAt: hasSchemaInitializedAt ? input.schemaInitializedAt || null : existingProfile?.schemaInitializedAt || null,
    }
    const nextProfiles = profiles.filter((profile) => profile.id !== id)
    nextProfiles.push(nextProfile)
    await writeRawProfiles(nextProfiles)
    return projectProfileSummary(nextProfile)
  }

  async function deleteProfile(profileId) {
    const profiles = await readRawProfiles()
    const nextProfiles = profiles.filter((profile) => profile.id !== profileId)
    await writeRawProfiles(nextProfiles)
    return nextProfiles.length !== profiles.length
  }

  async function updateProfile(profileId, updater) {
    const profiles = await readRawProfiles()
    const updatedAt = now()
    await writeRawProfiles(profiles.map((profile) => (
      profile.id === profileId ? updater(profile, updatedAt) : profile
    )))
  }

  async function markVerified(profileId, verifiedAt) {
    await updateProfile(profileId, (profile, updatedAt) => ({
      ...profile,
      lastVerifiedAt: verifiedAt,
      updatedAt,
    }))
  }

  async function markSchemaInitialized(profileId, initializedAt) {
    await updateProfile(profileId, (profile, updatedAt) => ({
      ...profile,
      lastVerifiedAt: profile.lastVerifiedAt || initializedAt,
      schemaInitializedAt: initializedAt,
      updatedAt,
    }))
  }

  return {
    delete: deleteProfile,
    editable: async (profileId) => editableProjectProfile(await get(profileId)),
    get,
    list,
    markSchemaInitialized,
    markVerified,
    readRawProfiles,
    save,
  }
}

module.exports = {
  createProjectConnectionProfileStore,
  normalizeProjectConnectionType,
  redactProjectProfileInput,
}
