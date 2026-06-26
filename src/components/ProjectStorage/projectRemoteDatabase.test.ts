import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'

import { createProjectSchemaSql } from './projectSchema'

const require = createRequire(import.meta.url)
const {
  createProjectRemoteSchemaSql,
  createProjectRemoteSchemaMigrationSql,
  initializeRemoteDatabaseSchema,
  verifyRemoteDatabaseProfile,
} = require('../../../electron/projectRemoteDatabase.cjs') as {
  createProjectRemoteSchemaSql: (dialect: 'postgresql' | 'mysql') => string[]
  createProjectRemoteSchemaMigrationSql: (dialect: 'postgresql' | 'mysql') => string[]
  initializeRemoteDatabaseSchema: (profile: unknown, options: RemoteDatabaseTestOptions) => Promise<RemoteDatabaseResult>
  verifyRemoteDatabaseProfile: (profile: unknown, options: RemoteDatabaseTestOptions) => Promise<RemoteDatabaseResult>
}

interface RemoteDatabaseResult {
  ok: boolean
  message: string
  lastVerifiedAt: string | null
}

interface RemoteDatabaseTestOptions {
  now?: () => string
  createPostgresClient?: (config: unknown) => {
    connect: () => Promise<void>
    query: (statement: string) => Promise<unknown>
    end: () => Promise<void>
    on?: (event: string, listener: (...args: unknown[]) => void) => unknown
  }
  createMysqlConnection?: (config: unknown) => Promise<{
    execute: (statement: string) => Promise<unknown>
    end: () => Promise<void>
  }>
}

function databaseProfile(payload: Record<string, unknown>) {
  return {
    id: 'db1',
    type: 'database',
    lastVerifiedAt: null,
    encryptedPayload: {
      payload: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
    },
  }
}

const postgresqlPayload = {
  provider: 'postgresql',
  host: '127.0.0.1',
  port: 5432,
  database: 'game_assets',
  username: 'asset_user',
  password: 'secret',
  ssl: false,
}

test('remote database verification opens a real PostgreSQL connection before succeeding', async () => {
  const events: string[] = []
  const configs: unknown[] = []

  const result = await verifyRemoteDatabaseProfile(databaseProfile(postgresqlPayload), {
    now: () => '2026-06-23T00:00:00.000Z',
    createPostgresClient: (config) => {
      configs.push(config)
      return {
        connect: async () => { events.push('connect') },
        query: async (statement) => { events.push(statement) },
        end: async () => { events.push('end') },
      }
    },
  })

  assert.equal(result.ok, true)
  assert.equal(result.lastVerifiedAt, '2026-06-23T00:00:00.000Z')
  assert.deepEqual(events, ['connect', 'SELECT 1', 'end'])
  assert.deepEqual(configs, [{
    host: '127.0.0.1',
    port: 5432,
    database: 'game_assets',
    user: 'asset_user',
    password: 'secret',
    connectionTimeoutMillis: 10000,
    ssl: false,
  }])
})

test('remote database schema initialization executes PostgreSQL project schema statements', async () => {
  const executedStatements: string[] = []

  const result = await initializeRemoteDatabaseSchema(databaseProfile(postgresqlPayload), {
    now: () => '2026-06-23T00:00:00.000Z',
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement) => { executedStatements.push(statement) },
      end: async () => {},
    }),
  })

  assert.equal(result.ok, true)
  assert.equal(result.message, '远程数据库表结构已初始化。')
  assert.deepEqual(executedStatements, [
    ...createProjectSchemaSql('postgresql'),
    ...createProjectRemoteSchemaMigrationSql('postgresql'),
  ])
})

test('remote database schema initialization is idempotent when repeated', async () => {
  const executedStatements: string[] = []
  const profile = databaseProfile(postgresqlPayload)
  const options: RemoteDatabaseTestOptions = {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement) => { executedStatements.push(statement) },
      end: async () => {},
    }),
  }

  const first = await initializeRemoteDatabaseSchema(profile, options)
  const second = await initializeRemoteDatabaseSchema(profile, options)

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.deepEqual(executedStatements, [
    ...createProjectSchemaSql('postgresql'),
    ...createProjectRemoteSchemaMigrationSql('postgresql'),
    ...createProjectSchemaSql('postgresql'),
    ...createProjectRemoteSchemaMigrationSql('postgresql'),
  ])
})

test('remote database schema initialization treats repeated MySQL cover column migrations as idempotent', async () => {
  const executedStatements: string[] = []
  const mysqlPayload = {
    ...postgresqlPayload,
    provider: 'mysql',
    port: 3306,
  }

  const result = await initializeRemoteDatabaseSchema(databaseProfile(mysqlPayload), {
    createMysqlConnection: async () => ({
      execute: async (statement) => {
        executedStatements.push(statement)
        if (/ALTER TABLE assets ADD COLUMN cover_resource_id/i.test(statement)) {
          const error = new Error('Duplicate column name') as Error & { code?: string }
          error.code = 'ER_DUP_FIELDNAME'
          throw error
        }
      },
      end: async () => {},
    }),
  })

  assert.equal(result.ok, true)
  assert.ok(executedStatements.some((statement) => /ALTER TABLE assets ADD COLUMN cover_resource_id varchar\(64\) null/i.test(statement)))
})

test('remote database schema initialization fails when PostgreSQL emits a background connection error during execution', async () => {
  const client = new EventEmitter()
  const result = await initializeRemoteDatabaseSchema(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async () => {
        client.emit('error', new Error('Connection terminated unexpectedly'))
        return {}
      },
      end: async () => {},
      on: client.on.bind(client),
    }),
  })

  assert.equal(result.ok, false)
  assert.match(result.message, /远程数据库操作失败/)
  assert.match(result.message, /Connection terminated unexpectedly/)
})

test('remote database schema initialization returns failure when PostgreSQL connection fails', async () => {
  const result = await initializeRemoteDatabaseSchema(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => { throw new Error('password authentication failed') },
      query: async () => {},
      end: async () => {},
    }),
  })

  assert.equal(result.ok, false)
  assert.match(result.message, /password authentication failed/)
})

test('remote database operations swallow late PostgreSQL connection error events after query failures', async () => {
  const uncaughtErrors: Error[] = []
  const client = new EventEmitter()

  process.setUncaughtExceptionCaptureCallback((error) => {
    uncaughtErrors.push(error as Error)
  })
  try {
    const result = await verifyRemoteDatabaseProfile(databaseProfile(postgresqlPayload), {
      createPostgresClient: () => ({
        connect: async () => {},
        query: async () => {
          const error = new Error('Connection terminated unexpectedly')
          setImmediate(() => {
            client.emit('error', error)
          })
          throw error
        },
        end: async () => {},
        on: client.on.bind(client),
      }),
    })

    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })

    assert.equal(result.ok, false)
    assert.match(result.message, /Connection terminated unexpectedly/)
    assert.deepEqual(uncaughtErrors, [])
  } finally {
    process.setUncaughtExceptionCaptureCallback(null)
  }
})

test('remote database schema generator keeps PostgreSQL aligned and adapts MySQL types', () => {
  assert.deepEqual(createProjectRemoteSchemaSql('postgresql'), createProjectSchemaSql('postgresql'))

  const mysqlSql = createProjectRemoteSchemaSql('mysql').join('\n')
  assert.doesNotMatch(mysqlSql, /\btext\s+primary\s+key\b/i)
  assert.doesNotMatch(mysqlSql, /\bCREATE INDEX IF NOT EXISTS\b/i)
  assert.doesNotMatch(mysqlSql, /text\s+not\s+null\s+default\s+''/i)
  assert.match(mysqlSql, /id varchar\(64\) primary key/i)
  assert.match(mysqlSql, /group_id varchar\(64\) null references asset_groups\(id\)/i)
  assert.match(mysqlSql, /primary_resource_id varchar\(64\) not null/i)
  assert.match(mysqlSql, /metadata_json json null/i)
  assert.match(mysqlSql, /CREATE TABLE IF NOT EXISTS document_collections/i)
  assert.match(mysqlSql, /source_type varchar\(64\) not null/i)
  assert.match(mysqlSql, /record_count integer not null default 0/i)
  assert.match(mysqlSql, /source_id varchar\(64\) not null references document_sources\(id\)/i)
  assert.match(mysqlSql, /CREATE TABLE IF NOT EXISTS document_source_contents/i)
  assert.match(mysqlSql, /source_id varchar\(64\) primary key references document_sources\(id\) on delete cascade/i)
  assert.match(mysqlSql, /content_text longtext not null/i)
  assert.match(mysqlSql, /external_id varchar\(255\) not null/i)
  assert.match(mysqlSql, /node_id varchar\(64\) not null references document_nodes\(id\)/i)
  assert.match(mysqlSql, /edge_id varchar\(64\) not null references document_edges\(id\)/i)
  assert.doesNotMatch(mysqlSql, /content_blob/i)
})
