const {
  normalizeDatabasePayload,
} = require('./projectRemoteDatabase.cjs')
const {
  attachPostgresConnectionErrorSink,
  throwIfPostgresConnectionErrored,
} = require('./projectPostgresConnection.cjs')

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

function normalizeRows(rows) {
  return rows.map((row) => ({ ...row }))
}

function isPostgresConnectionTerminationError(error) {
  const message = String(error?.message || error || '')
  const code = String(error?.code || '')
  return [
    'Connection terminated unexpectedly',
    'Connection terminated',
    'Connection ended unexpectedly',
    'connection error and is not queryable',
    'server closed the connection unexpectedly',
    'ECONNRESET',
    'EPIPE',
  ].some((fragment) => message.includes(fragment) || code === fragment)
}

function createPostgresConnectionTerminatedError(error) {
  const wrapped = new Error('远程数据库连接已中断，请检查网络或数据库服务后重试。')
  Object.defineProperty(wrapped, 'originalMessage', {
    value: String(error?.message || error || ''),
    enumerable: false,
  })
  return wrapped
}

async function createRunner(payload, options = {}) {
  if (payload.provider === 'postgresql') {
    const client = (options.createPostgresClient || defaultCreatePostgresClient)(postgresConfig(payload))
    const connectionState = attachPostgresConnectionErrorSink(client)
    try {
      await client.connect()
    } catch (error) {
      await client.end().catch(() => {})
      throw error
    }
    return {
      dialect: 'postgresql',
      execute: async (statement, params = []) => {
        throwIfPostgresConnectionErrored(connectionState)
        const result = await client.query(statement, params)
        throwIfPostgresConnectionErrored(connectionState)
        return result
      },
      queryRows: async (statement, params = []) => {
        throwIfPostgresConnectionErrored(connectionState)
        const result = await client.query(statement, params)
        throwIfPostgresConnectionErrored(connectionState)
        return normalizeRows(result.rows || [])
      },
      close: async () => client.end().catch(() => {}),
    }
  }

  const connection = await (options.createMysqlConnection || defaultCreateMysqlConnection)(mysqlConfig(payload))
  return {
    dialect: 'mysql',
    execute: async (statement, params = []) => connection.execute(statement, params),
    queryRows: async (statement, params = []) => {
      const [rows] = await connection.execute(statement, params)
      return normalizeRows(Array.isArray(rows) ? rows : [])
    },
    close: async () => connection.end().catch(() => {}),
  }
}

async function withRunner(profile, options, callback) {
  const payload = normalizeDatabasePayload(profile)
  const maxAttempts = payload.provider === 'postgresql' ? 3 : 1
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let runner = null
    let shouldRetry = false
    try {
      runner = await createRunner(payload, options)
      return await callback(runner)
    } catch (error) {
      const isPostgresConnectionTermination = payload.provider === 'postgresql'
        && isPostgresConnectionTerminationError(error)
      shouldRetry = isPostgresConnectionTermination
        && attempt < maxAttempts
      if (!shouldRetry) {
        if (isPostgresConnectionTermination) throw createPostgresConnectionTerminatedError(error)
        throw error
      }
    } finally {
      if (runner) await runner.close()
    }
    if (!shouldRetry) break
  }
}

async function withTransaction(profile, options, callback) {
  return withRunner(profile, options, async (runner) => {
    await runner.execute(runner.dialect === 'postgresql' ? 'BEGIN' : 'START TRANSACTION')
    try {
      const result = await callback(runner)
      await runner.execute('COMMIT')
      return result
    } catch (error) {
      await runner.execute('ROLLBACK').catch(() => {})
      throw error
    }
  })
}

module.exports = {
  createRunner,
  requireNodeModule,
  withRunner,
  withTransaction,
}
