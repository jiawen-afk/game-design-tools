const { normalizeDatabasePayload } = require('./projectRemoteDatabase.cjs')
const {
  attachPostgresConnectionErrorSink,
  throwIfPostgresConnectionErrored,
} = require('./projectPostgresConnection.cjs')

const tableDefinitions = {
  projects: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'name',
      'description',
      'mode',
      'status',
      'object_key_prefix',
      'created_at',
      'updated_at',
      'metadata_json',
    ],
  },
  project_settings: {
    conflictColumns: ['project_id'],
    columns: [
      'project_id',
      'storage_provider',
      'database_provider',
      'local_object_root',
      'remote_database_profile_id',
      'remote_storage_profile_id',
      'last_verified_at',
      'updated_at',
    ],
  },
  asset_groups: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'kind',
      'name',
      'starred',
      'sort_order',
      'created_at',
      'updated_at',
    ],
  },
  assets: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'kind',
      'asset_subtype',
      'group_id',
      'name',
      'dialogue_text',
      'source_key',
      'primary_resource_id',
      'primary_object_key',
      'primary_file_name',
      'primary_mime_group',
      'primary_mime_type',
      'primary_extension',
      'primary_size_bytes',
      'primary_hash_sha256',
      'sprite_index_resource_id',
      'sprite_index_object_key',
      'sprite_index_file_name',
      'sprite_index_mime_type',
      'sprite_index_size_bytes',
      'sprite_index_hash_sha256',
      'sprite_frame_width',
      'sprite_frame_height',
      'sprite_sheet_width',
      'sprite_sheet_height',
      'sprite_fps',
      'sprite_frame_count',
      'created_at',
      'updated_at',
      'metadata_json',
    ],
  },
  characters: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'name',
      'starred',
      'sort_order',
      'created_at',
      'updated_at',
    ],
  },
  character_asset_links: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'character_id',
      'asset_id',
      'column_kind',
      'sort_order',
      'created_at',
      'updated_at',
    ],
  },
  storyboard_groups: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'name',
      'starred',
      'created_at',
      'updated_at',
    ],
  },
  storyboard_voice_entries: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'storyboard_id',
      'asset_id',
      'character_id',
      'text',
      'start_offset_us',
      'sort_order',
      'created_at',
      'updated_at',
    ],
  },
  asset_relations: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'source_asset_id',
      'target_asset_id',
      'relation_type',
      'created_at',
    ],
  },
  deleted_project_cleanup_tasks: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'storage_provider',
      'object_key',
      'status',
      'error_message',
      'created_at',
      'updated_at',
    ],
  },
}

const rowSetTables = [
  ['assetGroups', 'asset_groups'],
  ['assets', 'assets'],
  ['characters', 'characters'],
  ['characterAssetLinks', 'character_asset_links'],
  ['storyboardGroups', 'storyboard_groups'],
  ['storyboardVoiceEntries', 'storyboard_voice_entries'],
  ['assetRelations', 'asset_relations'],
]

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

function parameter(dialect, index) {
  return dialect === 'postgresql' ? `$${index}` : '?'
}

function buildUpsertSql(dialect, tableName, definition) {
  const columns = definition.columns
  const values = columns.map((_column, index) => parameter(dialect, index + 1)).join(', ')
  const updateColumns = columns.filter((column) => !definition.conflictColumns.includes(column))
  if (dialect === 'postgresql') {
    return [
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values})`,
      `ON CONFLICT (${definition.conflictColumns.join(', ')}) DO UPDATE SET`,
      updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', '),
    ].join(' ')
  }
  return [
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values})`,
    'ON DUPLICATE KEY UPDATE',
    updateColumns.map((column) => `${column} = VALUES(${column})`).join(', '),
  ].join(' ')
}

function rowValues(definition, row) {
  return definition.columns.map((column) => row[column] ?? null)
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

function sanitizeObjectKeyPart(value) {
  return (String(value || '').trim() || 'unnamed').replace(/[\\/]+/g, '_').replace(/\s+/g, '_')
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

async function upsertRow(runner, tableName, row) {
  const definition = tableDefinitions[tableName]
  await runner.execute(
    buildUpsertSql(runner.dialect, tableName, definition),
    rowValues(definition, row),
  )
}

async function upsertRows(runner, tableName, rows) {
  for (const row of rows) {
    await upsertRow(runner, tableName, row)
  }
}

async function deleteProjectRows(runner, projectId) {
  for (const [, tableName] of [...rowSetTables].reverse()) {
    await runner.execute(`DELETE FROM ${tableName} WHERE project_id = ${parameter(runner.dialect, 1)}`, [projectId])
  }
  await runner.execute(`DELETE FROM project_settings WHERE project_id = ${parameter(runner.dialect, 1)}`, [projectId])
  await runner.execute(`DELETE FROM projects WHERE id = ${parameter(runner.dialect, 1)}`, [projectId])
}

function createRemoteProjectRows(input) {
  const id = input.id
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

function selectSql(dialect, tableName, whereColumn) {
  const definition = tableDefinitions[tableName]
  return `SELECT ${definition.columns.join(', ')} FROM ${tableName} WHERE ${whereColumn} = ${parameter(dialect, 1)}`
}

class RemoteProjectRepository {
  constructor(profile, options = {}) {
    this.profile = profile
    this.options = options
  }

  async initializeSchema() {}

  async createProject() {
    throw new Error('远程仓库不支持创建本地项目。')
  }

  async createRemoteProject(input) {
    const rows = createRemoteProjectRows(input)
    await withTransaction(this.profile, this.options, async (runner) => {
      await upsertRow(runner, 'projects', rows.project)
      await upsertRow(runner, 'project_settings', rows.settings)
    })
    return rows
  }

  async updateProject(projectId, input) {
    await withRunner(this.profile, this.options, async (runner) => {
      const statement = [
        'UPDATE projects SET',
        `name = ${parameter(runner.dialect, 1)},`,
        `description = ${parameter(runner.dialect, 2)},`,
        `updated_at = ${parameter(runner.dialect, 3)}`,
        `WHERE id = ${parameter(runner.dialect, 4)}`,
      ].join(' ')
      await runner.execute(statement, [
        String(input.name || '').trim() || '未命名项目',
        String(input.description || '').trim(),
        input.updatedAt,
        projectId,
      ])
      const settingsStatement = [
        'UPDATE project_settings SET',
        `database_provider = COALESCE(${parameter(runner.dialect, 1)}, database_provider),`,
        'remote_database_profile_id = NULL,',
        'remote_storage_profile_id = NULL,',
        `updated_at = ${parameter(runner.dialect, 2)}`,
        `WHERE project_id = ${parameter(runner.dialect, 3)}`,
      ].join(' ')
      await runner.execute(settingsStatement, [
        input.databaseProvider || null,
        input.updatedAt,
        projectId,
      ])
    })
    return this.getProject(projectId)
  }

  async listProjects() {
    return withRunner(this.profile, this.options, async (runner) => (
      runner.queryRows(`SELECT ${tableDefinitions.projects.columns.join(', ')} FROM projects ORDER BY created_at ASC`)
    ))
  }

  async getProject(projectId) {
    return withRunner(this.profile, this.options, async (runner) => {
      const projects = await runner.queryRows(selectSql(runner.dialect, 'projects', 'id'), [projectId])
      if (projects.length === 0) return null
      const settingsRows = await runner.queryRows(selectSql(runner.dialect, 'project_settings', 'project_id'), [projectId])
      if (settingsRows.length === 0) return null
      return { project: projects[0], settings: settingsRows[0] }
    })
  }

  async importProjectRows(rows) {
    await withTransaction(this.profile, this.options, async (runner) => {
      await deleteProjectRows(runner, rows.project.id)
      await upsertRow(runner, 'projects', rows.project)
      await upsertRow(runner, 'project_settings', rows.settings)
      for (const [rowSetName, tableName] of rowSetTables) {
        await upsertRows(runner, tableName, rows[rowSetName] || [])
      }
    })
  }

  async exportProjectRows(projectId) {
    return withRunner(this.profile, this.options, async (runner) => {
      const projectRows = await runner.queryRows(selectSql(runner.dialect, 'projects', 'id'), [projectId])
      const settingsRows = await runner.queryRows(selectSql(runner.dialect, 'project_settings', 'project_id'), [projectId])
      if (projectRows.length === 0 || settingsRows.length === 0) return null
      const result = {
        project: projectRows[0],
        settings: settingsRows[0],
      }
      for (const [rowSetName, tableName] of rowSetTables) {
        result[rowSetName] = await runner.queryRows(selectSql(runner.dialect, tableName, 'project_id'), [projectId])
      }
      return result
    })
  }

  async listAssets(projectId) {
    return withRunner(this.profile, this.options, async (runner) => (
      runner.queryRows(selectSql(runner.dialect, 'assets', 'project_id'), [projectId])
    ))
  }

  async addCleanupTasks(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) return
    await withTransaction(this.profile, this.options, async (runner) => {
      await upsertRows(runner, 'deleted_project_cleanup_tasks', tasks)
    })
  }

  async listCleanupTasks(projectId) {
    return withRunner(this.profile, this.options, async (runner) => (
      runner.queryRows(selectSql(runner.dialect, 'deleted_project_cleanup_tasks', 'project_id'), [projectId])
    ))
  }

  async deleteProject(projectId) {
    await withTransaction(this.profile, this.options, async (runner) => {
      await deleteProjectRows(runner, projectId)
    })
  }
}

function createRemoteProjectRepository(profile, options = {}) {
  return new RemoteProjectRepository(profile, options)
}

module.exports = {
  RemoteProjectRepository,
  buildUpsertSql,
  createRemoteProjectRepository,
  tableDefinitions,
}
