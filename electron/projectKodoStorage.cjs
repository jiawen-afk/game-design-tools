const https = require('node:https')

function parseJsonText(text) {
  if (!text) return null
  return JSON.parse(text.replace(/^\uFEFF/, ''))
}

function decodeProjectProfilePayload(profile) {
  const encodedPayload = profile?.encryptedPayload?.payload
  if (!encodedPayload) throw new Error('七牛 Kodo 配置缺少连接参数。')
  return parseJsonText(Buffer.from(String(encodedPayload), 'base64').toString('utf8')) || {}
}

function normalizeKodoPayload(profile) {
  const payload = decodeProjectProfilePayload(profile)
  const normalized = {
    accessKey: String(payload.accessKey || '').trim(),
    secretKey: String(payload.secretKey || ''),
    bucket: String(payload.bucket || '').trim(),
    region: String(payload.region || '').trim(),
    domain: String(payload.domain || '').trim(),
  }
  if (!normalized.accessKey) throw new Error('缺少 Access Key。')
  if (!normalized.secretKey) throw new Error('缺少 Secret Key。')
  if (!normalized.bucket) throw new Error('缺少 Bucket。')
  if (!normalized.region) throw new Error('缺少 Region。')
  return normalized
}

function sanitizeObjectKeyPart(value) {
  return value.trim().replace(/[\\/]+/g, '_').replace(/\s+/g, '_')
}

function normalizeProjectPrefix(value) {
  const normalized = sanitizeObjectKeyPart(String(value || ''))
  if (!normalized) throw new Error('缺少项目名称或项目 ID，无法验证对象 Key 前缀。')
  return normalized
}

function normalizeProbeId(value) {
  return sanitizeObjectKeyPart(String(value || 'kodo_probe')) || 'kodo_probe'
}

function requireNodeModule(moduleName, installHint) {
  try {
    return require(moduleName)
  } catch (error) {
    if (error?.code === 'MODULE_NOT_FOUND') {
      throw new Error(`${installHint} 未安装，无法验证七牛 Kodo。`)
    }
    throw error
  }
}

function createQiniuConfig(qiniu, payload) {
  const config = new qiniu.conf.Config({ useHttpsDomain: true })
  if (payload.region && qiniu.httpc?.Region?.fromRegionId && qiniu.httpc?.StaticRegionsProvider) {
    config.regionsProvider = new qiniu.httpc.StaticRegionsProvider([
      qiniu.httpc.Region.fromRegionId(payload.region),
    ])
  } else if (payload.region && qiniu.zone?.[`Zone_${payload.region}`]) {
    config.zone = qiniu.zone[`Zone_${payload.region}`]
  }
  return config
}

function unwrapQiniuResponse(response, operation) {
  const statusCode = Number(response?.resp?.statusCode || response?.statusCode || 0)
  if (statusCode >= 400) {
    const body = response?.data ? `：${JSON.stringify(response.data)}` : ''
    throw new Error(`${operation}失败，HTTP ${statusCode}${body}`)
  }
  return response
}

function normalizeDownloadDomain(domain) {
  const normalized = String(domain || '').trim().replace(/\/+$/, '')
  if (!normalized) throw new Error('缺少 Kodo 访问域名，无法读取对象。')
  if (/^https?:\/\//i.test(normalized)) return normalized
  return `https://${normalized}`
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const statusCode = Number(response.statusCode || 0)
      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        response.resume()
        downloadBuffer(response.headers.location).then(resolve, reject)
        return
      }
      if (statusCode >= 400) {
        response.resume()
        reject(new Error(`读取 Kodo 对象失败，HTTP ${statusCode}`))
        return
      }
      const chunks = []
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      response.on('error', reject)
      response.on('end', () => resolve(Buffer.concat(chunks)))
    }).on('error', reject)
  })
}

async function createQiniuKodoClient(payload) {
  const qiniu = requireNodeModule('qiniu', '七牛 Node.js SDK qiniu')
  const mac = new qiniu.auth.digest.Mac(payload.accessKey, payload.secretKey)
  const config = createQiniuConfig(qiniu, payload)
  const formUploader = new qiniu.form_up.FormUploader(config)
  const bucketManager = new qiniu.rs.BucketManager(mac, config)

  return {
    async putObject(objectKey, body, mimeType) {
      const putPolicy = new qiniu.rs.PutPolicy({
        scope: `${payload.bucket}:${objectKey}`,
        expires: 600,
      })
      const uploadToken = putPolicy.uploadToken(mac)
      const putExtra = new qiniu.form_up.PutExtra(objectKey, {}, mimeType)
      const response = await formUploader.put(uploadToken, objectKey, body, putExtra)
      unwrapQiniuResponse(response, '上传验证对象')
    },
    async statObject(objectKey) {
      const response = await bucketManager.stat(payload.bucket, objectKey)
      unwrapQiniuResponse(response, '查询验证对象')
      return response?.data || {}
    },
    async getObject(objectKey) {
      const encodedKey = String(objectKey || '').split('/').map(encodeURIComponent).join('/')
      const deadline = Math.floor(Date.now() / 1000) + 600
      const url = bucketManager.privateDownloadUrl(normalizeDownloadDomain(payload.domain), encodedKey, deadline)
      return downloadBuffer(url)
    },
    async deleteObject(objectKey) {
      const response = await bucketManager.delete(payload.bucket, objectKey)
      unwrapQiniuResponse(response, '删除验证对象')
    },
  }
}

async function verifyKodoProfile(profile, options = {}) {
  let objectKey = ''
  let client = null
  let uploaded = false
  try {
    const payload = normalizeKodoPayload(profile)
    const projectPrefix = normalizeProjectPrefix(options.projectName || options.projectId)
    const probeId = normalizeProbeId(options.probeId)
    objectKey = `objects/${projectPrefix}/verification/${probeId}.txt`
    client = await (options.createClient || createQiniuKodoClient)(payload)
    const body = Buffer.from('game-design-tools-kodo-verification', 'utf8')
    await client.putObject(objectKey, body, 'text/plain')
    uploaded = true
    await client.statObject(objectKey)
    await client.getObject(objectKey)
    await client.deleteObject(objectKey)
    uploaded = false
    const now = options.now || (() => new Date().toISOString())
    return { ok: true, message: '七牛 Kodo 对象存储验证成功。', lastVerifiedAt: now() }
  } catch (error) {
    if (uploaded && client && objectKey) {
      await client.deleteObject(objectKey).catch(() => {})
    }
    return {
      ok: false,
      message: `七牛 Kodo 验证失败：${error instanceof Error ? error.message : String(error)}`,
      lastVerifiedAt: null,
    }
  }
}

async function putKodoObject(profile, objectKey, data, options = {}) {
  const payload = normalizeKodoPayload(profile)
  const client = await (options.createClient || createQiniuKodoClient)(payload)
  await client.putObject(String(objectKey || ''), Buffer.from(data), String(options.mimeType || 'application/octet-stream'))
  return true
}

async function getKodoObject(profile, objectKey, options = {}) {
  const payload = normalizeKodoPayload(profile)
  const client = await (options.createClient || createQiniuKodoClient)(payload)
  const key = String(objectKey || '')
  const stat = await client.statObject(key).catch(() => ({}))
  const data = await client.getObject(key)
  return {
    data: Buffer.from(data),
    mimeType: String(stat.mimeType || stat.mime_type || options.mimeType || 'application/octet-stream'),
  }
}

async function deleteKodoObject(profile, objectKey, options = {}) {
  const payload = normalizeKodoPayload(profile)
  const client = await (options.createClient || createQiniuKodoClient)(payload)
  await client.deleteObject(String(objectKey || ''))
  return true
}

module.exports = {
  createQiniuKodoClient,
  deleteKodoObject,
  getKodoObject,
  normalizeDownloadDomain,
  normalizeKodoPayload,
  normalizeProjectPrefix,
  putKodoObject,
  verifyKodoProfile,
}
