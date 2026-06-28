import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { createLocalProjectRepository, documentGraphInput } from './projectLocalSqliteRepositoryTestHelpers.test'
import type { CreateLocalProjectInput } from './projectSqliteRepository'

test('local sqlite repository persists document graph rows and deletes collections with children', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'gdt-project-sqlite-'))
  try {
    const databasePath = path.join(tempDir, 'projects.sqlite')
    const repository = createLocalProjectRepository(databasePath)
    await repository.initializeSchema()

    const created = await repository.createProject({
      name: '山海再就业',
      description: '',
      localObjectRoot: 'D:\\GameAssets',
      now: '2026-06-26T00:00:00.000Z',
    } satisfies CreateLocalProjectInput)
    const graph = documentGraphInput(created.project.id)

    await repository.replaceDocumentGraph({
      projectId: created.project.id,
      collection: graph.collection,
      sources: graph.sources,
      sourceContents: graph.sourceContents,
      records: graph.records,
      nodes: graph.nodes,
      edges: graph.edges,
      nodeRecordLinks: graph.nodeRecordLinks,
      edgeRecordLinks: graph.edgeRecordLinks,
      importRun: graph.importRun,
    })

    const reopened = createLocalProjectRepository(databasePath)
    assert.deepEqual((await reopened.listDocumentCollections(created.project.id)).map((item) => item.name), ['山海经实体图谱'])
    assert.equal((await reopened.listDocumentSources(created.project.id, graph.collection.id))[0]?.file_name, 'entity_graph.json')
    assert.equal((await reopened.searchDocumentRecords({ projectId: created.project.id, query: '西山经' })).total, 1)

    const content = await reopened.getDocumentSourceContent(created.project.id, graph.sources[0]!.id)
    assert.equal(content?.content_text, graph.sourceContents[0]!.content_text)
    assert.equal(content?.hash_sha256, graph.sources[0]!.hash_sha256)

    const nodeSearch = await reopened.searchDocumentNodes({ projectId: created.project.id, query: '四角' })
    assert.equal(nodeSearch.total, 1)
    const nodeDetails = await reopened.getDocumentNode(created.project.id, nodeSearch.items[0]!.id)
    assert.equal(nodeDetails?.node.label, '四角')
    assert.equal(nodeDetails?.records[0]?.title, '傲徕')
    assert.deepEqual((await reopened.listDocumentNeighbors(created.project.id, nodeDetails!.node.id)).map((item) => item.node.label), ['傲徕'])

    const projected = await reopened.getDocumentCollectionGraph(created.project.id, graph.collection.id)
    assert.equal(projected.nodes[graph.nodes[0]!.id]?.label, graph.nodes[0]!.label)
    assert.equal(projected.edges[graph.edges[0]!.id]?.source, graph.edges[0]!.source_node_id)
    assert.deepEqual(projected.nodes[graph.nodes[0]!.id]?.records, [graph.records[0]!.id])
    assert.equal((projected.nodes[graph.nodes[0]!.id]?.data.record as { title?: string }).title, graph.records[0]!.title)

    await reopened.deleteDocumentCollection(created.project.id, graph.collection.id)
    assert.deepEqual(await reopened.listDocumentCollections(created.project.id), [])
    assert.equal((await reopened.searchDocumentNodes({ projectId: created.project.id, query: '傲徕' })).total, 0)
    assert.equal((await reopened.searchDocumentRecords({ projectId: created.project.id, query: '傲徕' })).total, 0)
    assert.equal(await reopened.getDocumentSourceContent(created.project.id, graph.sources[0]!.id), null)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('local sqlite repository imports project rows with document graph metadata objects', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'gdt-project-sqlite-'))
  try {
    const databasePath = path.join(tempDir, 'projects.sqlite')
    const repository = createLocalProjectRepository(databasePath)
    const rows = migratePersonalSpaceStateToProjectRows(defaultPersonalSpaceState, {
      projectId: 'project-docs',
      projectName: '山海再就业',
      now: '2026-06-27T00:00:00.000Z',
      localObjectRoot: 'D:\\GameAssets',
    })
    const graph = documentGraphInput(rows.project.id)
    ;(graph.collection as Record<string, unknown>).metadata_json = { source: 'document-workspace' }
    ;(graph.importRun as Record<string, unknown>).report_json = { imported: true, warnings: [] }
    graph.nodes[0]!.metadata_json = { roles: ['term'], nested: { source: 'shj' } } as unknown as string
    graph.edges[0]!.metadata_json = { record_ids: ['830'] } as unknown as string

    await repository.importProjectRows({
      ...rows,
      documentCollections: [graph.collection],
      documentSources: graph.sources,
      documentSourceContents: graph.sourceContents,
      documentRecords: graph.records,
      documentNodes: graph.nodes,
      documentEdges: graph.edges,
      documentNodeRecordLinks: graph.nodeRecordLinks,
      documentEdgeRecordLinks: graph.edgeRecordLinks,
      documentImportRuns: [graph.importRun],
    })

    const reopened = createLocalProjectRepository(databasePath)
    const nodeSearch = await reopened.searchDocumentNodes({ projectId: rows.project.id, query: '傲徕' })
    assert.equal(nodeSearch.total, 1)
    const projected = await reopened.getDocumentCollectionGraph(rows.project.id, graph.collection.id)
    assert.equal((projected.nodes[graph.nodes[0]!.id]?.data.record as { title?: string }).title, '傲徕')
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})
