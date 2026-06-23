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

function initializeSchemaInDatabase(database) {
  database.run('PRAGMA foreign_keys = ON')
  for (const statement of createProjectSchemaSql()) database.run(statement)
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
    remote_database_profile_id: input.databaseProfileId,
    remote_storage_profile_id: input.storageProfileId,
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

  async deleteProject(projectId) {
    await withWriteTransaction(this.databasePath, async (database) => {
      database.run('DELETE FROM projects WHERE id = ?', [projectId])
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
