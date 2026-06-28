import test from 'node:test'
import assert from 'node:assert/strict'

import { defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { createMemoryProjectRepository } from './projectSqliteRepository'

test('local project repository exports normalized document knowledge row sets', async () => {
  const repository = createMemoryProjectRepository()
  await repository.initializeSchema()
  const rows = migratePersonalSpaceStateToProjectRows(defaultPersonalSpaceState, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  const documentRows = {
    documentCollections: [{
      id: 'collection-1',
      project_id: 'p1',
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
      project_id: 'p1',
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
      project_id: 'p1',
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
      project_id: 'p1',
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
      project_id: 'p1',
      collection_id: 'collection-1',
      external_id: 'entity:傲徕',
      node_type: 'entity',
      label: '傲徕',
      description: '实体描述',
      search_text: '傲徕 兽 异兽 南山经',
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
      metadata_json: null,
    }, {
      id: 'node-2',
      project_id: 'p1',
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
      project_id: 'p1',
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
      project_id: 'p1',
      collection_id: 'collection-1',
      node_id: 'node-1',
      record_id: 'record-1',
      link_role: 'primary',
      created_at: '2026-06-23T00:00:00.000Z',
    }],
    documentEdgeRecordLinks: [{
      id: 'edge-record-1',
      project_id: 'p1',
      collection_id: 'collection-1',
      edge_id: 'edge-1',
      record_id: 'record-1',
      created_at: '2026-06-23T00:00:00.000Z',
    }],
    documentImportRuns: [{
      id: 'import-1',
      project_id: 'p1',
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

  await repository.importProjectRows({ ...rows, ...documentRows })
  const exported = await repository.exportProjectRows('p1') as unknown as Record<string, unknown>

  assert.deepEqual(exported.documentCollections, documentRows.documentCollections)
  assert.deepEqual(exported.documentSources, documentRows.documentSources)
  assert.deepEqual(exported.documentSourceContents, documentRows.documentSourceContents)
  assert.deepEqual(exported.documentRecords, documentRows.documentRecords)
  assert.deepEqual(exported.documentNodes, documentRows.documentNodes)
  assert.deepEqual(exported.documentEdges, documentRows.documentEdges)
  assert.deepEqual(exported.documentNodeRecordLinks, documentRows.documentNodeRecordLinks)
  assert.deepEqual(exported.documentEdgeRecordLinks, documentRows.documentEdgeRecordLinks)
  assert.deepEqual(exported.documentImportRuns, documentRows.documentImportRuns)
  assert.equal('content_text' in documentRows.documentSources[0], false)
  assert.equal('content_blob' in documentRows.documentSources[0], false)

  assert.deepEqual(await repository.getDocumentSourceContent('p1', 'source-1'), documentRows.documentSourceContents[0])
  const graph = await repository.getDocumentCollectionGraph('p1', 'collection-1')
  assert.equal(graph.nodes['node-1']?.label, '傲徕')
  assert.deepEqual(graph.nodes['node-1']?.records, ['record-1'])
  assert.equal((graph.nodes['node-1']?.data.record as { title?: string }).title, '傲徕')
  assert.equal(graph.edges['edge-1']?.source, 'node-1')
  assert.deepEqual(graph.edges['edge-1']?.record_ids, ['record-1'])
})
