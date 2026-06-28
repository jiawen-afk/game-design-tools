const {
  createDocumentCollectionGraph,
} = require('./projectDocumentGraphModel.cjs')

async function getLocalDocumentCollectionGraph(context, projectId, collectionId) {
  const {
    allRows,
    databasePath,
    initializeSchemaInDatabase,
    selectColumns,
    withDatabase,
  } = context
  return withDatabase(databasePath, {}, async (database) => {
    initializeSchemaInDatabase(database)
    const records = allRows(
      database,
      `SELECT ${selectColumns('document_records')} FROM document_records WHERE project_id = ? AND collection_id = ?`,
      [projectId, collectionId],
    )
    const nodeRecordLinks = allRows(
      database,
      'SELECT node_id, record_id FROM document_node_record_links WHERE project_id = ? AND collection_id = ? ORDER BY rowid ASC',
      [projectId, collectionId],
    )
    const edgeRecordLinks = allRows(
      database,
      'SELECT edge_id, record_id FROM document_edge_record_links WHERE project_id = ? AND collection_id = ? ORDER BY rowid ASC',
      [projectId, collectionId],
    )
    const nodes = allRows(
      database,
      `SELECT ${selectColumns('document_nodes')} FROM document_nodes WHERE project_id = ? AND collection_id = ? ORDER BY rowid ASC`,
      [projectId, collectionId],
    )
    const edges = allRows(
      database,
      `SELECT ${selectColumns('document_edges')} FROM document_edges WHERE project_id = ? AND collection_id = ? ORDER BY rowid ASC`,
      [projectId, collectionId],
    )
    return createDocumentCollectionGraph({
      edgeRecordLinks,
      edges,
      nodeRecordLinks,
      nodes,
      records,
    })
  })
}

async function getLocalDocumentNode(context, projectId, nodeId) {
  const {
    allRows,
    databasePath,
    firstRow,
    initializeSchemaInDatabase,
    selectColumns,
    tableDefinitions,
    withDatabase,
  } = context
  return withDatabase(databasePath, {}, async (database) => {
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

async function listLocalDocumentNeighbors(context, projectId, nodeId) {
  const { allRows, databasePath, firstRow, initializeSchemaInDatabase, selectColumns, withDatabase } = context
  return withDatabase(databasePath, {}, async (database) => {
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

module.exports = {
  getLocalDocumentCollectionGraph,
  getLocalDocumentNode,
  listLocalDocumentNeighbors,
}
