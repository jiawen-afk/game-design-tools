import test from 'node:test'
import assert from 'node:assert/strict'

import { createDocumentGraphRepository } from './projectRemoteRepositoryDocumentGraphTestHelpers.test'

test('remote project repository reads document source content and projects collection graph', async () => {
  const { queries, repository } = createDocumentGraphRepository((statement) => {
    if (/FROM document_source_contents/i.test(statement)) {
      return {
        rows: [{
          source_id: 'source-1',
          project_id: 'p1',
          collection_id: 'collection-1',
          content_text: '{"nodes":{},"edges":{}}',
          content_encoding: 'utf-8',
          size_bytes: 22,
          hash_sha256: 'hash-1',
          created_at: '2026-06-26T00:00:00.000Z',
          metadata_json: null,
        }],
      }
    }
    if (/FROM document_records/i.test(statement)) {
      return {
        rows: [{
          id: 'record-1',
          project_id: 'p1',
          collection_id: 'collection-1',
          source_id: 'source-1',
          external_id: '830',
          record_type: 'term',
          title: '傲徕',
          description: '其状如牛',
          category_1: '动物',
          category_2: '兽名',
          category_3: null,
          place_path: '西山经',
          book_title: '山海经',
          chapter_title: '西山经',
          version_title: null,
          usage_text: null,
          effect_text: null,
          source_url: null,
          search_text: '傲徕 西山经',
          created_at: '2026-06-26T00:00:00.000Z',
          updated_at: '2026-06-26T00:00:00.000Z',
          metadata_json: '{"roles":["term"]}',
        }],
      }
    }
    if (/FROM document_node_record_links/i.test(statement)) {
      return { rows: [{ node_id: 'node-1', record_id: 'record-1' }] }
    }
    if (/FROM document_edge_record_links/i.test(statement)) {
      return { rows: [{ edge_id: 'edge-1', record_id: 'record-1' }] }
    }
    if (/FROM document_nodes/i.test(statement)) {
      return {
        rows: [{
          id: 'node-1',
          project_id: 'p1',
          collection_id: 'collection-1',
          external_id: 'entity:傲徕',
          node_type: 'entity',
          label: '傲徕',
          description: '其状如牛',
          search_text: '傲徕 西山经',
          created_at: '2026-06-26T00:00:00.000Z',
          updated_at: '2026-06-26T00:00:00.000Z',
          metadata_json: '{"category_paths":[["动物","兽名"]]}',
        }],
      }
    }
    if (/FROM document_edges/i.test(statement)) {
      return {
        rows: [{
          id: 'edge-1',
          project_id: 'p1',
          collection_id: 'collection-1',
          external_id: 'edge:1',
          source_node_id: 'node-1',
          target_node_id: 'node-2',
          edge_type: 'site_relation',
          label: '描述',
          weight: 1,
          source_kind: 'record',
          created_at: '2026-06-26T00:00:00.000Z',
          metadata_json: null,
        }],
      }
    }
    return { rows: [] }
  })

  const content = await repository.getDocumentSourceContent('p1', 'source-1')
  const graph = await repository.getDocumentCollectionGraph('p1', 'collection-1')

  assert.equal(content?.content_text, '{"nodes":{},"edges":{}}')
  assert.equal(content?.hash_sha256, 'hash-1')
  assert.equal(graph.nodes['node-1']?.label, '傲徕')
  assert.deepEqual(graph.nodes['node-1']?.records, ['record-1'])
  assert.equal((graph.nodes['node-1']?.data.record as { title?: string }).title, '傲徕')
  assert.equal(graph.edges['edge-1']?.source, 'node-1')
  assert.deepEqual(graph.edges['edge-1']?.record_ids, ['record-1'])
  assert.ok(queries.some((query) => /FROM document_source_contents WHERE project_id = \$1 AND source_id = \$2/i.test(query.statement)))
})

test('remote project repository searches document nodes and deletes collections through parameterized SQL', async () => {
  const { queries, repository } = createDocumentGraphRepository((statement) => {
    if (/COUNT\(\*\).*document_nodes/is.test(statement)) {
      return { rows: [{ total: '1' }] }
    }
    if (/FROM document_nodes/i.test(statement)) {
      return {
        rows: [{
          id: 'node-1',
          project_id: 'p1',
          collection_id: 'collection-1',
          external_id: 'entity:傲徕',
          node_type: 'entity',
          label: '傲徕',
          description: '其状如牛',
          search_text: '傲徕 西山经',
          created_at: '2026-06-26T00:00:00.000Z',
          updated_at: '2026-06-26T00:00:00.000Z',
          metadata_json: null,
        }],
      }
    }
    return { rows: [] }
  })

  const result = await repository.searchDocumentNodes({
    projectId: 'p1',
    collectionId: 'collection-1',
    query: '傲徕',
  })
  await repository.deleteDocumentCollection('p1', 'collection-1')

  assert.equal(result.total, 1)
  assert.equal(result.items[0]?.label, '傲徕')
  assert.match(queries[0]!.statement, /COUNT\(\*\).*FROM document_nodes/i)
  assert.deepEqual(queries[0]!.params, ['p1', 'collection-1', '%傲徕%'])
  assert.match(queries.at(-2)!.statement, /DELETE FROM document_collections WHERE project_id = \$1 AND id = \$2/i)
  assert.deepEqual(queries.at(-2)!.params, ['p1', 'collection-1'])
})
