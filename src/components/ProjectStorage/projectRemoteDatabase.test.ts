import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import { createProjectSchemaSql } from './projectSchema'

const require = createRequire(import.meta.url)
const {
  createProjectRemoteSchemaSql,
  initializeRemoteDatabaseSchema,
  verifyRemoteDatabaseProfile,
} = require('../../../electron/projectRemoteDatabase.cjs') as {
  createProjectRemoteSchemaSql: (dialect: 'postgresql' | 'mysql') => string[]
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
  assert.deepEqual(executedStatements, createProjectSchemaSql('postgresql'))
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
})
