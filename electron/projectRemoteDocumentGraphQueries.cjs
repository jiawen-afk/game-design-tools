const {
  createDocumentCollectionGraph,
} = require('./projectDocumentGraphModel.cjs')
const {
  parameter,
  tableDefinitions,
} = require('./projectRemoteRepositorySql.cjs')

async function getRemoteDocumentCollectionGraph(context, projectId, collectionId) {
  const { withRunner, withSchemaRepair } = context
  return withSchemaRepair(() => withRunner(async (runner) => {
    const records = await runner.queryRows(
      `SELECT ${tableDefinitions.document_records.columns.join(', ')} FROM document_records WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)}`,
      [projectId, collectionId],
    )
    const nodeRecordLinks = await runner.queryRows(
      `SELECT node_id, record_id FROM document_node_record_links WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)} ORDER BY created_at ASC`,
      [projectId, collectionId],
    )
    const edgeRecordLinks = await runner.queryRows(
      `SELECT edge_id, record_id FROM document_edge_record_links WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)} ORDER BY created_at ASC`,
      [projectId, collectionId],
    )
    const nodes = await runner.queryRows(
      `SELECT ${tableDefinitions.document_nodes.columns.join(', ')} FROM document_nodes WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)} ORDER BY label ASC`,
      [projectId, collectionId],
    )
    const edges = await runner.queryRows(
      `SELECT ${tableDefinitions.document_edges.columns.join(', ')} FROM document_edges WHERE project_id = ${parameter(runner.dialect, 1)} AND collection_id = ${parameter(runner.dialect, 2)} ORDER BY label ASC`,
      [projectId, collectionId],
    )
    return createDocumentCollectionGraph({
      edgeRecordLinks,
      edges,
      nodeRecordLinks,
      nodes,
      records,
    })
  }))
}

async function getRemoteDocumentNode(context, projectId, nodeId) {
  const { withRunner, withSchemaRepair } = context
  return withSchemaRepair(() => withRunner(async (runner) => {
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

async function listRemoteDocumentNeighbors(context, projectId, nodeId) {
  const { withRunner, withSchemaRepair } = context
  return withSchemaRepair(() => withRunner(async (runner) => {
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

module.exports = {
  getRemoteDocumentCollectionGraph,
  getRemoteDocumentNode,
  listRemoteDocumentNeighbors,
}
