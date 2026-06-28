import type {
  KnowledgeBaseImportRows,
  KnowledgeBaseSourceInput,
} from './documentKnowledgeTypes'
import { rowId, stringArray } from './shjGraphHelpers'
import {
  collectRecords,
  createEdgeRow,
  createNodeRow,
} from './shjGraphRowMappers'
import { shjGraphSourceType } from './shjGraphTypes'
import { requireValidGraph } from './shjGraphValidation'

export function convertSource(input: KnowledgeBaseSourceInput): KnowledgeBaseImportRows {
  const graph = requireValidGraph(input)
  const nodes = Object.values(graph.nodes)
  const edges = Object.values(graph.edges)
  const records = collectRecords(input, nodes)
  const recordIdByExternalId = new Map(records.map((record) => [record.external_id, record.id]))
  const nodeRows = nodes.map((node) => createNodeRow(input, node))
  const nodeIdByExternalId = new Map(nodeRows.map((node) => [node.external_id, node.id]))
  const edgeRows = edges.map((edge) => createEdgeRow(input, edge, nodeIdByExternalId))
  const edgeIdByExternalId = new Map(edgeRows.map((edge) => [edge.external_id, edge.id]))
  const nodeRecordLinks = nodes.flatMap((node) => (
    stringArray(node.records).flatMap((recordExternalId) => {
      const recordId = recordIdByExternalId.get(recordExternalId)
      const nodeId = nodeIdByExternalId.get(node.id)
      if (!recordId || !nodeId) return []
      return [{
        id: rowId('node_record', input.collectionId, node.id, recordExternalId),
        project_id: input.projectId,
        collection_id: input.collectionId,
        node_id: nodeId,
        record_id: recordId,
        link_role: node.type === 'entity' ? 'primary' : 'related',
        created_at: input.now,
      }]
    })
  ))
  const edgeRecordLinks = edges.flatMap((edge) => (
    stringArray(edge.record_ids).flatMap((recordExternalId) => {
      const recordId = recordIdByExternalId.get(recordExternalId)
      const edgeId = edgeIdByExternalId.get(edge.id)
      if (!recordId || !edgeId) return []
      return [{
        id: rowId('edge_record', input.collectionId, edge.id, recordExternalId),
        project_id: input.projectId,
        collection_id: input.collectionId,
        edge_id: edgeId,
        record_id: recordId,
        created_at: input.now,
      }]
    })
  ))

  return {
    sources: [{
      id: input.sourceId,
      project_id: input.projectId,
      collection_id: input.collectionId,
      role: 'entity_graph',
      file_name: input.fileName,
      mime_group: 'application',
      mime_type: 'application/json',
      extension: 'json',
      size_bytes: input.sizeBytes,
      hash_sha256: input.hashSha256,
      encoding: 'utf-8',
      created_at: input.now,
      metadata_json: JSON.stringify({ sourceType: shjGraphSourceType }),
    }],
    records,
    nodes: nodeRows,
    edges: edgeRows,
    nodeRecordLinks,
    edgeRecordLinks,
  }
}
