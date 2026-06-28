const {
  attachPostgresConnectionErrorSink,
  throwIfPostgresConnectionErrored,
} = require('./projectPostgresConnection.cjs')
const {
  createProjectRemoteSchemaMigrationSql,
  createProjectRemoteSchemaSql,
} = require('./projectRemoteSchema.cjs')


function parseJsonText(text) {
  if (!text) return null
  return JSON.parse(text.replace(/^\uFEFF/, ''))
}

function decodeProjectProfilePayload(profile) {
  const encodedPayload = profile?.encryptedPayload?.payload
  if (!encodedPayload) throw new Error('远程数据库配置缺少连接参数。')
  return parseJsonText(Buffer.from(String(encodedPayload), 'base64').toString('utf8')) || {}
}

function normalizeDatabasePayload(profile) {
  const payload = decodeProjectProfilePayload(profile)
  const provider = payload.provider === 'mysql' ? 'mysql' : 'postgresql'
  const port = Number(payload.port || (provider === 'mysql' ? 3306 : 5432))
  const normalized = {
    provider,
    host: String(payload.host || '').trim(),
    port,
    database: String(payload.database || '').trim(),
    username: String(payload.username || '').trim(),
    password: String(payload.password || ''),
    ssl: Boolean(payload.ssl),
  }
  if (!normalized.host) throw new Error('缺少数据库主机。')
  if (!Number.isInteger(normalized.port) || normalized.port <= 0) throw new Error('数据库端口无效。')
  if (!normalized.database) throw new Error('缺少数据库名。')
  if (!normalized.username) throw new Error('缺少数据库用户名。')
  if (!normalized.password) throw new Error('缺少数据库密码。')
  return normalized
}

function requireNodeModule(moduleName, installHint) {
  try {
    return require(moduleName)
  } catch (error) {
    if (error?.code === 'MODULE_NOT_FOUND') {
      throw new Error(`${installHint} 未安装，无法连接远程数据库。`)
    }
    throw error
  }
}

function defaultCreatePostgresClient(config) {
  const { Client } = requireNodeModule('pg', 'PostgreSQL 驱动 pg')
  return new Client(config)
}

async function defaultCreateMysqlConnection(config) {
  const mysql = requireNodeModule('mysql2/promise', 'MySQL 驱动 mysql2')
  return mysql.createConnection(config)
}

function postgresConfig(payload) {
  return {
    host: payload.host,
    port: payload.port,
    database: payload.database,
    user: payload.username,
    password: payload.password,
    connectionTimeoutMillis: 10000,
    ssl: payload.ssl ? { rejectUnauthorized: false } : false,
  }
}

function mysqlConfig(payload) {
  return {
    host: payload.host,
    port: payload.port,
    database: payload.database,
    user: payload.username,
    password: payload.password,
    connectTimeout: 10000,
    ssl: payload.ssl ? { rejectUnauthorized: false } : undefined,
    multipleStatements: false,
  }
}

function success(message, now) {
  return { ok: true, message, lastVerifiedAt: now() }
}

function failure(message) {
  return { ok: false, message: `远程数据库操作失败：${message}`, lastVerifiedAt: null }
}

async function withPostgresConnection(payload, options, callback) {
  const client = (options.createPostgresClient || defaultCreatePostgresClient)(postgresConfig(payload))
  const connectionState = attachPostgresConnectionErrorSink(client)
  try {
    await client.connect()
    await callback(async (statement) => {
      throwIfPostgresConnectionErrored(connectionState)
      const result = await client.query(statement)
      throwIfPostgresConnectionErrored(connectionState)
      return result
    })
  } finally {
    await client.end().catch(() => {})
  }
}

async function withMysqlConnection(payload, options, callback) {
  const connection = await (options.createMysqlConnection || defaultCreateMysqlConnection)(mysqlConfig(payload))
  try {
    await callback(async (statement) => {
      try {
        return await connection.execute(statement)
      } catch (error) {
        if (error?.code === 'ER_DUP_KEYNAME' && /^CREATE\s+INDEX\b/i.test(statement)) return null
        if (error?.code === 'ER_DUP_FIELDNAME' && /^ALTER\s+TABLE\s+\S+\s+ADD\s+COLUMN\b/i.test(statement)) return null
        throw error
      }
    })
  } finally {
    await connection.end().catch(() => {})
  }
}

async function runRemoteDatabaseStatements(profile, statements, options = {}) {
  const payload = normalizeDatabasePayload(profile)
  if (payload.provider === 'postgresql') {
    await withPostgresConnection(payload, options, async (execute) => {
      for (const statement of statements) await execute(statement)
    })
    return
  }
  await withMysqlConnection(payload, options, async (execute) => {
    for (const statement of statements) await execute(statement)
  })
}

async function verifyRemoteDatabaseProfile(profile, options = {}) {
  try {
    await runRemoteDatabaseStatements(profile, ['SELECT 1'], options)
    return success('远程数据库连接验证成功。', options.now || (() => new Date().toISOString()))
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error))
  }
}

async function initializeRemoteDatabaseSchema(profile, options = {}) {
  try {
    const payload = normalizeDatabasePayload(profile)
    await runRemoteDatabaseStatements(profile, [
      ...createProjectRemoteSchemaSql(payload.provider),
      ...createProjectRemoteSchemaMigrationSql(payload.provider),
    ], options)
    return success('远程数据库表结构已初始化。', options.now || (() => new Date().toISOString()))
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error))
  }
}

module.exports = {
  createProjectRemoteSchemaSql,
  createProjectRemoteSchemaMigrationSql,
  initializeRemoteDatabaseSchema,
  normalizeDatabasePayload,
  verifyRemoteDatabaseProfile,
}
