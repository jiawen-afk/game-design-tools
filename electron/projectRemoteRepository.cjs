const {
  createProjectRemoteSchemaMigrationSql,
  createProjectRemoteSchemaSql,
  normalizeDatabasePayload,
} = require('./projectRemoteDatabase.cjs')
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
      'cover_resource_id',
      'cover_object_key',
      'cover_file_name',
      'cover_mime_type',
      'cover_size_bytes',
      'cover_hash_sha256',
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
  document_collections: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'name',
      'description',
      'source_type',
      'status',
      'record_count',
      'node_count',
      'edge_count',
      'created_at',
      'updated_at',
      'imported_at',
      'metadata_json',
    ],
  },
  document_sources: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'collection_id',
      'role',
      'file_name',
      'mime_group',
      'mime_type',
      'extension',
      'size_bytes',
      'hash_sha256',
      'encoding',
      'created_at',
      'metadata_json',
    ],
  },
  document_source_contents: {
    conflictColumns: ['source_id'],
    columns: [
      'source_id',
      'project_id',
      'collection_id',
      'content_text',
      'content_encoding',
      'size_bytes',
      'hash_sha256',
      'created_at',
      'metadata_json',
    ],
  },
  document_records: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'collection_id',
      'source_id',
      'external_id',
      'record_type',
      'title',
      'description',
      'category_1',
      'category_2',
      'category_3',
      'place_path',
      'book_title',
      'chapter_title',
      'version_title',
      'usage_text',
      'effect_text',
      'source_url',
      'search_text',
      'created_at',
      'updated_at',
      'metadata_json',
    ],
  },
  document_nodes: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'collection_id',
      'external_id',
      'node_type',
      'label',
      'description',
      'search_text',
      'created_at',
      'updated_at',
      'metadata_json',
    ],
  },
  document_edges: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'collection_id',
      'external_id',
      'source_node_id',
      'target_node_id',
      'edge_type',
      'label',
      'weight',
      'source_kind',
      'created_at',
      'metadata_json',
    ],
  },
  document_node_record_links: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'collection_id',
      'node_id',
      'record_id',
      'link_role',
      'created_at',
    ],
  },
  document_edge_record_links: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'collection_id',
      'edge_id',
      'record_id',
      'created_at',
    ],
  },
  document_import_runs: {
    conflictColumns: ['id'],
    columns: [
      'id',
      'project_id',
      'collection_id',
      'source_type',
      'status',
      'started_at',
      'finished_at',
      'total_records',
      'total_nodes',
      'total_edges',
      'imported_records',
      'imported_nodes',
      'imported_edges',
      'error_message',
      'report_json',
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

const maxBatchParameters = 12000

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
  return buildBulkUpsertSql(dialect, tableName, definition, 1)
}

function buildBulkUpsertSql(dialect, tableName, definition, rowCount) {
  const columns = definition.columns
  const values = Array.from({ length: rowCount }, (_row, rowIndex) => {
    const offset = rowIndex * columns.length
    return `(${columns.map((_column, columnIndex) => parameter(dialect, offset + columnIndex + 1)).join(', ')})`
  }).join(', ')
  const updateColumns = columns.filter((column) => !definition.conflictColumns.includes(column))
  if (dialect === 'postgresql') {
    return [
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${values}`,
      `ON CONFLICT (${definition.conflictColumns.join(', ')}) DO UPDATE SET`,
      updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', '),
    ].join(' ')
  }
  return [
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${values}`,
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
  if (!Array.isArray(rows) || rows.length === 0) return
  const definition = tableDefinitions[tableName]
  const batchSize = Math.max(1, Math.floor(maxBatchParameters / definition.columns.length))
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize)
    await runner.execute(
      buildBulkUpsertSql(runner.dialect, tableName, definition, batch.length),
      batch.flatMap((row) => rowValues(definition, row)),
    )
  }
}

function isMysqlIdempotentSchemaError(error, statement) {
  const code = String(error?.code || '')
  return (code === 'ER_DUP_KEYNAME' && /^CREATE\s+INDEX\b/i.test(statement))
    || (code === 'ER_DUP_FIELDNAME' && /^ALTER\s+TABLE\s+\S+\s+ADD\s+COLUMN\b/i.test(statement))
}

function isMissingSchemaError(error) {
  const code = String(error?.code || '')
  const errno = Number(error?.errno || 0)
  const message = String(error?.message || error || '')
  return code === '42P01'
    || code === 'ER_NO_SUCH_TABLE'
    || errno === 1146
    || /relation\s+"?[\w_]+"?\s+does not exist/i.test(message)
    || /table\s+'.+'\s+doesn't exist/i.test(message)
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

function normalizeDocumentLimit(limit) {
  const value = Number(limit)
  if (!Number.isFinite(value)) return 50
  return Math.max(1, Math.min(200, Math.floor(value)))
}

function documentSearchWhere(dialect, input) {
  const where = []
  const params = []
  const add = (clause, value) => {
    params.push(value)
    where.push(clause(parameter(dialect, params.length)))
  }
  add((placeholder) => `project_id = ${placeholder}`, input.projectId)
  if (input.collectionId) add((placeholder) => `collection_id = ${placeholder}`, input.collectionId)
  if (input.nodeType) add((placeholder) => `node_type = ${placeholder}`, input.nodeType)
  const query = String(input.query || '').trim()
  if (query) add((placeholder) => `search_text LIKE ${placeholder}`, `%${query}%`)
  return { where: where.join(' AND '), params }
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
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
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

async function deleteDocumentCollectionRows(runner, projectId, collectionId) {
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
    const collectionColumn = tableName === 'document_collections' ? 'id' : 'collection_id'
    await runner.execute(
      `DELETE FROM ${tableName} WHERE project_id = ${parameter(runner.dialect, 1)} AND ${collectionColumn} = ${parameter(runner.dialect, 2)}`,
      [projectId, collectionId],
    )
  }
}

class RemoteProjectRepository {
  constructor(profile, options = {}) {
    this.profile = profile
    this.options = options
  }

  async initializeSchema() {
    const payload = normalizeDatabasePayload(this.profile)
    const statements = [
      ...createProjectRemoteSchemaSql(payload.provider),
      ...createProjectRemoteSchemaMigrationSql(payload.provider),
    ]
    await withRunner(this.profile, this.options, async (runner) => {
      for (const statement of statements) {
        try {
          await runner.execute(statement)
        } catch (error) {
          if (runner.dialect === 'mysql' && isMysqlIdempotentSchemaError(error, statement)) continue
          throw error
        }
      }
    })
  }

  async withSchemaRepair(callback) {
    try {
      return await callback()
    } catch (error) {
      if (!isMissingSchemaError(error)) throw error
      await this.initializeSchema()
      return callback()
    }
  }

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

  async listDocumentCollections(projectId) {
    return this.withSchemaRepair(() => withRunner(this.profile, this.options, async (runner) => (
      runner.queryRows(
        `SELECT ${tableDefinitions.document_collections.columns.join(', ')} FROM document_collections WHERE project_id = ${parameter(runner.dialect, 1)} ORDER BY created_at ASC`,
        [projectId],
      )
    )))
  }

  async getDocumentCollection(projectId, collectionId) {
    return this.withSchemaRepair(() => withRunner(this.profile, this.options, async (runner) => {
      const rows = await runner.queryRows(
        `SELECT ${tableDefinitions.document_collections.columns.join(', ')} FROM document_collections WHERE project_id = ${parameter(runner.dialect, 1)} AND id = ${parameter(runner.dialect, 2)}`,
        [projectId, collectionId],
      )
      return rows[0] || null
    }))
  }

  async deleteDocumentCollection(projectId, collectionId) {
    await this.withSchemaRepair(() => withTransaction(this.profile, this.options, async (runner) => {
      await deleteDocumentCollectionRows(runner, projectId, collectionId)
    }))
  }

  async listDocumentSources(projectId, collectionId) {
    return this.withSchemaRepair(() => withRunner(this.profile, this.options, async (runner) => (
      runner.queryRows(
        `SELECT ${tableDefinitions.document_sources.columns.join(', ')} FROM document_sources WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)} ORDER BY created_at ASC`,
        [projectId, collectionId],
      )
    )))
  }

  async getDocumentSourceContent(projectId, sourceId) {
    return this.withSchemaRepair(() => withRunner(this.profile, this.options, async (runner) => {
      const rows = await runner.queryRows(
        `SELECT ${tableDefinitions.document_source_contents.columns.join(', ')} FROM document_source_contents WHERE project_id = ${parameter(runner.dialect, 1)} AND source_id = ${parameter(runner.dialect, 2)}`,
        [projectId, sourceId],
      )
      return rows[0] || null
    }))
  }

  async replaceDocumentGraph(input) {
    await this.withSchemaRepair(() => withTransaction(this.profile, this.options, async (runner) => {
      await deleteDocumentCollectionRows(runner, input.projectId, input.collection.id)
      await upsertRow(runner, 'document_collections', input.collection)
      await upsertRows(runner, 'document_sources', input.sources || [])
      await upsertRows(runner, 'document_source_contents', input.sourceContents || [])
      await upsertRows(runner, 'document_records', input.records || [])
      await upsertRows(runner, 'document_nodes', input.nodes || [])
      await upsertRows(runner, 'document_edges', input.edges || [])
      await upsertRows(runner, 'document_node_record_links', input.nodeRecordLinks || [])
      await upsertRows(runner, 'document_edge_record_links', input.edgeRecordLinks || [])
      await upsertRow(runner, 'document_import_runs', input.importRun)
    }))
    return { collection: input.collection, importRun: input.importRun }
  }

  async getDocumentCollectionGraph(projectId, collectionId) {
    return this.withSchemaRepair(() => withRunner(this.profile, this.options, async (runner) => {
      const records = await runner.queryRows(
        `SELECT ${tableDefinitions.document_records.columns.join(', ')} FROM document_records WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)}`,
        [projectId, collectionId],
      )
      const recordsById = new Map(records.map((record) => [record.id, record]))
      const nodeLinks = await runner.queryRows(
        `SELECT node_id, record_id FROM document_node_record_links WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)} ORDER BY created_at ASC`,
        [projectId, collectionId],
      )
      const edgeLinks = await runner.queryRows(
        `SELECT edge_id, record_id FROM document_edge_record_links WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)} ORDER BY created_at ASC`,
        [projectId, collectionId],
      )
      const recordIdsByNodeId = groupRowsByKey(nodeLinks, 'node_id', 'record_id')
      const recordIdsByEdgeId = groupRowsByKey(edgeLinks, 'edge_id', 'record_id')
      const nodeRows = await runner.queryRows(
        `SELECT ${tableDefinitions.document_nodes.columns.join(', ')} FROM document_nodes WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)} ORDER BY label ASC`,
        [projectId, collectionId],
      )
      const edgeRows = await runner.queryRows(
        `SELECT ${tableDefinitions.document_edges.columns.join(', ')} FROM document_edges WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)} ORDER BY label ASC`,
        [projectId, collectionId],
      )
      const nodes = Object.fromEntries(nodeRows.map((node) => {
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
      const edges = Object.fromEntries(edgeRows.map((edge) => [edge.id, {
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
    }))
  }

  async searchDocumentRecords(input) {
    return this.withSchemaRepair(() => withRunner(this.profile, this.options, async (runner) => {
      const search = documentSearchWhere(runner.dialect, input)
      const totalRows = await runner.queryRows(
        `SELECT COUNT(*) AS total FROM document_records WHERE ${search.where}`,
        search.params,
      )
      const limitPlaceholder = parameter(runner.dialect, search.params.length + 1)
      const items = await runner.queryRows(
        `SELECT ${tableDefinitions.document_records.columns.join(', ')} FROM document_records WHERE ${search.where} ORDER BY title ASC LIMIT ${limitPlaceholder}`,
        [...search.params, normalizeDocumentLimit(input.limit)],
      )
      return { items, total: Number(totalRows[0]?.total ?? 0) }
    }))
  }

  async searchDocumentNodes(input) {
    return this.withSchemaRepair(() => withRunner(this.profile, this.options, async (runner) => {
      const search = documentSearchWhere(runner.dialect, input)
      const totalRows = await runner.queryRows(
        `SELECT COUNT(*) AS total FROM document_nodes WHERE ${search.where}`,
        search.params,
      )
      const limitPlaceholder = parameter(runner.dialect, search.params.length + 1)
      const items = await runner.queryRows(
        `SELECT ${tableDefinitions.document_nodes.columns.join(', ')} FROM document_nodes WHERE ${search.where} ORDER BY label ASC LIMIT ${limitPlaceholder}`,
        [...search.params, normalizeDocumentLimit(input.limit)],
      )
      return { items, total: Number(totalRows[0]?.total ?? 0) }
    }))
  }

  async getDocumentNode(projectId, nodeId) {
    return this.withSchemaRepair(() => withRunner(this.profile, this.options, async (runner) => {
      const nodes = await runner.queryRows(
        `SELECT ${tableDefinitions.document_nodes.columns.join(', ')} FROM document_nodes WHERE project_id = ${parameter(runner.dialect, 1)} AND id = ${parameter(runner.dialect, 2)}`,
        [projectId, nodeId],
      )
      if (nodes.length === 0) return null
      const records = await runner.queryRows(
        [
          `SELECT ${tableDefinitions.document_records.columns.map((column) => `records.${column}`).join(', ')}`,
          'FROM document_records records',
          'INNER JOIN document_node_record_links links ON links.record_id = records.id',
          `WHERE links.project_id = ${parameter(runner.dialect, 1)} AND links.node_id = ${parameter(runner.dialect, 2)}`,
          'ORDER BY records.title ASC',
        ].join(' '),
        [projectId, nodeId],
      )
      return { node: nodes[0], records }
    }))
  }

  async listDocumentNeighbors(projectId, nodeId) {
    return this.withSchemaRepair(() => withRunner(this.profile, this.options, async (runner) => {
      const edges = await runner.queryRows(
        `SELECT ${tableDefinitions.document_edges.columns.join(', ')} FROM document_edges WHERE project_id = ${parameter(runner.dialect, 1)} AND (source_node_id = ${parameter(runner.dialect, 2)} OR target_node_id = ${parameter(runner.dialect, 3)}) ORDER BY label ASC`,
        [projectId, nodeId, nodeId],
      )
      const neighbors = []
      for (const edge of edges) {
        const direction = edge.source_node_id === nodeId ? 'outgoing' : 'incoming'
        const neighborNodeId = direction === 'outgoing' ? edge.target_node_id : edge.source_node_id
        const nodes = await runner.queryRows(
          `SELECT ${tableDefinitions.document_nodes.columns.join(', ')} FROM document_nodes WHERE project_id = ${parameter(runner.dialect, 1)} AND id = ${parameter(runner.dialect, 2)}`,
          [projectId, neighborNodeId],
        )
        if (nodes[0]) neighbors.push({ edge, node: nodes[0], direction })
      }
      return neighbors
    }))
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
