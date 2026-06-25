const { attachPostgresConnectionErrorSink } = require('./projectPostgresConnection.cjs')

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

function createProjectRemoteSchemaSql(dialect) {
  if (dialect === 'postgresql') return createProjectSchemaSql('postgresql')
  if (dialect !== 'mysql') throw new Error('初始化表结构仅支持 PostgreSQL 或 MySQL。')

  return createProjectSchemaSql('mysql').map((statement) => statement
    .replace(/\b(id|version|project_id|group_id|character_id|asset_id|storyboard_id|source_asset_id|target_asset_id)\s+text\s+primary\s+key/gi, '$1 varchar(64) primary key')
    .replace(/\b(id|version|project_id|group_id|character_id|asset_id|storyboard_id|source_asset_id|target_asset_id|primary_resource_id|sprite_index_resource_id|remote_database_profile_id|remote_storage_profile_id)\s+text\b/gi, '$1 varchar(64)')
    .replace(/\b(kind|mode|status|storage_provider|database_provider|asset_subtype|column_kind|relation_type|from_mode|to_mode|storage_provider|primary_mime_group|primary_extension|sprite_index_mime_type)\s+text\b/gi, '$1 varchar(64)')
    .replace(/\b(name|display_name|primary_file_name|sprite_index_file_name|primary_mime_type|primary_hash_sha256|sprite_index_hash_sha256)\s+text\b/gi, '$1 varchar(255)')
    .replace(/\b(object_key_prefix|primary_object_key|sprite_index_object_key|object_key|source_key|local_object_root|error_message)\s+text\b/gi, '$1 varchar(512)')
    .replace(/\b(created_at|updated_at|applied_at|last_verified_at|started_at|finished_at)\s+text\b/gi, '$1 varchar(32)')
    .replace(/\b(description|dialogue_text|text|checksum)\s+text\b/gi, '$1 varchar(2048)')
    .replace(/\bCREATE INDEX IF NOT EXISTS\b/gi, 'CREATE INDEX')
  )
}

function boolType(dialect) {
  return dialect === 'sqlite' ? 'integer' : 'boolean'
}

function jsonType(dialect) {
  if (dialect === 'postgresql') return 'jsonb'
  if (dialect === 'mysql') return 'json'
  return 'text'
}

function createProjectSchemaSql(dialect) {
  const boolean = boolType(dialect)
  const json = jsonType(dialect)
  return [
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version text primary key,
      applied_at text not null,
      checksum text null
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id text primary key,
      name text not null,
      description text not null default '',
      mode text not null,
      status text not null,
      object_key_prefix text not null,
      created_at text not null,
      updated_at text not null,
      metadata_json ${json} null
    )`,
    `CREATE TABLE IF NOT EXISTS project_settings (
      project_id text primary key references projects(id) on delete cascade,
      storage_provider text not null,
      database_provider text not null,
      local_object_root text null,
      remote_database_profile_id text null,
      remote_storage_profile_id text null,
      last_verified_at text null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS asset_groups (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      kind text not null,
      name text not null,
      starred ${boolean} not null default false,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null,
      UNIQUE (project_id, kind, name)
    )`,
    `CREATE TABLE IF NOT EXISTS assets (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      kind text not null,
      asset_subtype text not null,
      group_id text null references asset_groups(id) on delete set null,
      name text not null,
      dialogue_text text null,
      source_key text null,
      primary_resource_id text not null,
      primary_object_key text not null,
      primary_file_name text not null,
      primary_mime_group text not null,
      primary_mime_type text not null,
      primary_extension text not null,
      primary_size_bytes integer not null default 0,
      primary_hash_sha256 text null,
      sprite_index_resource_id text null,
      sprite_index_object_key text null,
      sprite_index_file_name text null,
      sprite_index_mime_type text null,
      sprite_index_size_bytes integer null,
      sprite_index_hash_sha256 text null,
      sprite_frame_width integer null,
      sprite_frame_height integer null,
      sprite_sheet_width integer null,
      sprite_sheet_height integer null,
      sprite_fps integer null,
      sprite_frame_count integer null,
      created_at text not null,
      updated_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, primary_object_key),
      UNIQUE (project_id, sprite_index_object_key)
    )`,
    `CREATE TABLE IF NOT EXISTS characters (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      name text not null,
      starred ${boolean} not null default false,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS character_asset_links (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      character_id text not null references characters(id) on delete cascade,
      asset_id text not null references assets(id) on delete cascade,
      column_kind text not null,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null,
      UNIQUE (character_id, asset_id, column_kind)
    )`,
    `CREATE TABLE IF NOT EXISTS storyboard_groups (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      name text not null,
      starred ${boolean} not null default false,
      created_at text not null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS storyboard_voice_entries (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      storyboard_id text not null references storyboard_groups(id) on delete cascade,
      asset_id text not null references assets(id) on delete cascade,
      character_id text null references characters(id) on delete set null,
      text text not null default '',
      start_offset_us integer not null default 0,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null
    )`,
    `CREATE TABLE IF NOT EXISTS asset_relations (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      source_asset_id text not null references assets(id) on delete cascade,
      target_asset_id text not null references assets(id) on delete cascade,
      relation_type text not null,
      created_at text not null,
      UNIQUE (project_id, source_asset_id, target_asset_id, relation_type)
    )`,
    `CREATE TABLE IF NOT EXISTS project_migrations (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      from_mode text not null,
      to_mode text not null,
      status text not null,
      started_at text null,
      finished_at text null,
      total_assets integer not null default 0,
      total_objects integer not null default 0,
      uploaded_objects integer not null default 0,
      error_message text null,
      report_json ${json} null
    )`,
    `CREATE TABLE IF NOT EXISTS deleted_project_cleanup_tasks (
      id text primary key,
      project_id text not null,
      storage_provider text not null,
      object_key text not null,
      status text not null,
      error_message text null,
      created_at text not null,
      updated_at text not null
    )`,
    'CREATE INDEX IF NOT EXISTS idx_asset_groups_project_kind ON asset_groups(project_id, kind)',
    'CREATE INDEX IF NOT EXISTS idx_assets_project_kind ON assets(project_id, kind)',
    'CREATE INDEX IF NOT EXISTS idx_assets_project_subtype ON assets(project_id, asset_subtype)',
    'CREATE INDEX IF NOT EXISTS idx_assets_project_group ON assets(project_id, group_id)',
    'CREATE INDEX IF NOT EXISTS idx_characters_project_sort ON characters(project_id, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_character_links_project_character ON character_asset_links(project_id, character_id, column_kind, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_storyboards_project_starred ON storyboard_groups(project_id, starred)',
    'CREATE INDEX IF NOT EXISTS idx_storyboard_voice_project_storyboard ON storyboard_voice_entries(project_id, storyboard_id, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_asset_relations_source ON asset_relations(project_id, source_asset_id)',
    'CREATE INDEX IF NOT EXISTS idx_asset_relations_target ON asset_relations(project_id, target_asset_id)',
  ].map((statement) => statement.trim())
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
  try {
    attachPostgresConnectionErrorSink(client)
    await client.connect()
    await callback((statement) => client.query(statement))
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
    await runRemoteDatabaseStatements(profile, createProjectRemoteSchemaSql(payload.provider), options)
    return success('远程数据库表结构已初始化。', options.now || (() => new Date().toISOString()))
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error))
  }
}

module.exports = {
  createProjectRemoteSchemaSql,
  initializeRemoteDatabaseSchema,
  normalizeDatabasePayload,
  verifyRemoteDatabaseProfile,
}
