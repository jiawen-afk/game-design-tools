const {
  documentCollectionColumnForTable,
  documentCollectionTables,
  normalizeDocumentLimit,
} = require('./projectDocumentGraphModel.cjs')
const {
  getLocalDocumentCollectionGraph,
  getLocalDocumentNode,
  listLocalDocumentNeighbors,
} = require('./projectLocalDocumentGraphQueries.cjs')

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

function deleteDocumentCollectionRows(database, projectId, collectionId) {
  for (const tableName of documentCollectionTables) {
    database.run(`DELETE FROM ${tableName} WHERE project_id = ? AND ${documentCollectionColumnForTable(tableName)} = ?`, [
      projectId,
      collectionId,
    ])
  }
}

class LocalDocumentRepository {
  constructor(context) {
    this.context = context
  }

  async listDocumentCollections(projectId) {
    const { allRows, databasePath, initializeSchemaInDatabase, selectColumns, withDatabase } = this.context
    return withDatabase(databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return allRows(
        database,
        `SELECT ${selectColumns('document_collections')} FROM document_collections WHERE project_id = ? ORDER BY created_at ASC`,
        [projectId],
      )
    })
  }

  async getDocumentCollection(projectId, collectionId) {
    const { databasePath, firstRow, initializeSchemaInDatabase, selectColumns, withDatabase } = this.context
    return withDatabase(databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return firstRow(
        database,
        `SELECT ${selectColumns('document_collections')} FROM document_collections WHERE project_id = ? AND id = ?`,
        [projectId, collectionId],
      )
    })
  }

  async deleteDocumentCollection(projectId, collectionId) {
    const { databasePath, withWriteTransaction } = this.context
    await withWriteTransaction(databasePath, async (database) => {
      deleteDocumentCollectionRows(database, projectId, collectionId)
    })
  }

  async listDocumentSources(projectId, collectionId) {
    const { allRows, databasePath, initializeSchemaInDatabase, selectColumns, withDatabase } = this.context
    return withDatabase(databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return allRows(
        database,
        `SELECT ${selectColumns('document_sources')} FROM document_sources WHERE project_id = ? AND collection_id = ? ORDER BY created_at ASC`,
        [projectId, collectionId],
      )
    })
  }

  async getDocumentSourceContent(projectId, sourceId) {
    const { databasePath, firstRow, initializeSchemaInDatabase, selectColumns, withDatabase } = this.context
    return withDatabase(databasePath, {}, async (database) => {
      initializeSchemaInDatabase(database)
      return firstRow(
        database,
        `SELECT ${selectColumns('document_source_contents')} FROM document_source_contents WHERE project_id = ? AND source_id = ?`,
        [projectId, sourceId],
      )
    })
  }

  async replaceDocumentGraph(input) {
    const { databasePath, upsertRow, upsertRows, withWriteTransaction } = this.context
    await withWriteTransaction(databasePath, async (database) => {
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
    return getLocalDocumentCollectionGraph(this.context, projectId, collectionId)
  }

  async searchDocumentRecords(input) {
    const { allRows, databasePath, firstRow, initializeSchemaInDatabase, selectColumns, withDatabase } = this.context
    return withDatabase(databasePath, {}, async (database) => {
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
    const { allRows, databasePath, firstRow, initializeSchemaInDatabase, selectColumns, withDatabase } = this.context
    return withDatabase(databasePath, {}, async (database) => {
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
    return getLocalDocumentNode(this.context, projectId, nodeId)
  }

  async listDocumentNeighbors(projectId, nodeId) {
    return listLocalDocumentNeighbors(this.context, projectId, nodeId)
  }
}

function createLocalDocumentRepository(context) {
  return new LocalDocumentRepository(context)
}

module.exports = {
  LocalDocumentRepository,
  createLocalDocumentRepository,
  deleteDocumentCollectionRows,
}
