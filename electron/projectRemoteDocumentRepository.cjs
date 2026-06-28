const {
  parameter,
  tableDefinitions,
  upsertRow,
  upsertRows,
} = require('./projectRemoteRepositorySql.cjs')
const {
  documentCollectionColumnForTable,
  documentCollectionTables,
  normalizeDocumentLimit,
} = require('./projectDocumentGraphModel.cjs')
const {
  getRemoteDocumentCollectionGraph,
  getRemoteDocumentNode,
  listRemoteDocumentNeighbors,
} = require('./projectRemoteDocumentGraphQueries.cjs')

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

async function deleteDocumentCollectionRows(runner, projectId, collectionId) {
  for (const tableName of documentCollectionTables) {
    const collectionColumn = documentCollectionColumnForTable(tableName)
    await runner.execute(
      `DELETE FROM ${tableName} WHERE project_id = ${parameter(runner.dialect, 1)} AND ${collectionColumn} = ${parameter(runner.dialect, 2)}`,
      [projectId, collectionId],
    )
  }
}

class RemoteDocumentRepository {
  constructor(context) {
    this.context = context
  }

  async listDocumentCollections(projectId) {
    const { withRunner, withSchemaRepair } = this.context
    return withSchemaRepair(() => withRunner(async (runner) => (
      runner.queryRows(
        `SELECT ${tableDefinitions.document_collections.columns.join(', ')} FROM document_collections WHERE project_id = ${parameter(runner.dialect, 1)} ORDER BY created_at ASC`,
        [projectId],
      )
    )))
  }

  async getDocumentCollection(projectId, collectionId) {
    const { withRunner, withSchemaRepair } = this.context
    return withSchemaRepair(() => withRunner(async (runner) => {
      const rows = await runner.queryRows(
        `SELECT ${tableDefinitions.document_collections.columns.join(', ')} FROM document_collections WHERE project_id = ${parameter(runner.dialect, 1)} AND id = ${parameter(runner.dialect, 2)}`,
        [projectId, collectionId],
      )
      return rows[0] || null
    }))
  }

  async deleteDocumentCollection(projectId, collectionId) {
    const { withTransaction, withSchemaRepair } = this.context
    await withSchemaRepair(() => withTransaction(async (runner) => {
      await deleteDocumentCollectionRows(runner, projectId, collectionId)
    }))
  }

  async listDocumentSources(projectId, collectionId) {
    const { withRunner, withSchemaRepair } = this.context
    return withSchemaRepair(() => withRunner(async (runner) => (
      runner.queryRows(
        `SELECT ${tableDefinitions.document_sources.columns.join(', ')} FROM document_sources WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)} ORDER BY created_at ASC`,
        [projectId, collectionId],
      )
    )))
  }

  async getDocumentSourceContent(projectId, sourceId) {
    const { withRunner, withSchemaRepair } = this.context
    return withSchemaRepair(() => withRunner(async (runner) => {
      const rows = await runner.queryRows(
        `SELECT ${tableDefinitions.document_source_contents.columns.join(', ')} FROM document_source_contents WHERE project_id = ${parameter(runner.dialect, 1)} AND source_id = ${parameter(runner.dialect, 2)}`,
        [projectId, sourceId],
      )
      return rows[0] || null
    }))
  }

  async replaceDocumentGraph(input) {
    const { withTransaction, withSchemaRepair } = this.context
    await withSchemaRepair(() => withTransaction(async (runner) => {
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
    return getRemoteDocumentCollectionGraph(this.context, projectId, collectionId)
  }

  async searchDocumentRecords(input) {
    const { withRunner, withSchemaRepair } = this.context
    return withSchemaRepair(() => withRunner(async (runner) => {
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
    const { withRunner, withSchemaRepair } = this.context
    return withSchemaRepair(() => withRunner(async (runner) => {
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
    return getRemoteDocumentNode(this.context, projectId, nodeId)
  }

  async listDocumentNeighbors(projectId, nodeId) {
    return listRemoteDocumentNeighbors(this.context, projectId, nodeId)
  }
}

function createRemoteDocumentRepository(context) {
  return new RemoteDocumentRepository(context)
}

module.exports = {
  RemoteDocumentRepository,
  createRemoteDocumentRepository,
  deleteDocumentCollectionRows,
}
