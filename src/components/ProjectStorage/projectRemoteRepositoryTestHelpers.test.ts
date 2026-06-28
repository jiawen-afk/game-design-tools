import { createRequire } from 'node:module'

import { shjGraphImportAdapter } from '../DocumentWorkspace/shjGraphImportAdapter'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import type {
  DocumentImportResult,
  DocumentNodeSearchResult,
  ReplaceDocumentGraphInput,
} from './projectSqliteRepository'
import type { DocumentCollectionGraph } from './projectStorageTypes'

const require = createRequire(import.meta.url)
export const {
  createRemoteProjectRepository,
  tableDefinitions,
} = require('../../../electron/projectRemoteRepository.cjs') as {
  createRemoteProjectRepository: (profile: unknown, options: RemoteRepositoryTestOptions) => RemoteProjectRepository
  tableDefinitions: Record<string, { columns: string[] }>
}

export interface RemoteRepositoryTestOptions {
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

export interface RemoteProjectRepository {
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

export function databaseProfile(payload: Record<string, unknown>) {
  return {
    id: 'db1',
    type: 'database',
    lastVerifiedAt: null,
    encryptedPayload: {
      payload: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
    },
  }
}

export const postgresqlPayload = {
  provider: 'postgresql',
  host: '127.0.0.1',
  port: 5432,
  database: 'game_assets',
  username: 'asset_user',
  password: 'secret',
  ssl: false,
}

export const mysqlPayload = {
  ...postgresqlPayload,
  provider: 'mysql',
  port: 3306,
}

export function documentGraphInput(projectId: string) {
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
