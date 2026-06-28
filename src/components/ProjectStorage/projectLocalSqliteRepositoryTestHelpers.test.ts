import { createRequire } from 'node:module'
import path from 'node:path'

import { shjGraphImportAdapter } from '../DocumentWorkspace/shjGraphImportAdapter'
import type { ProjectRepository } from './projectSqliteRepository'
import type { ProjectDeviceBindingPersistence } from './projectDeviceBindings'

const require = createRequire(import.meta.url)
const {
  createLocalProjectRepository: createRepository,
} = require('../../../electron/projectLocalRepository.cjs') as {
  createLocalProjectRepository: (databasePath: string) => ProjectRepository & ProjectDeviceBindingPersistence
}

export function createLocalProjectRepository(databasePath: string) {
  return createRepository(databasePath)
}

export async function createSqlJsDatabase() {
  const initSqlJs = require('sql.js')
  return initSqlJs({
    locateFile: (fileName: string) => path.join(path.dirname(require.resolve('sql.js')), fileName),
  })
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
