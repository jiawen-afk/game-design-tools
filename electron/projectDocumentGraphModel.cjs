const documentCollectionTables = [
  'document_edge_record_links',
  'document_node_record_links',
  'document_edges',
  'document_nodes',
  'document_records',
  'document_source_contents',
  'document_sources',
  'document_import_runs',
  'document_collections',
]

function documentCollectionColumnForTable(tableName) {
  return tableName === 'document_collections' ? 'id' : 'collection_id'
}

function normalizeDocumentLimit(limit) {
  const value = Number(limit)
  if (!Number.isFinite(value)) return 50
  return Math.max(1, Math.min(200, Math.floor(value)))
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

function createDocumentCollectionGraph(rows) {
  const records = rows.records || []
  const recordsById = new Map(records.map((record) => [record.id, record]))
  const recordIdsByNodeId = groupRowsByKey(rows.nodeRecordLinks || [], 'node_id', 'record_id')
  const recordIdsByEdgeId = groupRowsByKey(rows.edgeRecordLinks || [], 'edge_id', 'record_id')
  const nodes = Object.fromEntries((rows.nodes || []).map((node) => {
    const recordIds = recordIdsByNodeId.get(node.id) || []
    const firstRecord = recordIds.map((recordId) => recordsById.get(recordId)).find(Boolean)
    return [node.id, {
      id: node.id,
      label: node.label,
      type: node.node_type,
      records: recordIds,
      data: {
        ...parseJsonObject(node.metadata_json),
        ...(firstRecord ? { record: documentRecordGraphData(firstRecord) } : {}),
      },
    }]
  }))
  const edges = Object.fromEntries((rows.edges || []).map((edge) => [edge.id, {
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
}

module.exports = {
  createDocumentCollectionGraph,
  documentCollectionColumnForTable,
  documentCollectionTables,
  documentRecordGraphData,
  groupRowsByKey,
  normalizeDocumentLimit,
  parseJsonObject,
}
