import test from 'node:test'
import assert from 'node:assert/strict'
import { DesktopRemoteProjectRepository } from './projectRemoteRepositoryProxy'
import type { ReplaceDocumentGraphInput } from './projectSqliteRepository'

test('desktop remote project repository resolves database profile for document knowledge operations', async () => {
  const previousWindow = (globalThis as { window?: unknown }).window
  const events: string[] = []
  ;(globalThis as { window?: unknown }).window = {
    gameDesignToolsDesktop: {
      listRemoteDocumentCollections: async (projectId: string, databaseProfileId: string) => {
        events.push(`collections:${projectId}:${databaseProfileId}`)
        return []
      },
      getRemoteDocumentCollection: async (projectId: string, collectionId: string, databaseProfileId: string) => {
        events.push(`collection:${projectId}:${collectionId}:${databaseProfileId}`)
        return null
      },
      listRemoteDocumentSources: async (projectId: string, collectionId: string, databaseProfileId: string) => {
        events.push(`sources:${projectId}:${collectionId}:${databaseProfileId}`)
        return []
      },
      getRemoteDocumentSourceContent: async (projectId: string, sourceId: string, databaseProfileId: string) => {
        events.push(`sourceContent:${projectId}:${sourceId}:${databaseProfileId}`)
        return null
      },
      getRemoteDocumentCollectionGraph: async (projectId: string, collectionId: string, databaseProfileId: string) => {
        events.push(`collectionGraph:${projectId}:${collectionId}:${databaseProfileId}`)
        return { nodes: {}, edges: {} }
      },
      replaceRemoteDocumentGraph: async (input: { projectId: string }, databaseProfileId: string) => {
        events.push(`replace:${input.projectId}:${databaseProfileId}`)
        return { collection: { id: 'collection-1' }, importRun: { id: 'import-1' } }
      },
      searchRemoteDocumentRecords: async (input: { projectId: string }, databaseProfileId: string) => {
        events.push(`records:${input.projectId}:${databaseProfileId}`)
        return { items: [], total: 0 }
      },
      searchRemoteDocumentNodes: async (input: { projectId: string }, databaseProfileId: string) => {
        events.push(`nodes:${input.projectId}:${databaseProfileId}`)
        return { items: [], total: 0 }
      },
      getRemoteDocumentNode: async (projectId: string, nodeId: string, databaseProfileId: string) => {
        events.push(`node:${projectId}:${nodeId}:${databaseProfileId}`)
        return null
      },
      listRemoteDocumentNeighbors: async (projectId: string, nodeId: string, databaseProfileId: string) => {
        events.push(`neighbors:${projectId}:${nodeId}:${databaseProfileId}`)
        return []
      },
      deleteRemoteDocumentCollection: async (projectId: string, collectionId: string, databaseProfileId: string) => {
        events.push(`deleteCollection:${projectId}:${collectionId}:${databaseProfileId}`)
        return true
      },
    },
  }

  try {
    const repository = new DesktopRemoteProjectRepository((projectId) => {
      if (!projectId) return 'current-ui-db'
      return projectId === 'project-a' ? 'db-a' : 'db-b'
    })
    const replaceInput: ReplaceDocumentGraphInput = {
      projectId: 'project-b',
      collection: {
        id: 'collection-1',
        project_id: 'project-b',
        name: '知识库',
        description: '',
        source_type: 'shj_nlc_graph',
        status: 'ready',
        record_count: 0,
        node_count: 0,
        edge_count: 0,
        created_at: '2026-06-26T00:00:00.000Z',
        updated_at: '2026-06-26T00:00:00.000Z',
        imported_at: '2026-06-26T00:00:00.000Z',
        metadata_json: null,
      },
      sources: [],
      sourceContents: [],
      records: [],
      nodes: [],
      edges: [],
      nodeRecordLinks: [],
      edgeRecordLinks: [],
      importRun: {
        id: 'import-1',
        project_id: 'project-b',
        collection_id: 'collection-1',
        source_type: 'shj_nlc_graph',
        status: 'succeeded',
        started_at: '2026-06-26T00:00:00.000Z',
        finished_at: '2026-06-26T00:00:00.000Z',
        total_records: 0,
        total_nodes: 0,
        total_edges: 0,
        imported_records: 0,
        imported_nodes: 0,
        imported_edges: 0,
        error_message: null,
        report_json: null,
      },
    }

    await repository.listDocumentCollections('project-a')
    await repository.getDocumentCollection('project-a', 'collection-1')
    await repository.listDocumentSources('project-b', 'collection-1')
    await repository.getDocumentSourceContent('project-a', 'source-1')
    await repository.getDocumentCollectionGraph('project-b', 'collection-1')
    await repository.replaceDocumentGraph(replaceInput)
    await repository.searchDocumentRecords({ projectId: 'project-a', query: '傲徕' })
    await repository.searchDocumentNodes({ projectId: 'project-b', query: '四角' })
    await repository.getDocumentNode('project-a', 'node-1')
    await repository.listDocumentNeighbors('project-b', 'node-2')
    await repository.deleteDocumentCollection('project-a', 'collection-1')

    assert.deepEqual(events, [
      'collections:project-a:db-a',
      'collection:project-a:collection-1:db-a',
      'sources:project-b:collection-1:db-b',
      'sourceContent:project-a:source-1:db-a',
      'collectionGraph:project-b:collection-1:db-b',
      'replace:project-b:db-b',
      'records:project-a:db-a',
      'nodes:project-b:db-b',
      'node:project-a:node-1:db-a',
      'neighbors:project-b:node-2:db-b',
      'deleteCollection:project-a:collection-1:db-a',
    ])
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
})
