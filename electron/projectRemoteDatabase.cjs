const {
  attachPostgresConnectionErrorSink,
  throwIfPostgresConnectionErrored,
} = require('./projectPostgresConnection.cjs')

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
    .replace(/\b(id|version|project_id|group_id|character_id|asset_id|storyboard_id|source_asset_id|target_asset_id|collection_id|source_id|node_id|edge_id|record_id)\s+text\s+primary\s+key/gi, '$1 varchar(64) primary key')
    .replace(/\b(id|version|project_id|group_id|character_id|asset_id|storyboard_id|source_asset_id|target_asset_id|collection_id|source_id|node_id|edge_id|record_id|source_node_id|target_node_id|primary_resource_id|sprite_index_resource_id|cover_resource_id|remote_database_profile_id|remote_storage_profile_id)\s+text\b/gi, '$1 varchar(64)')
    .replace(/\b(kind|mode|status|storage_provider|database_provider|asset_subtype|column_kind|relation_type|from_mode|to_mode|storage_provider|primary_mime_group|primary_extension|sprite_index_mime_type|cover_mime_type|source_type|record_type|node_type|edge_type|source_kind|role|mime_group|extension|encoding|link_role)\s+text\b/gi, '$1 varchar(64)')
    .replace(/\b(name|display_name|primary_file_name|sprite_index_file_name|cover_file_name|primary_mime_type|primary_hash_sha256|sprite_index_hash_sha256|cover_hash_sha256|file_name|mime_type|hash_sha256|external_id|title|label|category_1|category_2|category_3|book_title|chapter_title|version_title)\s+text\b/gi, '$1 varchar(255)')
    .replace(/\b(object_key_prefix|primary_object_key|sprite_index_object_key|cover_object_key|object_key|source_key|local_object_root|error_message|place_path|source_url)\s+text\b/gi, '$1 varchar(512)')
    .replace(/\b(created_at|updated_at|applied_at|last_verified_at|started_at|finished_at|imported_at)\s+text\b/gi, '$1 varchar(32)')
    .replace(/\b(description|dialogue_text|text|checksum|search_text|usage_text|effect_text)\s+text\b/gi, '$1 varchar(2048)')
    .replace(/\bCREATE INDEX IF NOT EXISTS\b/gi, 'CREATE INDEX')
  )
}

function createProjectRemoteSchemaMigrationSql(dialect) {
  if (dialect === 'postgresql') {
    return [
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_resource_id text null',
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_object_key text null',
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_file_name text null',
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_mime_type text null',
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_size_bytes integer null',
      'ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_hash_sha256 text null',
    ]
  }
  if (dialect === 'mysql') {
    return [
      'ALTER TABLE assets ADD COLUMN cover_resource_id varchar(64) null',
      'ALTER TABLE assets ADD COLUMN cover_object_key varchar(512) null',
      'ALTER TABLE assets ADD COLUMN cover_file_name varchar(255) null',
      'ALTER TABLE assets ADD COLUMN cover_mime_type varchar(64) null',
      'ALTER TABLE assets ADD COLUMN cover_size_bytes integer null',
      'ALTER TABLE assets ADD COLUMN cover_hash_sha256 varchar(255) null',
    ]
  }
  throw new Error('初始化表结构仅支持 PostgreSQL 或 MySQL。')
}

function boolType(dialect) {
  return dialect === 'sqlite' ? 'integer' : 'boolean'
}

function jsonType(dialect) {
  if (dialect === 'postgresql') return 'jsonb'
  if (dialect === 'mysql') return 'json'
  return 'text'
}

function documentContentType(dialect) {
  return dialect === 'mysql' ? 'longtext' : 'text'
}

function createProjectSchemaSql(dialect) {
  const boolean = boolType(dialect)
  const json = jsonType(dialect)
  const documentContent = documentContentType(dialect)
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
      cover_resource_id text null,
      cover_object_key text null,
      cover_file_name text null,
      cover_mime_type text null,
      cover_size_bytes integer null,
      cover_hash_sha256 text null,
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
      UNIQUE (project_id, sprite_index_object_key),
      UNIQUE (project_id, cover_object_key)
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
    `CREATE TABLE IF NOT EXISTS document_collections (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      name text not null,
      description text not null default '',
      source_type text not null,
      status text not null,
      record_count integer not null default 0,
      node_count integer not null default 0,
      edge_count integer not null default 0,
      created_at text not null,
      updated_at text not null,
      imported_at text null,
      metadata_json ${json} null,
      UNIQUE (project_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS document_sources (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      role text not null,
      file_name text not null,
      mime_group text not null,
      mime_type text not null,
      extension text not null,
      size_bytes integer not null default 0,
      hash_sha256 text null,
      encoding text not null default 'utf-8',
      created_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, collection_id, role, file_name)
    )`,
    `CREATE TABLE IF NOT EXISTS document_source_contents (
      source_id text primary key references document_sources(id) on delete cascade,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      content_text ${documentContent} not null,
      content_encoding text not null default 'utf-8',
      size_bytes integer not null default 0,
      hash_sha256 text null,
      created_at text not null,
      metadata_json ${json} null
    )`,
    `CREATE TABLE IF NOT EXISTS document_records (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      source_id text not null references document_sources(id) on delete cascade,
      external_id text not null,
      record_type text not null default '',
      title text not null,
      description text not null default '',
      category_1 text null,
      category_2 text null,
      category_3 text null,
      place_path text null,
      book_title text null,
      chapter_title text null,
      version_title text null,
      usage_text text null,
      effect_text text null,
      source_url text null,
      search_text text not null default '',
      created_at text not null,
      updated_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, collection_id, external_id)
    )`,
    `CREATE TABLE IF NOT EXISTS document_nodes (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      external_id text not null,
      node_type text not null,
      label text not null,
      description text not null default '',
      search_text text not null default '',
      created_at text not null,
      updated_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, collection_id, external_id)
    )`,
    `CREATE TABLE IF NOT EXISTS document_edges (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      external_id text not null,
      source_node_id text not null references document_nodes(id) on delete cascade,
      target_node_id text not null references document_nodes(id) on delete cascade,
      edge_type text not null,
      label text not null default '',
      weight real not null default 1,
      source_kind text not null default '',
      created_at text not null,
      metadata_json ${json} null,
      UNIQUE (project_id, collection_id, external_id)
    )`,
    `CREATE TABLE IF NOT EXISTS document_node_record_links (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      node_id text not null references document_nodes(id) on delete cascade,
      record_id text not null references document_records(id) on delete cascade,
      link_role text not null default 'related',
      created_at text not null,
      UNIQUE (project_id, node_id, record_id, link_role)
    )`,
    `CREATE TABLE IF NOT EXISTS document_edge_record_links (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text not null references document_collections(id) on delete cascade,
      edge_id text not null references document_edges(id) on delete cascade,
      record_id text not null references document_records(id) on delete cascade,
      created_at text not null,
      UNIQUE (project_id, edge_id, record_id)
    )`,
    `CREATE TABLE IF NOT EXISTS document_import_runs (
      id text primary key,
      project_id text not null references projects(id) on delete cascade,
      collection_id text null references document_collections(id) on delete set null,
      source_type text not null,
      status text not null,
      started_at text not null,
      finished_at text null,
      total_records integer not null default 0,
      total_nodes integer not null default 0,
      total_edges integer not null default 0,
      imported_records integer not null default 0,
      imported_nodes integer not null default 0,
      imported_edges integer not null default 0,
      error_message text null,
      report_json ${json} null
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
    'CREATE INDEX IF NOT EXISTS idx_document_collections_project_status ON document_collections(project_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_document_collections_project_source_type ON document_collections(project_id, source_type)',
    'CREATE INDEX IF NOT EXISTS idx_document_sources_project_collection ON document_sources(project_id, collection_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_sources_project_role ON document_sources(project_id, role)',
    'CREATE INDEX IF NOT EXISTS idx_document_source_contents_project_collection ON document_source_contents(project_id, collection_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_records_project_type ON document_records(project_id, collection_id, record_type)',
    'CREATE INDEX IF NOT EXISTS idx_document_records_project_title ON document_records(project_id, collection_id, title)',
    'CREATE INDEX IF NOT EXISTS idx_document_records_project_category_1 ON document_records(project_id, collection_id, category_1)',
    'CREATE INDEX IF NOT EXISTS idx_document_records_project_category_2 ON document_records(project_id, collection_id, category_2)',
    'CREATE INDEX IF NOT EXISTS idx_document_records_project_category_3 ON document_records(project_id, collection_id, category_3)',
    'CREATE INDEX IF NOT EXISTS idx_document_nodes_project_type ON document_nodes(project_id, collection_id, node_type)',
    'CREATE INDEX IF NOT EXISTS idx_document_nodes_project_label ON document_nodes(project_id, collection_id, label)',
    'CREATE INDEX IF NOT EXISTS idx_document_edges_project_source ON document_edges(project_id, collection_id, source_node_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_edges_project_target ON document_edges(project_id, collection_id, target_node_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_edges_project_type ON document_edges(project_id, collection_id, edge_type)',
    'CREATE INDEX IF NOT EXISTS idx_document_node_record_links_node ON document_node_record_links(project_id, collection_id, node_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_node_record_links_record ON document_node_record_links(project_id, collection_id, record_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_edge_record_links_edge ON document_edge_record_links(project_id, collection_id, edge_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_edge_record_links_record ON document_edge_record_links(project_id, collection_id, record_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_import_runs_project_status ON document_import_runs(project_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_document_import_runs_project_collection ON document_import_runs(project_id, collection_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_import_runs_project_started ON document_import_runs(project_id, started_at)',
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
