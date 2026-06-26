import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { inspect } from 'node:util'

import { createPersonalSpaceAsset, defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { shjGraphImportAdapter } from '../DocumentWorkspace/shjGraphImportAdapter'
import type {
  DocumentImportResult,
  DocumentNodeSearchResult,
  ReplaceDocumentGraphInput,
} from './projectSqliteRepository'
import type { DocumentCollectionGraph } from './projectStorageTypes'

const require = createRequire(import.meta.url)
const {
  createRemoteProjectRepository,
  tableDefinitions,
} = require('../../../electron/projectRemoteRepository.cjs') as {
  createRemoteProjectRepository: (profile: unknown, options: RemoteRepositoryTestOptions) => RemoteProjectRepository
  tableDefinitions: Record<string, { columns: string[] }>
}

interface RemoteRepositoryTestOptions {
  now?: () => string
  createPostgresClient?: (config: unknown) => {
    connect: () => Promise<void>
    query: (statement: string, params?: unknown[]) => Promise<{ rows?: unknown[] }>
    end: () => Promise<void>
    on?: (event: string, listener: (...args: unknown[]) => void) => unknown
  }
  createMysqlConnection?: (config: unknown) => Promise<{
    execute: (statement: string, params?: unknown[]) => Promise<[unknown[]]>
    end: () => Promise<void>
  }>
}

interface RemoteProjectRepository {
  createRemoteProject(input: {
    id: string
    name: string
    description: string
    databaseProvider: 'postgresql' | 'mysql'
    databaseProfileId: string
    storageProfileId: string
    now: string
  }): Promise<{
    project: { id: string; mode: string }
    settings: { remote_database_profile_id: string | null; remote_storage_profile_id: string | null }
  }>
  updateProject(projectId: string, input: {
    name: string
    description: string
    updatedAt: string
    databaseProvider?: 'postgresql' | 'mysql'
    databaseProfileId?: string
    storageProfileId?: string
  }): Promise<unknown>
  getProject(projectId: string): Promise<unknown>
  importProjectRows(rows: ReturnType<typeof migratePersonalSpaceStateToProjectRows>): Promise<void>
  listAssets(projectId: string): Promise<Array<{ id: string; primary_object_key: string }>>
  listDocumentCollections(projectId: string): Promise<Array<{ id: string; name: string }>>
  replaceDocumentGraph(input: ReplaceDocumentGraphInput): Promise<DocumentImportResult>
  getDocumentSourceContent(projectId: string, sourceId: string): Promise<{
    source_id: string
    content_text: string
    hash_sha256: string | null
  } | null>
  getDocumentCollectionGraph(projectId: string, collectionId: string): Promise<DocumentCollectionGraph>
  searchDocumentNodes(input: {
    projectId: string
    collectionId?: string
    query?: string
  }): Promise<DocumentNodeSearchResult>
  deleteDocumentCollection(projectId: string, collectionId: string): Promise<void>
  deleteProject(projectId: string): Promise<void>
}

function databaseProfile(payload: Record<string, unknown>) {
  return {
    id: 'db1',
    type: 'database',
    lastVerifiedAt: null,
    encryptedPayload: {
      payload: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
    },
  }
}

const postgresqlPayload = {
  provider: 'postgresql',
  host: '127.0.0.1',
  port: 5432,
  database: 'game_assets',
  username: 'asset_user',
  password: 'secret',
  ssl: false,
}

const mysqlPayload = {
  ...postgresqlPayload,
  provider: 'mysql',
  port: 3306,
}

function documentGraphInput(projectId: string) {
  const text = JSON.stringify({
    nodes: {
      'entity:傲徕': {
        id: 'entity:傲徕',
        label: '傲徕',
        type: 'entity',
        records: ['830'],
        data: {
          roles: ['term'],
          term_record: {
            source_id: '830',
            name: '傲徕',
            category_1: '动物',
            category_2: '兽名',
            description: '其状如牛',
            place_path: '西山经',
          },
        },
      },
      'descriptor:四角': {
        id: 'descriptor:四角',
        label: '四角',
        type: 'descriptor',
        records: ['830'],
        data: {},
      },
    },
    edges: {
      'edge:1': {
        id: 'edge:1',
        source: 'entity:傲徕',
        target: 'descriptor:四角',
        type: 'site_relation',
        label: '描述',
        weight: 1,
        record_ids: ['830'],
        source_kind: 'record',
      },
    },
  })
  const rows = shjGraphImportAdapter.convertSource({
    projectId,
    collectionId: 'collection-1',
    sourceId: 'source-1',
    fileName: 'entity_graph.json',
    text,
    sizeBytes: text.length,
    hashSha256: 'hash-1',
    now: '2026-06-26T00:00:00.000Z',
  })
  return {
    collection: {
      id: 'collection-1',
      project_id: projectId,
      name: '山海经实体图谱',
      description: '',
      source_type: 'shj_nlc_graph',
      status: 'ready',
      record_count: rows.records.length,
      node_count: rows.nodes.length,
      edge_count: rows.edges.length,
      created_at: '2026-06-26T00:00:00.000Z',
      updated_at: '2026-06-26T00:00:00.000Z',
      imported_at: '2026-06-26T00:00:00.000Z',
      metadata_json: null,
    },
    importRun: {
      id: 'import-1',
      project_id: projectId,
      collection_id: 'collection-1',
      source_type: 'shj_nlc_graph',
      status: 'succeeded',
      started_at: '2026-06-26T00:00:00.000Z',
      finished_at: '2026-06-26T00:00:00.000Z',
      total_records: rows.records.length,
      total_nodes: rows.nodes.length,
      total_edges: rows.edges.length,
      imported_records: rows.records.length,
      imported_nodes: rows.nodes.length,
      imported_edges: rows.edges.length,
      error_message: null,
      report_json: null,
    },
    sourceContents: [{
      source_id: 'source-1',
      project_id: projectId,
      collection_id: 'collection-1',
      content_text: text,
      content_encoding: 'utf-8',
      size_bytes: text.length,
      hash_sha256: 'hash-1',
      created_at: '2026-06-26T00:00:00.000Z',
      metadata_json: null,
    }],
    ...rows,
  }
}

test('remote project repository creates project rows in a PostgreSQL transaction', async () => {
  const queries: Array<{ statement: string; params: unknown[] }> = []
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement, params = []) => {
        queries.push({ statement, params })
        return { rows: [] }
      },
      end: async () => {},
    }),
  })

  const created = await repository.createRemoteProject({
    id: 'p1',
    name: '远程项目',
    description: '团队资产',
    databaseProvider: 'postgresql',
    databaseProfileId: 'db1',
    storageProfileId: 'kodo1',
    now: '2026-06-23T00:00:00.000Z',
  })

  assert.equal(created.project.mode, 'remote')
  assert.equal(created.settings.remote_database_profile_id, null)
  assert.equal(created.settings.remote_storage_profile_id, null)
  assert.equal(queries[0]!.statement, 'BEGIN')
  assert.equal(queries.at(-1)!.statement, 'COMMIT')
  assert.match(queries[1]!.statement, /INSERT INTO projects/)
  assert.match(queries[1]!.statement, /ON CONFLICT \(id\) DO UPDATE/)
  assert.match(queries[1]!.statement, /\$1/)
  assert.deepEqual(queries[1]!.params.slice(0, 4), ['p1', '远程项目', '团队资产', 'remote'])
  assert.equal(queries[1]!.params[5], 'objects/远程项目')
  assert.match(queries[2]!.statement, /INSERT INTO project_settings/)
  assert.deepEqual(queries[2]!.params.slice(4, 7), [null, null, '2026-06-23T00:00:00.000Z'])
})

test('remote project repository updates project provider without writing device profile ids', async () => {
  const queries: Array<{ statement: string; params: unknown[] }> = []
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement, params = []) => {
        queries.push({ statement, params })
        if (/FROM projects/i.test(statement)) {
          return { rows: [{ id: 'p1', name: '远程项目', description: '团队资产', mode: 'remote' }] }
        }
        if (/FROM project_settings/i.test(statement)) {
          return { rows: [{ project_id: 'p1', database_provider: 'mysql', remote_database_profile_id: 'db2', remote_storage_profile_id: 'kodo2' }] }
        }
        return { rows: [] }
      },
      end: async () => {},
    }),
  })

  await repository.updateProject('p1', {
    name: '远程项目',
    description: '团队资产',
    updatedAt: '2026-06-24T00:00:00.000Z',
    databaseProvider: 'mysql',
    databaseProfileId: 'db2',
    storageProfileId: 'kodo2',
  })

  assert.match(queries[0]!.statement, /UPDATE projects SET/)
  assert.match(queries[1]!.statement, /UPDATE project_settings SET/)
  assert.doesNotMatch(queries[1]!.statement, /remote_database_profile_id = COALESCE/)
  assert.doesNotMatch(queries[1]!.statement, /remote_storage_profile_id = COALESCE/)
  assert.deepEqual(queries[1]!.params, ['mysql', '2026-06-24T00:00:00.000Z', 'p1'])
})

test('remote project repository imports every project table with MySQL upserts', async () => {
  const statements: string[] = []
  const voice = createPersonalSpaceAsset({
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    resourcePaths: ['welcome.wav'],
  })
  const rows = migratePersonalSpaceStateToProjectRows({ ...defaultPersonalSpaceState, assets: [voice] }, {
    projectId: 'p1',
    projectName: '默认项目',
    now: '2026-06-23T00:00:00.000Z',
    localObjectRoot: 'D:\\GameAssets',
  })
  const repository = createRemoteProjectRepository(databaseProfile(mysqlPayload), {
    createMysqlConnection: async () => ({
      execute: async (statement, params = []) => {
        statements.push(`${statement} -- ${params.length}`)
        return [[]]
      },
      end: async () => {},
    }),
  })

  await repository.importProjectRows(rows)

  const sql = statements.join('\n')
  assert.match(sql, /^START TRANSACTION/m)
  assert.match(sql, /DELETE FROM projects WHERE id = \?/)
  assert.match(sql, /INSERT INTO projects/)
  assert.match(sql, /INSERT INTO project_settings/)
  assert.match(sql, /INSERT INTO asset_groups/)
  assert.match(sql, /INSERT INTO assets/)
  assert.match(sql, /ON DUPLICATE KEY UPDATE/)
  assert.match(sql, /\?/)
  assert.match(sql, /COMMIT/)
})

test('remote project repository lists assets and hard deletes projects through parameterized SQL', async () => {
  const queries: Array<{ statement: string; params: unknown[] }> = []
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement, params = []) => {
        queries.push({ statement, params })
        if (/FROM assets/i.test(statement)) {
          return {
            rows: [{
              id: 'a1',
              project_id: 'p1',
              kind: 'voice',
              asset_subtype: 'character_voice',
              group_id: null,
              name: '欢迎',
              dialogue_text: null,
              source_key: null,
              primary_resource_id: 'r1',
              primary_object_key: 'objects/p1/audio/r1.wav',
              primary_file_name: 'welcome.wav',
              primary_mime_group: 'audio',
              primary_mime_type: 'audio/wav',
              primary_extension: 'wav',
              primary_size_bytes: 0,
              primary_hash_sha256: null,
              sprite_index_resource_id: null,
              sprite_index_object_key: null,
              sprite_index_file_name: null,
              sprite_index_mime_type: null,
              sprite_index_size_bytes: null,
              sprite_index_hash_sha256: null,
              sprite_frame_width: null,
              sprite_frame_height: null,
              sprite_sheet_width: null,
              sprite_sheet_height: null,
              sprite_fps: null,
              sprite_frame_count: null,
              created_at: '2026-06-23T00:00:00.000Z',
              updated_at: '2026-06-23T00:00:00.000Z',
              metadata_json: null,
            }],
          }
        }
        return { rows: [] }
      },
      end: async () => {},
    }),
  })

  const assets = await repository.listAssets('p1')
  await repository.deleteProject('p1')

  assert.deepEqual(assets.map((asset) => asset.primary_object_key), ['objects/p1/audio/r1.wav'])
  assert.match(queries[0]!.statement, /SELECT .* FROM assets WHERE project_id = \$1/i)
  assert.deepEqual(queries[0]!.params, ['p1'])
  assert.match(queries.at(-2)!.statement, /DELETE FROM projects WHERE id = \$1/i)
  assert.deepEqual(queries.at(-2)!.params, ['p1'])
})

test('remote project repository replaces document graph rows with parameterized PostgreSQL statements', async () => {
  const queries: Array<{ statement: string; params: unknown[] }> = []
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement, params = []) => {
        queries.push({ statement, params })
        return { rows: [] }
      },
      end: async () => {},
    }),
  })
  const graph = documentGraphInput('p1')

  const result = await repository.replaceDocumentGraph({
    projectId: 'p1',
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
})

test('remote project repository initializes schema and retries when document collection table is missing', async () => {
  const queries: Array<{ statement: string; params: unknown[] }> = []
  let collectionReadCount = 0
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement, params = []) => {
        queries.push({ statement, params })
        if (/FROM document_collections/i.test(statement)) {
          collectionReadCount += 1
          if (collectionReadCount === 1) {
            const error = new Error('relation "document_collections" does not exist') as Error & { code?: string }
            error.code = '42P01'
            throw error
          }
        }
        return { rows: [] }
      },
      end: async () => {},
    }),
  })

  const collections = await repository.listDocumentCollections('p1')

  assert.deepEqual(collections, [])
  assert.equal(collectionReadCount, 2)
  assert.ok(queries.some((query) => /CREATE TABLE IF NOT EXISTS document_collections/i.test(query.statement)))
})

test('remote project repository batches document graph row upserts', async () => {
  const queries: Array<{ statement: string; params: unknown[] }> = []
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement, params = []) => {
        queries.push({ statement, params })
        return { rows: [] }
      },
      end: async () => {},
    }),
  })
  const graph = documentGraphInput('p1')
  const recordTemplate = graph.records[0]!
  graph.records = Array.from({ length: 3 }, (_item, index) => ({
    ...recordTemplate,
    id: `record-${index}`,
    external_id: `external-${index}`,
    title: `记录${index}`,
  }))

  await repository.replaceDocumentGraph({
    projectId: 'p1',
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

  const recordInserts = queries.filter((query) => /INSERT INTO document_records/i.test(query.statement))
  assert.equal(recordInserts.length, 1)
  assert.match(recordInserts[0]!.statement, /VALUES \(\$1, \$2/i)
  assert.equal(recordInserts[0]!.params.length, graph.records.length * tableDefinitions.document_records.columns.length)
})

test('remote project repository reads document source content and projects collection graph', async () => {
  const queries: Array<{ statement: string; params: unknown[] }> = []
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement, params = []) => {
        queries.push({ statement, params })
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
      },
      end: async () => {},
    }),
  })

  const content = await repository.getDocumentSourceContent('p1', 'source-1')
  const graph = await repository.getDocumentCollectionGraph('p1', 'collection-1')

  assert.equal(content?.content_text, '{"nodes":{},"edges":{}}')
  assert.equal(content?.hash_sha256, 'hash-1')
  assert.equal(graph.nodes['node-1']?.label, '傲徕')
  assert.deepEqual(graph.nodes['node-1']?.records, ['record-1'])
  assert.equal((graph.nodes['node-1']?.data.term_record as { title?: string }).title, '傲徕')
  assert.equal(graph.edges['edge-1']?.source, 'node-1')
  assert.deepEqual(graph.edges['edge-1']?.record_ids, ['record-1'])
  assert.ok(queries.some((query) => /FROM document_source_contents WHERE project_id = \$1 AND source_id = \$2/i.test(query.statement)))
})

test('remote project repository searches document nodes and deletes collections through parameterized SQL', async () => {
  const queries: Array<{ statement: string; params: unknown[] }> = []
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement, params = []) => {
        queries.push({ statement, params })
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
      },
      end: async () => {},
    }),
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

test('remote project repository keeps deleted-object cleanup tasks after hard deleting project rows', async () => {
  const queries: string[] = []
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async (statement, params = []) => {
        queries.push(`${statement} -- ${params.length}`)
        return { rows: [] }
      },
      end: async () => {},
    }),
  })

  await repository.deleteProject('p1')

  assert.doesNotMatch(queries.join('\n'), /DELETE FROM deleted_project_cleanup_tasks/i)
})

test('remote project repository swallows late PostgreSQL connection error events after query failures', async () => {
  const uncaughtErrors: Error[] = []
  const client = new EventEmitter()
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async () => {
        const error = new Error('Connection terminated unexpectedly')
        setImmediate(() => {
          client.emit('error', error)
        })
        throw error
      },
      end: async () => {},
      on: client.on.bind(client),
    }),
  })

  process.setUncaughtExceptionCaptureCallback((error) => {
    uncaughtErrors.push(error as Error)
  })
  try {
    await assert.rejects(repository.getProject('p1'), /远程数据库连接已中断，请检查网络或数据库服务后重试。/)
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
    assert.deepEqual(uncaughtErrors, [])
  } finally {
    process.setUncaughtExceptionCaptureCallback(null)
  }
})

test('remote project repository retries PostgreSQL connect after a dropped connection', async () => {
  const events: string[] = []
  let clientIndex = 0
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => {
      clientIndex += 1
      const currentClient = clientIndex
      return {
        connect: async () => {
          events.push(`connect:${currentClient}`)
          if (currentClient === 1) throw new Error('Connection terminated unexpectedly')
        },
        query: async (statement) => {
          events.push(`query:${currentClient}`)
          if (/FROM projects/i.test(statement)) {
            return {
              rows: [{
                id: 'p1',
                name: '远程项目',
                description: '团队资产',
                mode: 'remote',
              }],
            }
          }
          if (/FROM project_settings/i.test(statement)) {
            return {
              rows: [{
                project_id: 'p1',
                storage_provider: 'qiniu_kodo',
                database_provider: 'postgresql',
              }],
            }
          }
          return { rows: [] }
        },
        end: async () => { events.push(`end:${currentClient}`) },
      }
    },
  })

  const result = await repository.getProject('p1') as {
    project: { id: string }
    settings: { database_provider: string }
  }

  assert.equal(result.project.id, 'p1')
  assert.equal(result.settings.database_provider, 'postgresql')
  assert.deepEqual(events, [
    'connect:1',
    'end:1',
    'connect:2',
    'query:2',
    'query:2',
    'end:2',
  ])
})

test('remote project repository retries PostgreSQL reads after a dropped connection', async () => {
  const events: string[] = []
  let clientIndex = 0
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => {
      clientIndex += 1
      const currentClient = clientIndex
      return {
        connect: async () => { events.push(`connect:${currentClient}`) },
        query: async (statement) => {
          events.push(`query:${currentClient}`)
          if (currentClient === 1) throw new Error('Connection terminated unexpectedly')
          if (/FROM projects/i.test(statement)) {
            return {
              rows: [{
                id: 'p1',
                name: '远程项目',
                description: '团队资产',
                mode: 'remote',
              }],
            }
          }
          if (/FROM project_settings/i.test(statement)) {
            return {
              rows: [{
                project_id: 'p1',
                storage_provider: 'qiniu_kodo',
                database_provider: 'postgresql',
              }],
            }
          }
          return { rows: [] }
        },
        end: async () => { events.push(`end:${currentClient}`) },
      }
    },
  })

  const result = await repository.getProject('p1') as {
    project: { id: string }
    settings: { database_provider: string }
  }

  assert.equal(result.project.id, 'p1')
  assert.equal(result.settings.database_provider, 'postgresql')
  assert.deepEqual(events, [
    'connect:1',
    'query:1',
    'end:1',
    'connect:2',
    'query:2',
    'query:2',
    'end:2',
  ])
})

test('remote project repository reports exhausted PostgreSQL drops without exposing pg error cause', async () => {
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => ({
      connect: async () => {},
      query: async () => {
        throw new Error('Connection terminated unexpectedly')
      },
      end: async () => {},
    }),
  })

  await assert.rejects(
    repository.getProject('p1'),
    (error: unknown) => {
      assert.equal((error as Error).message, '远程数据库连接已中断，请检查网络或数据库服务后重试。')
      assert.equal('cause' in (error as Error), false)
      assert.doesNotMatch(inspect(error), /Connection terminated unexpectedly/)
      return true
    },
  )
})

test('remote project repository retries PostgreSQL reads after client becomes non-queryable', async () => {
  const events: string[] = []
  let clientIndex = 0
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => {
      clientIndex += 1
      const currentClient = clientIndex
      let queryCount = 0
      return {
        connect: async () => { events.push(`connect:${currentClient}`) },
        query: async (statement) => {
          queryCount += 1
          events.push(`query:${currentClient}:${queryCount}`)
          if (currentClient === 1 && queryCount === 2) {
            throw new Error('Client has encountered a connection error and is not queryable')
          }
          if (/FROM projects/i.test(statement)) {
            return {
              rows: [{
                id: 'p1',
                name: '远程项目',
                description: '团队资产',
                mode: 'remote',
              }],
            }
          }
          if (/FROM project_settings/i.test(statement)) {
            return {
              rows: [{
                project_id: 'p1',
                storage_provider: 'qiniu_kodo',
                database_provider: 'postgresql',
              }],
            }
          }
          return { rows: [] }
        },
        end: async () => { events.push(`end:${currentClient}`) },
      }
    },
  })

  const result = await repository.getProject('p1') as {
    project: { id: string }
    settings: { database_provider: string }
  }

  assert.equal(result.project.id, 'p1')
  assert.equal(result.settings.database_provider, 'postgresql')
  assert.deepEqual(events, [
    'connect:1',
    'query:1:1',
    'query:1:2',
    'end:1',
    'connect:2',
    'query:2:1',
    'query:2:2',
    'end:2',
  ])
})

test('remote project repository retries after a PostgreSQL client emits a background connection error before the next query', async () => {
  const events: string[] = []
  let clientIndex = 0
  const repository = createRemoteProjectRepository(databaseProfile(postgresqlPayload), {
    createPostgresClient: () => {
      clientIndex += 1
      const currentClient = clientIndex
      const client = new EventEmitter()
      return {
        connect: async () => { events.push(`connect:${currentClient}`) },
        query: async (statement) => {
          events.push(`query:${currentClient}`)
          if (currentClient === 1 && /FROM projects/i.test(statement)) {
            client.emit('error', new Error('Connection terminated unexpectedly'))
            return {
              rows: [{
                id: 'p1',
                name: '远程项目',
                description: '团队资产',
                mode: 'remote',
              }],
            }
          }
          if (currentClient === 1) {
            throw new Error('Client has encountered a connection error and is not queryable')
          }
          if (/FROM projects/i.test(statement)) {
            return {
              rows: [{
                id: 'p1',
                name: '远程项目',
                description: '团队资产',
                mode: 'remote',
              }],
            }
          }
          if (/FROM project_settings/i.test(statement)) {
            return {
              rows: [{
                project_id: 'p1',
                storage_provider: 'qiniu_kodo',
                database_provider: 'postgresql',
              }],
            }
          }
          return { rows: [] }
        },
        end: async () => { events.push(`end:${currentClient}`) },
        on: client.on.bind(client),
      }
    },
  })

  const result = await repository.getProject('p1') as {
    project: { id: string }
    settings: { database_provider: string }
  }

  assert.equal(result.project.id, 'p1')
  assert.equal(result.settings.database_provider, 'postgresql')
  assert.deepEqual(events, [
    'connect:1',
    'query:1',
    'end:1',
    'connect:2',
    'query:2',
    'query:2',
    'end:2',
  ])
})
