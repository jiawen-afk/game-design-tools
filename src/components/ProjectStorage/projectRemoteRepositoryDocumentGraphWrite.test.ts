import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createDocumentGraphRepository,
  documentGraphInput,
  replaceDocumentGraph,
  tableDefinitions,
} from './projectRemoteRepositoryDocumentGraphTestHelpers.test'

test('remote project repository replaces document graph rows with parameterized PostgreSQL statements', async () => {
  const { queries, repository } = createDocumentGraphRepository()
  const graph = documentGraphInput('p1')
  ;(graph.collection as Record<string, unknown>).metadata_json = { source: 'document-workspace' }
  ;(graph.importRun as Record<string, unknown>).report_json = { imported: true, warnings: [] }
  graph.nodes[0]!.metadata_json = { roles: ['term'], nested: { source: 'shj' } } as unknown as string
  graph.edges[0]!.metadata_json = { record_ids: ['830'] } as unknown as string

  const result = await replaceDocumentGraph(repository, graph)

  const sql = queries.map((query) => query.statement).join('\n')
  assert.equal(result.collection.id, 'collection-1')
  assert.equal(queries[0]!.statement, 'BEGIN')
  assert.equal(queries.at(-1)!.statement, 'COMMIT')
  assert.match(sql, /DELETE FROM document_edge_record_links WHERE project_id = \$1 AND collection_id = \$2/i)
  assert.match(sql, /DELETE FROM document_node_record_links WHERE project_id = \$1 AND collection_id = \$2/i)
  assert.match(sql, /DELETE FROM document_edges WHERE project_id = \$1 AND collection_id = \$2/i)
  assert.match(sql, /DELETE FROM document_source_contents WHERE project_id = \$1 AND collection_id = \$2/i)
  assert.match(sql, /INSERT INTO document_collections/i)
  assert.match(sql, /INSERT INTO document_sources/i)
  assert.match(sql, /INSERT INTO document_source_contents/i)
  assert.match(sql, /INSERT INTO document_records/i)
  assert.match(sql, /INSERT INTO document_nodes/i)
  assert.match(sql, /INSERT INTO document_edges/i)
  assert.match(sql, /INSERT INTO document_node_record_links/i)
  assert.match(sql, /INSERT INTO document_edge_record_links/i)
  assert.match(sql, /INSERT INTO document_import_runs/i)
  assert.ok(queries.every((query) => Array.isArray(query.params)))
  const writeParams = queries.flatMap((query) => query.params)
  assert.ok(writeParams.includes(JSON.stringify({ source: 'document-workspace' })))
  assert.ok(writeParams.includes(JSON.stringify({ roles: ['term'], nested: { source: 'shj' } })))
  assert.equal(writeParams.some((param) => (
    param !== null
    && typeof param === 'object'
    && Object.prototype.toString.call(param) === '[object Object]'
  )), false)
})

test('remote project repository initializes schema and retries when document collection table is missing', async () => {
  let collectionReadCount = 0
  const { queries, repository } = createDocumentGraphRepository((statement) => {
    if (/FROM document_collections/i.test(statement)) {
      collectionReadCount += 1
      if (collectionReadCount === 1) {
        const error = new Error('relation "document_collections" does not exist') as Error & { code?: string }
        error.code = '42P01'
        throw error
      }
    }
    return { rows: [] }
  })

  const collections = await repository.listDocumentCollections('p1')

  assert.deepEqual(collections, [])
  assert.equal(collectionReadCount, 2)
  assert.ok(queries.some((query) => /CREATE TABLE IF NOT EXISTS document_collections/i.test(query.statement)))
})

test('remote project repository batches document graph row upserts', async () => {
  const { queries, repository } = createDocumentGraphRepository()
  const graph = documentGraphInput('p1')
  const recordTemplate = graph.records[0]!
  graph.records = Array.from({ length: 3 }, (_item, index) => ({
    ...recordTemplate,
    id: `record-${index}`,
    external_id: `external-${index}`,
    title: `记录${index}`,
  }))

  await replaceDocumentGraph(repository, graph)

  const recordInserts = queries.filter((query) => /INSERT INTO document_records/i.test(query.statement))
  assert.equal(recordInserts.length, 1)
  assert.match(recordInserts[0]!.statement, /VALUES \(\$1, \$2/i)
  assert.equal(recordInserts[0]!.params.length, graph.records.length * tableDefinitions.document_records.columns.length)
})
