const {
  allRows,
  firstRow,
  selectColumns,
  upsertRow,
  upsertRows,
  withDatabase,
  withWriteTransaction,
} = require('./projectLocalDatabase.cjs')
const { createLocalDeviceBindingRepository } = require('./projectLocalDeviceBindingRepository.cjs')
const { createLocalDocumentRepository } = require('./projectLocalDocumentRepository.cjs')
const { rowSetTables, tableDefinitions } = require('./projectRemoteRepositorySql.cjs')
const {
  createProjectSchemaSql,
  initializeSchemaInDatabase,
} = require('./projectLocalSchema.cjs')
const {
  createProjectRows,
  createRemoteProjectRows,
  normalizeBooleanRow,
} = require('./projectRepositoryRows.cjs')

class LocalProjectRepository {
  constructor(databasePath) {
    this.databasePath = databasePath
    this.deviceBindings = createLocalDeviceBindingRepository({
      allRows,
      databasePath,
      initializeSchemaInDatabase,
      withDatabase,
      withWriteTransaction,
    })
    this.documents = createLocalDocumentRepository({
      allRows,
      databasePath,
      firstRow,
      initializeSchemaInDatabase,
      selectColumns,
      tableDefinitions,
      upsertRow,
      upsertRows,
      withDatabase,
      withWriteTransaction,
    })
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
    await withWriteTransaction(this.databasePath, async (database) => {
      database.run('DELETE FROM projects WHERE id = ?', [projectId])
      database.run('DELETE FROM project_device_bindings WHERE project_id = ?', [projectId])
    })
  }

  async list() {
    return this.deviceBindings.list()
  }

  async write(projectId, binding) {
    await this.deviceBindings.write(projectId, binding)
  }

  async clear(projectId) {
    await this.deviceBindings.clear(projectId)
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
