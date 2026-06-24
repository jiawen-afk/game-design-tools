function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function decodeProjectProfilePayload(profile) {
  try {
    return parseJsonText(Buffer.from(String(profile?.encryptedPayload?.payload || ''), 'base64').toString('utf8'))
  } catch {
    return {}
  }
}

function projectProfileSummary(profile) {
  return {
    id: profile.id,
    type: profile.type,
    displayName: profile.displayName,
    redactedSummary: profile.redactedSummary,
    lastVerifiedAt: profile.lastVerifiedAt || null,
    schemaInitializedAt: profile.schemaInitializedAt || null,
  }
}

function editableProjectProfile(profile) {
  if (!profile) return null
  const payload = decodeProjectProfilePayload(profile)
  if (profile.type === 'database') {
    const provider = payload.provider === 'mysql' ? 'mysql' : 'postgresql'
    return {
      ...projectProfileSummary(profile),
      payload: {
        provider,
        host: String(payload.host || ''),
        port: Number(payload.port || (provider === 'mysql' ? 3306 : 5432)),
        database: String(payload.database || ''),
        username: String(payload.username || ''),
        password: '',
        ssl: Boolean(payload.ssl),
      },
    }
  }
  if (profile.type === 'qiniu_kodo') {
    return {
      ...projectProfileSummary(profile),
      payload: {
        accessKey: String(payload.accessKey || ''),
        secretKey: '',
        bucket: String(payload.bucket || ''),
        region: String(payload.region || ''),
        domain: String(payload.domain || ''),
      },
    }
  }
  return null
}

function mergeProjectProfilePayload(input, existingProfile) {
  const payload = input.payload || {}
  if (!existingProfile) return payload
  const existingPayload = decodeProjectProfilePayload(existingProfile)
  if (input.type === 'database') {
    return {
      ...payload,
      password: payload.password || existingPayload.password || '',
    }
  }
  if (input.type === 'qiniu_kodo') {
    return {
      ...payload,
      secretKey: payload.secretKey || existingPayload.secretKey || '',
    }
  }
  return payload
}

module.exports = {
  decodeProjectProfilePayload,
  editableProjectProfile,
  mergeProjectProfilePayload,
  projectProfileSummary,
}
