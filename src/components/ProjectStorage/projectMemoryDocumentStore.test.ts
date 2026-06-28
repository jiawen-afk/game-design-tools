import test from 'node:test'
import assert from 'node:assert/strict'

import { MemoryProjectDocumentStore } from './projectMemoryDocumentStore'

function documentRows(projectId = 'p1') {
  return {
    documentCollections: [{
      id: 'collection-1',
      project_id: projectId,
      name: '山海经实体图谱',
      description: '',
      source_type: 'shj_nlc_graph',
      status: 'ready',
      record_count: 1,
      node_count: 2,
      edge_count: 1,
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
      imported_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }],
    documentSources: [{
      id: 'source-1',
      project_id: projectId,
      collection_id: 'collection-1',
      role: 'entity_graph',
      file_name: 'entity_graph.json',
      mime_group: 'application' as const,
      mime_type: 'application/json',
      extension: 'json',
      size_bytes: 128,
      hash_sha256: 'sha256-1',
      encoding: 'utf-8',
      created_at: '2026-06-23T00:00:00.000Z',
      metadata_json: '{"sourceType":"shj_nlc_graph"}',
    }],
    documentSourceContents: [{
      source_id: 'source-1',
      project_id: projectId,
      collection_id: 'collection-1',
      content_text: '{"nodes":{},"edges":{}}',
      content_encoding: 'utf-8',
      size_bytes: 22,
      hash_sha256: 'sha256-1',
      created_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }],
    documentRecords: [{
      id: 'record-1',
      project_id: projectId,
      collection_id: 'collection-1',
      source_id: 'source-1',
      external_id: '830',
      record_type: 'term',
      title: '傲徕',
      description: '实体描述',
      category_1: '兽',
      category_2: '异兽',
      category_3: null,
      place_path: '南山经',
      book_title: '山海经',
      chapter_title: '南山经',
      version_title: 'NLC',
      usage_text: '可用',
      effect_text: '有效',
      source_url: 'https://example.test/830',
      search_text: '傲徕 兽 异兽 南山经',
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }],
    documentNodes: [{
      id: 'node-1',
      project_id: projectId,
      collection_id: 'collection-1',
      external_id: 'entity:傲徕',
      node_type: 'entity',
      label: '傲徕',
      description: '实体描述',
      search_text: '傲徕 兽 异兽 南山经',
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
      metadata_json: '{"kind":"creature"}',
    }, {
      id: 'node-2',
      project_id: projectId,
      collection_id: 'collection-1',
      external_id: 'descriptor:有角',
      node_type: 'descriptor',
      label: '有角',
      description: '',
      search_text: '有角',
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }],
    documentEdges: [{
      id: 'edge-1',
      project_id: projectId,
      collection_id: 'collection-1',
      external_id: 'edge-1',
      source_node_id: 'node-1',
      target_node_id: 'node-2',
      edge_type: 'site_relation',
      label: '关联',
      weight: 1,
      source_kind: 'entity_graph',
      created_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }],
    documentNodeRecordLinks: [{
      id: 'node-record-1',
      project_id: projectId,
      collection_id: 'collection-1',
      node_id: 'node-1',
      record_id: 'record-1',
      link_role: 'primary',
      created_at: '2026-06-23T00:00:00.000Z',
    }],
    documentEdgeRecordLinks: [{
      id: 'edge-record-1',
      project_id: projectId,
      collection_id: 'collection-1',
      edge_id: 'edge-1',
      record_id: 'record-1',
      created_at: '2026-06-23T00:00:00.000Z',
    }],
    documentImportRuns: [{
      id: 'import-1',
      project_id: projectId,
      collection_id: 'collection-1',
      source_type: 'shj_nlc_graph',
      status: 'succeeded',
      started_at: '2026-06-23T00:00:00.000Z',
      finished_at: '2026-06-23T00:00:00.000Z',
      total_records: 1,
      total_nodes: 2,
      total_edges: 1,
      imported_records: 1,
      imported_nodes: 2,
      imported_edges: 1,
      error_message: null,
      report_json: null,
    }],
  }
}

test('memory document store imports rows, projects graph data, searches, and deletes a collection with children', () => {
  const store = new MemoryProjectDocumentStore()
  const rows = documentRows()

  store.importProjectRows('p1', rows)

  assert.deepEqual(store.exportProjectRows('p1'), rows)
  assert.equal(store.searchDocumentRecords({ projectId: 'p1', query: '南山经' }).total, 1)
  assert.equal(store.searchDocumentNodes({ projectId: 'p1', nodeType: 'entity', query: '傲徕' }).total, 1)
  assert.deepEqual(store.getDocumentSourceContent('p1', 'source-1'), rows.documentSourceContents[0])

  const graph = store.getDocumentCollectionGraph('p1', 'collection-1')
  assert.equal(graph.nodes['node-1']?.label, '傲徕')
  assert.equal(graph.nodes['node-1']?.data.kind, 'creature')
  assert.equal((graph.nodes['node-1']?.data.record as { title?: string }).title, '傲徕')
  assert.deepEqual(graph.edges['edge-1']?.record_ids, ['record-1'])
  assert.deepEqual(store.listDocumentNeighbors('p1', 'node-1').map((item) => item.node.label), ['有角'])

  store.deleteDocumentCollection('p1', 'collection-1')

  assert.deepEqual(store.listDocumentCollections('p1'), [])
  assert.equal(store.searchDocumentRecords({ projectId: 'p1', query: '傲徕' }).total, 0)
  assert.equal(store.getDocumentSourceContent('p1', 'source-1'), null)
})
