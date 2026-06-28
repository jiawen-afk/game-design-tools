import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  createDocumentCollectionGraph,
} = require('../../../electron/projectDocumentGraphModel.cjs') as {
  createDocumentCollectionGraph: (rows: {
    edgeRecordLinks: Array<Record<string, unknown>>
    edges: Array<Record<string, unknown>>
    nodeRecordLinks: Array<Record<string, unknown>>
    nodes: Array<Record<string, unknown>>
    records: Array<Record<string, unknown>>
  }) => {
    edges: Record<string, Record<string, unknown>>
    nodes: Record<string, Record<string, unknown>>
  }
}

test('document graph model maps row sets into graph nodes and edges', () => {
  const graph = createDocumentCollectionGraph({
    records: [{
      id: 'record-1',
      external_id: 'ext-1',
      record_type: 'entry',
      title: '条目一',
      description: '描述',
      category_1: '世界',
      category_2: '地点',
      category_3: '',
      place_path: '山海/东荒',
      book_title: '山海经',
      chapter_title: '东山经',
      version_title: 'v1',
      usage_text: '用途',
      effect_text: '效果',
      source_url: 'https://example.test/source',
      metadata_json: '{"extra":"value"}',
    }],
    nodeRecordLinks: [
      { node_id: 'node-1', record_id: 'record-1' },
      { node_id: 'node-1', record_id: 'missing-record' },
    ],
    edgeRecordLinks: [
      { edge_id: 'edge-1', record_id: 'record-1' },
    ],
    nodes: [{
      id: 'node-1',
      label: '节点一',
      node_type: 'place',
      metadata_json: '{"rank":2}',
    }],
    edges: [{
      id: 'edge-1',
      source_node_id: 'node-1',
      target_node_id: 'node-2',
      edge_type: 'relates_to',
      label: '关联',
      weight: 0.75,
      source_kind: 'imported',
    }],
  })

  assert.deepEqual(graph.nodes['node-1'], {
    id: 'node-1',
    label: '节点一',
    type: 'place',
    records: ['record-1', 'missing-record'],
    data: {
      rank: 2,
      record: {
        extra: 'value',
        id: 'record-1',
        external_id: 'ext-1',
        record_type: 'entry',
        title: '条目一',
        description: '描述',
        category_1: '世界',
        category_2: '地点',
        category_3: '',
        place_path: '山海/东荒',
        book_title: '山海经',
        chapter_title: '东山经',
        version_title: 'v1',
        usage: '用途',
        effect: '效果',
        source_url: 'https://example.test/source',
      },
    },
  })
  assert.deepEqual(graph.edges['edge-1'], {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    type: 'relates_to',
    label: '关联',
    weight: 0.75,
    record_ids: ['record-1'],
    source_kind: 'imported',
  })
})
