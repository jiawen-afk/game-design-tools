const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const initSqlJs = require('sql.js')
const { tableDefinitions } = require('./projectRemoteRepository.cjs')

const rowSetTables = [
  ['assetGroups', 'asset_groups'],
  ['assets', 'assets'],
  ['characters', 'characters'],
  ['characterAssetLinks', 'character_asset_links'],
  ['storyboardGroups', 'storyboard_groups'],
  ['storyboardVoiceEntries', 'storyboard_voice_entries'],
  ['assetRelations', 'asset_relations'],
  ['documentCollections', 'document_collections'],
  ['documentSources', 'document_sources'],
  ['documentSourceContents', 'document_source_contents'],
  ['documentRecords', 'document_records'],
  ['documentNodes', 'document_nodes'],
  ['documentEdges', 'document_edges'],
  ['documentNodeRecordLinks', 'document_node_record_links'],
  ['documentEdgeRecordLinks', 'document_edge_record_links'],
  ['documentImportRuns', 'document_import_runs'],
]

let sqlModulePromise = null

function createProjectStorageId() {
  const random = Math.random().toString(36).slice(2, 12)
  return `${Date.now().toString(36)}_${random}`
}

function sanitizeObjectKeyPart(value) {
  return (String(value || '').trim() || 'unnamed').replace(/[\\/]+/g, '_').replace(/\s+/g, '_')
}

function getSqlModule() {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: (fileName) => path.join(path.dirname(require.resolve('sql.js')), fileName),
    })
  }
  return sqlModulePromise
}

async function openDatabase(databasePath) {
  const SQL = await getSqlModule()
  if (!fs.existsSync(databasePath)) return new SQL.Database()
  return new SQL.Database(await fsp.readFile(databasePath))
}

async function saveDatabase(databasePath, database) {
  await fsp.mkdir(path.dirname(databasePath), { recursive: true })
  await fsp.writeFile(databasePath, Buffer.from(database.export()))
}

function boolType() {
  return 'integer'
}

function jsonType() {
  return 'text'
}

function createProjectSchemaSql() {
  const boolean = boolType()
  const json = jsonType()
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
    `CREATE TABLE IF NOT EXISTS project_device_bindings (
      project_id text primary key,
      database_profile_id text not null,
      storage_profile_id text not null,
      bound_at text not null,
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
      content_text text not null,
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
    'CREATE INDEX IF NOT EXISTS idx_document_nodes_project_type ON document_nodes(project_id, collection_id, node_type)',
    'CREATE INDEX IF NOT EXISTS idx_document_nodes_project_label ON document_nodes(project_id, collection_id, label)',
    'CREATE INDEX IF NOT EXISTS idx_document_edges_project_source ON document_edges(project_id, collection_id, source_node_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_edges_project_target ON document_edges(project_id, collection_id, target_node_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_node_record_links_node ON document_node_record_links(project_id, collection_id, node_id)',
    'CREATE INDEX IF NOT EXISTS idx_document_edge_record_links_edge ON document_edge_record_links(project_id, collection_id, edge_id)',
  ].map((statement) => statement.trim())
}

function getTableColumns(database, tableName) {
  const result = database.exec(`PRAGMA table_info(${tableName})`)
  const rowSet = result[0]?.values ?? []
  return new Set(rowSet.map((row) => String(row[1])))
}

function applySchemaMigrations(database) {
  const assetsColumns = getTableColumns(database, 'assets')
  const statements = [
    assetsColumns.has('cover_resource_id') ? null : 'ALTER TABLE assets ADD COLUMN cover_resource_id text null',
    assetsColumns.has('cover_object_key') ? null : 'ALTER TABLE assets ADD COLUMN cover_object_key text null',
    assetsColumns.has('cover_file_name') ? null : 'ALTER TABLE assets ADD COLUMN cover_file_name text null',
    assetsColumns.has('cover_mime_type') ? null : 'ALTER TABLE assets ADD COLUMN cover_mime_type text null',
    assetsColumns.has('cover_size_bytes') ? null : 'ALTER TABLE assets ADD COLUMN cover_size_bytes integer null',
    assetsColumns.has('cover_hash_sha256') ? null : 'ALTER TABLE assets ADD COLUMN cover_hash_sha256 text null',
  ].filter(Boolean)
  for (const statement of statements) database.run(statement)
}

function initializeSchemaInDatabase(database) {
  database.run('PRAGMA foreign_keys = ON')
  for (const statement of createProjectSchemaSql()) database.run(statement)
  applySchemaMigrations(database)
}

function parameterList(count) {
  return Array.from({ length: count }, () => '?').join(', ')
}

function buildSqliteUpsertSql(tableName, definition) {
  const columns = definition.columns
  const updateColumns = columns.filter((column) => !definition.conflictColumns.includes(column))
  return [
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${parameterList(columns.length)})`,
    `ON CONFLICT (${definition.conflictColumns.join(', ')}) DO UPDATE SET`,
    updateColumns.map((column) => `${column} = excluded.${column}`).join(', '),
  ].join(' ')
}

function rowValues(definition, row) {
  return definition.columns.map((column) => {
    const value = row[column] ?? null
    return typeof value === 'boolean' ? (value ? 1 : 0) : value
  })
}

function upsertRow(database, tableName, row) {
  const definition = tableDefinitions[tableName]
  database.run(buildSqliteUpsertSql(tableName, definition), rowValues(definition, row))
}

function upsertRows(database, tableName, rows) {
  for (const row of rows) upsertRow(database, tableName, row)
}

function allRows(database, statement, params = []) {
  const prepared = database.prepare(statement)
  try {
    prepared.bind(params)
    const rows = []
    while (prepared.step()) rows.push(prepared.getAsObject())
    return rows
  } finally {
    prepared.free()
  }
}

function firstRow(database, statement, params = []) {
  return allRows(database, statement, params)[0] || null
}

function normalizeBooleanRow(row) {
  if (!row) return row
  const next = { ...row }
  for (const key of ['starred']) {
    if (key in next) next[key] = Boolean(next[key])
  }
  return next
}

function selectColumns(tableName) {
  return tableDefinitions[tableName].columns.join(', ')
}

function normalizeDocumentLimit(limit) {
  const value = Number(limit)
  if (!Number.isFinite(value)) return 50
  return Math.max(1, Math.min(200, Math.floor(value)))
}

function documentSearchWhere(input, extra = []) {
  const where = ['project_id = ?']
  const params = [input.projectId]
  if (input.collectionId) {
    where.push('collection_id = ?')
    params.push(input.collectionId)
  }
  if (input.nodeType) {
    where.push('node_type = ?')
    params.push(input.nodeType)
  }
  const query = String(input.query || '').trim()
  if (query) {
    where.push('search_text LIKE ?')
    params.push(`%${query}%`)
  }
  return {
    where: [...where, ...extra].join(' AND '),
    params,
  }
}

function groupRowsByKey(rows, keyColumn, valueColumn) {
  const grouped = new Map()
  for (const row of rows) {
    const key = row[keyColumn]
    grouped.set(key, [...(grouped.get(key) || []), row[valueColumn]])
  }
  return grouped
}

function parseJsonObject(value) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function documentRecordGraphData(record) {
  return {
    ...parseJsonObject(record.metadata_json),
    id: record.id,
    external_id: record.external_id,
    record_type: record.record_type,
    title: record.title,
    description: record.description,
    category_1: record.category_1,
    category_2: record.category_2,
    category_3: record.category_3,
    place_path: record.place_path,
    book_title: record.book_title,
    chapter_title: record.chapter_title,
    version_title: record.version_title,
    usage: record.usage_text,
    effect: record.effect_text,
    source_url: record.source_url,
  }
}

function deleteDocumentCollectionRows(database, projectId, collectionId) {
  for (const tableName of [
    'document_edge_record_links',
    'document_node_record_links',
    'document_edges',
    'document_nodes',
    'document_records',
    'document_source_contents',
    'document_sources',
    'document_import_runs',
    'document_collections',
  ]) {
    database.run(`DELETE FROM ${tableName} WHERE project_id = ? AND ${tableName === 'document_collections' ? 'id' : 'collection_id'} = ?`, [
      projectId,
      collectionId,
    ])
  }
}

async function withDatabase(databasePath, options, callback) {
  const database = await openDatabase(databasePath)
  let shouldSave = false
  try {
    database.run('PRAGMA foreign_keys = ON')
    const result = await callback(database, () => { shouldSave = true })
    if (shouldSave || options?.save) await saveDatabase(databasePath, database)
    return result
  } finally {
    database.close()
  }
}

async function withWriteTransaction(databasePath, callback) {
  return withDatabase(databasePath, { save: true }, async (database, markDirty) => {
    initializeSchemaInDatabase(database)
    database.run('BEGIN')
    try {
      const result = await callback(database)
      database.run('COMMIT')
      markDirty()
      return result
    } catch (error) {
      database.run('ROLLBACK')
      throw error
    }
  })
}

function createProjectRows(input) {
  const id = createProjectStorageId()
  const name = String(input.name || '').trim() || '未命名项目'
  const project = {
    id,
    name,
    description: String(input.description || '').trim(),
    mode: 'local',
    status: 'active',
    object_key_prefix: `objects/${sanitizeObjectKeyPart(name)}`,
    created_at: input.now,
    updated_at: input.now,
    metadata_json: null,
  }
  const settings = {
    project_id: id,
    storage_provider: 'local',
    database_provider: 'sqlite',
    local_object_root: input.localObjectRoot,
    remote_database_profile_id: null,
    remote_storage_profile_id: null,
    last_verified_at: null,
    updated_at: input.now,
  }
  return { project, settings }
}

function createRemoteProjectRows(input) {
  const id = input.id || createProjectStorageId()
  const name = String(input.name || '').trim() || '未命名项目'
  const project = {
    id,
    name,
    description: String(input.description || '').trim(),
    mode: 'remote',
    status: 'active',
    object_key_prefix: `objects/${sanitizeObjectKeyPart(name)}`,
    created_at: input.now,
    updated_at: input.now,
    metadata_json: null,
  }
  const settings = {
    project_id: id,
    storage_provider: 'qiniu_kodo',
    database_provider: input.databaseProvider,
    local_object_root: null,
    remote_database_profile_id: null,
    remote_storage_profile_id: null,
    last_verified_at: input.now,
    updated_at: input.now,
  }
  return { project, settings }
}

class LocalProjectRepository {
  constructor(databasePath) {
    this.databasePath = databasePath
  }

  async initializeSchema() {
    await withWriteTransaction(this.databasePath, async () => {})
  }

  async createProject(input) {
    const rows = createProjectRows(input)
    await withWriteTransaction(this.databasePath, async (database) => {
      upsertRow(database, 'projects', rows.project)
      upsertRow(database, 'project_settings', rows.settings)
    })
    return rows
  }

  async createRemoteProject(input) {
    const rows = createRemoteProjectRows(input)
    await withWriteTransaction(this.databasePath, async (database) => {
      upsertRow(database, 'projects', rows.project)
      upsertRow(database, 'project_settings', rows.settings)
    })
    return rows
  }

  async updateProject(projectId, input) {
    await withWriteTransaction(this.databasePath, async (database) => {
      database.run(
        'UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?',
        [
          String(input.name || '').trim() || '未命名项目',
          String(input.description || '').trim(),
          input.updatedAt,
          projectId,
        ],
      )
      database.run(
        [
          'UPDATE project_settings SET',
          'database_provider = COALESCE(?, database_provider),',
          'remote_database_profile_id = NULL,',
          'remote_storage_profile_id = NULL,',
          'updated_at = ?',
          'WHERE project_id = ?',
        ].join(' '),
        [
          input.databaseProvider || null,
          input.updatedAt,
          projectId,
        ],
      )
    })
    return this.getProject(projectId)
  }

  async listProjects() {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return allRows(database, `SELECT ${selectColumns('projects')} FROM projects ORDER BY created_at ASC`)
    })
  }

  async getProject(projectId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      const project = firstRow(database, `SELECT ${selectColumns('projects')} FROM projects WHERE id = ?`, [projectId])
      if (!project) return null
      const settings = firstRow(database, `SELECT ${selectColumns('project_settings')} FROM project_settings WHERE project_id = ?`, [projectId])
      if (!settings) return null
      return { project, settings }
    })
  }

  async importProjectRows(rows) {
    await withWriteTransaction(this.databasePath, async (database) => {
      database.run('DELETE FROM projects WHERE id = ?', [rows.project.id])
      upsertRow(database, 'projects', rows.project)
      upsertRow(database, 'project_settings', rows.settings)
      for (const [rowSetName, tableName] of rowSetTables) {
        upsertRows(database, tableName, rows[rowSetName] || [])
      }
    })
  }

  async exportProjectRows(projectId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      const project = firstRow(database, `SELECT ${selectColumns('projects')} FROM projects WHERE id = ?`, [projectId])
      const settings = firstRow(database, `SELECT ${selectColumns('project_settings')} FROM project_settings WHERE project_id = ?`, [projectId])
      if (!project || !settings) return null
      const result = { project, settings }
      for (const [rowSetName, tableName] of rowSetTables) {
        const rows = allRows(database, `SELECT ${selectColumns(tableName)} FROM ${tableName} WHERE project_id = ? ORDER BY rowid ASC`, [projectId])
        result[rowSetName] = rows.map(normalizeBooleanRow)
      }
      return result
    })
  }

  async listAssets(projectId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return allRows(database, `SELECT ${selectColumns('assets')} FROM assets WHERE project_id = ? ORDER BY rowid ASC`, [projectId])
    })
  }

  async addCleanupTasks(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) return
    await withWriteTransaction(this.databasePath, async (database) => {
      upsertRows(database, 'deleted_project_cleanup_tasks', tasks)
    })
  }

  async listCleanupTasks(projectId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return allRows(database, `SELECT ${selectColumns('deleted_project_cleanup_tasks')} FROM deleted_project_cleanup_tasks WHERE project_id = ? ORDER BY created_at ASC`, [projectId])
    })
  }

  async listDocumentCollections(projectId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return allRows(
        database,
        `SELECT ${selectColumns('document_collections')} FROM document_collections WHERE project_id = ? ORDER BY created_at ASC`,
        [projectId],
      )
    })
  }

  async getDocumentCollection(projectId, collectionId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return firstRow(
        database,
        `SELECT ${selectColumns('document_collections')} FROM document_collections WHERE project_id = ? AND id = ?`,
        [projectId, collectionId],
      )
    })
  }

  async deleteDocumentCollection(projectId, collectionId) {
    await withWriteTransaction(this.databasePath, async (database) => {
      deleteDocumentCollectionRows(database, projectId, collectionId)
    })
  }

  async listDocumentSources(projectId, collectionId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return allRows(
        database,
        `SELECT ${selectColumns('document_sources')} FROM document_sources WHERE project_id = ? AND collection_id = ? ORDER BY created_at ASC`,
        [projectId, collectionId],
      )
    })
  }

  async getDocumentSourceContent(projectId, sourceId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return firstRow(
        database,
        `SELECT ${selectColumns('document_source_contents')} FROM document_source_contents WHERE project_id = ? AND source_id = ?`,
        [projectId, sourceId],
      )
    })
  }

  async replaceDocumentGraph(input) {
    await withWriteTransaction(this.databasePath, async (database) => {
      deleteDocumentCollectionRows(database, input.projectId, input.collection.id)
      upsertRow(database, 'document_collections', input.collection)
      upsertRows(database, 'document_sources', input.sources || [])
      upsertRows(database, 'document_source_contents', input.sourceContents || [])
      upsertRows(database, 'document_records', input.records || [])
      upsertRows(database, 'document_nodes', input.nodes || [])
      upsertRows(database, 'document_edges', input.edges || [])
      upsertRows(database, 'document_node_record_links', input.nodeRecordLinks || [])
      upsertRows(database, 'document_edge_record_links', input.edgeRecordLinks || [])
      upsertRow(database, 'document_import_runs', input.importRun)
    })
    return { collection: input.collection, importRun: input.importRun }
  }

  async getDocumentCollectionGraph(projectId, collectionId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      const records = allRows(
        database,
        `SELECT ${selectColumns('document_records')} FROM document_records WHERE project_id = ? AND collection_id = ?`,
        [projectId, collectionId],
      )
      const recordsById = new Map(records.map((record) => [record.id, record]))
      const recordIdsByNodeId = groupRowsByKey(allRows(
        database,
        'SELECT node_id, record_id FROM document_node_record_links WHERE project_id = ? AND collection_id = ? ORDER BY rowid ASC',
        [projectId, collectionId],
      ), 'node_id', 'record_id')
      const recordIdsByEdgeId = groupRowsByKey(allRows(
        database,
        'SELECT edge_id, record_id FROM document_edge_record_links WHERE project_id = ? AND collection_id = ? ORDER BY rowid ASC',
        [projectId, collectionId],
      ), 'edge_id', 'record_id')
      const nodes = Object.fromEntries(allRows(
        database,
        `SELECT ${selectColumns('document_nodes')} FROM document_nodes WHERE project_id = ? AND collection_id = ? ORDER BY rowid ASC`,
        [projectId, collectionId],
      ).map((node) => {
        const recordIds = recordIdsByNodeId.get(node.id) || []
        const firstRecord = recordIds.map((recordId) => recordsById.get(recordId)).find(Boolean)
        return [node.id, {
          id: node.id,
          label: node.label,
          type: node.node_type,
          records: recordIds,
          data: {
            ...parseJsonObject(node.metadata_json),
            ...(firstRecord ? { term_record: documentRecordGraphData(firstRecord) } : {}),
          },
        }]
      }))
      const edges = Object.fromEntries(allRows(
        database,
        `SELECT ${selectColumns('document_edges')} FROM document_edges WHERE project_id = ? AND collection_id = ? ORDER BY rowid ASC`,
        [projectId, collectionId],
      ).map((edge) => [edge.id, {
        id: edge.id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        type: edge.edge_type,
        label: edge.label,
        weight: edge.weight,
        record_ids: recordIdsByEdgeId.get(edge.id) || [],
        source_kind: edge.source_kind,
      }]))
      return { nodes, edges }
    })
  }

  async searchDocumentRecords(input) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      const search = documentSearchWhere(input)
      const total = firstRow(database, `SELECT COUNT(*) AS total FROM document_records WHERE ${search.where}`, search.params)?.total ?? 0
      const items = allRows(
        database,
        `SELECT ${selectColumns('document_records')} FROM document_records WHERE ${search.where} ORDER BY title ASC LIMIT ?`,
        [...search.params, normalizeDocumentLimit(input.limit)],
      )
      return { items, total: Number(total) }
    })
  }

  async searchDocumentNodes(input) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      const search = documentSearchWhere(input)
      const total = firstRow(database, `SELECT COUNT(*) AS total FROM document_nodes WHERE ${search.where}`, search.params)?.total ?? 0
      const items = allRows(
        database,
        `SELECT ${selectColumns('document_nodes')} FROM document_nodes WHERE ${search.where} ORDER BY label ASC LIMIT ?`,
        [...search.params, normalizeDocumentLimit(input.limit)],
      )
      return { items, total: Number(total) }
    })
  }

  async getDocumentNode(projectId, nodeId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      const node = firstRow(
        database,
        `SELECT ${selectColumns('document_nodes')} FROM document_nodes WHERE project_id = ? AND id = ?`,
        [projectId, nodeId],
      )
      if (!node) return null
      const records = allRows(
        database,
        [
          `SELECT ${tableDefinitions.document_records.columns.map((column) => `records.${column}`).join(', ')}`,
          'FROM document_records records',
          'INNER JOIN document_node_record_links links ON links.record_id = records.id',
          'WHERE links.project_id = ? AND links.node_id = ?',
          'ORDER BY records.title ASC',
        ].join(' '),
        [projectId, nodeId],
      )
      return { node, records }
    })
  }

  async listDocumentNeighbors(projectId, nodeId) {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      const edges = allRows(
        database,
        `SELECT ${selectColumns('document_edges')} FROM document_edges WHERE project_id = ? AND (source_node_id = ? OR target_node_id = ?) ORDER BY label ASC`,
        [projectId, nodeId, nodeId],
      )
      return edges.flatMap((edge) => {
        const direction = edge.source_node_id === nodeId ? 'outgoing' : 'incoming'
        const neighborNodeId = direction === 'outgoing' ? edge.target_node_id : edge.source_node_id
        const node = firstRow(
          database,
          `SELECT ${selectColumns('document_nodes')} FROM document_nodes WHERE project_id = ? AND id = ?`,
          [projectId, neighborNodeId],
        )
        return node ? [{ edge, node, direction }] : []
      })
    })
  }

  async deleteProject(projectId) {
    await withWriteTransaction(this.databasePath, async (database) => {
      database.run('DELETE FROM projects WHERE id = ?', [projectId])
      database.run('DELETE FROM project_device_bindings WHERE project_id = ?', [projectId])
    })
  }

  async list() {
    return withDatabase(this.databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      const rows = allRows(
        database,
        'SELECT project_id, database_profile_id, storage_profile_id FROM project_device_bindings ORDER BY project_id ASC',
      )
      return Object.fromEntries(rows.map((row) => [
        row.project_id,
        {
          databaseProfileId: row.database_profile_id,
          storageProfileId: row.storage_profile_id,
        },
      ]))
    })
  }

  async write(projectId, binding) {
    const normalizedProjectId = String(projectId || '').trim()
    const databaseProfileId = String(binding?.databaseProfileId || '').trim()
    const storageProfileId = String(binding?.storageProfileId || '').trim()
    if (!normalizedProjectId || !databaseProfileId || !storageProfileId) return
    const now = new Date().toISOString()
    await withWriteTransaction(this.databasePath, async (database) => {
      database.run(
        [
          'INSERT INTO project_device_bindings',
          '(project_id, database_profile_id, storage_profile_id, bound_at, updated_at)',
          'VALUES (?, ?, ?, ?, ?)',
          'ON CONFLICT (project_id) DO UPDATE SET',
          'database_profile_id = excluded.database_profile_id,',
          'storage_profile_id = excluded.storage_profile_id,',
          'updated_at = excluded.updated_at',
        ].join(' '),
        [normalizedProjectId, databaseProfileId, storageProfileId, now, now],
      )
    })
  }

  async clear(projectId) {
    const normalizedProjectId = String(projectId || '').trim()
    if (!normalizedProjectId) return
    await withWriteTransaction(this.databasePath, async (database) => {
      database.run('DELETE FROM project_device_bindings WHERE project_id = ?', [normalizedProjectId])
    })
  }
}

function createLocalProjectRepository(databasePath) {
  return new LocalProjectRepository(databasePath)
}

module.exports = {
  LocalProjectRepository,
  createLocalProjectRepository,
  createProjectSchemaSql,
}
