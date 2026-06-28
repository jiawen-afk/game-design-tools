const {
  normalizeDatabasePayload,
} = require('./projectRemoteDatabase.cjs')
const {
  createProjectRemoteSchemaMigrationSql,
  createProjectRemoteSchemaSql,
} = require('./projectRemoteSchema.cjs')
const {
  buildUpsertSql,
  deleteProjectRows,
  parameter,
  rowSetTables,
  selectSql,
  tableDefinitions,
  upsertRow,
  upsertRows,
} = require('./projectRemoteRepositorySql.cjs')
const {
  createRemoteDocumentRepository,
} = require('./projectRemoteDocumentRepository.cjs')
const {
  withRunner,
  withTransaction,
} = require('./projectRemoteRunner.cjs')
const { createRemoteProjectRows } = require('./projectRepositoryRows.cjs')

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

class RemoteProjectRepository {
  constructor(profile, options = {}) {
    this.profile = profile
    this.options = options
    this.documents = createRemoteDocumentRepository({
      withRunner: (callback) => withRunner(this.profile, this.options, callback),
      withTransaction: (callback) => withTransaction(this.profile, this.options, callback),
      withSchemaRepair: (callback) => this.withSchemaRepair(callback),
    })
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
    return this.documents.listDocumentCollections(projectId)
  }

  async getDocumentCollection(projectId, collectionId) {
    return this.documents.getDocumentCollection(projectId, collectionId)
  }

  async deleteDocumentCollection(projectId, collectionId) {
    await this.documents.deleteDocumentCollection(projectId, collectionId)
  }

  async listDocumentSources(projectId, collectionId) {
    return this.documents.listDocumentSources(projectId, collectionId)
  }

  async getDocumentSourceContent(projectId, sourceId) {
    return this.documents.getDocumentSourceContent(projectId, sourceId)
  }

  async replaceDocumentGraph(input) {
    return this.documents.replaceDocumentGraph(input)
  }

  async getDocumentCollectionGraph(projectId, collectionId) {
    return this.documents.getDocumentCollectionGraph(projectId, collectionId)
  }

  async searchDocumentRecords(input) {
    return this.documents.searchDocumentRecords(input)
  }

  async searchDocumentNodes(input) {
    return this.documents.searchDocumentNodes(input)
  }

  async getDocumentNode(projectId, nodeId) {
    return this.documents.getDocumentNode(projectId, nodeId)
  }

  async listDocumentNeighbors(projectId, nodeId) {
    return this.documents.listDocumentNeighbors(projectId, nodeId)
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
