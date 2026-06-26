import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDocumentGraphView,
  createDocumentSearchText,
  getKnowledgeBaseAdapter,
  listKnowledgeBaseAdapters,
} from './documentKnowledgeModel'
import type { DocumentEdge, DocumentNode } from '../ProjectStorage/projectStorageTypes'

test('document search text flattens values and removes duplicate whitespace', () => {
  assert.equal(
    createDocumentSearchText(['傲徕', '  其状如牛  ', ['动物', '兽名'], undefined, '', '动物']),
    '傲徕 其状如牛 动物 兽名',
  )
})

test('knowledge base adapter registry exposes shj entity graph without graph json compatibility', () => {
  const adapters = listKnowledgeBaseAdapters()
  const adapter = getKnowledgeBaseAdapter('shj_nlc_graph')

  assert.equal(adapter?.displayName, '山海经实体图谱')
  assert.deepEqual(adapter?.acceptedFileNames, ['entity_graph.json'])
  assert.equal(adapters.some((item) => item.sourceType === 'shj_nlc_graph'), true)
  assert.equal(getKnowledgeBaseAdapter('unknown_source'), null)
})

test('graph view limits edges to visible nodes and exposes stable coordinates', () => {
  const nodes: DocumentNode[] = [
    {
      id: 'node-a',
      project_id: 'p1',
      collection_id: 'collection-1',
      external_id: 'entity:傲徕',
      node_type: 'entity',
      label: '傲徕',
      description: '其状如牛',
      search_text: '傲徕 其状如牛',
      created_at: '2026-06-26T00:00:00.000Z',
      updated_at: '2026-06-26T00:00:00.000Z',
      metadata_json: null,
    },
    {
      id: 'node-b',
      project_id: 'p1',
      collection_id: 'collection-1',
      external_id: 'descriptor:四角',
      node_type: 'descriptor',
      label: '四角',
      description: '',
      search_text: '四角',
      created_at: '2026-06-26T00:00:00.000Z',
      updated_at: '2026-06-26T00:00:00.000Z',
      metadata_json: null,
    },
    {
      id: 'node-hidden',
      project_id: 'p1',
      collection_id: 'collection-1',
      external_id: 'descriptor:九尾',
      node_type: 'descriptor',
      label: '九尾',
      description: '',
      search_text: '九尾',
      created_at: '2026-06-26T00:00:00.000Z',
      updated_at: '2026-06-26T00:00:00.000Z',
      metadata_json: null,
    },
  ]
  const edges: DocumentEdge[] = [
    {
      id: 'edge-a-b',
      project_id: 'p1',
      collection_id: 'collection-1',
      external_id: 'edge:a:b',
      source_node_id: 'node-a',
      target_node_id: 'node-b',
      edge_type: 'site_relation',
      label: '描述',
      weight: 1,
      source_kind: 'record',
      created_at: '2026-06-26T00:00:00.000Z',
      metadata_json: null,
    },
    {
      id: 'edge-hidden',
      project_id: 'p1',
      collection_id: 'collection-1',
      external_id: 'edge:a:hidden',
      source_node_id: 'node-a',
      target_node_id: 'node-hidden',
      edge_type: 'site_relation',
      label: '额外关系',
      weight: 1,
      source_kind: 'record',
      created_at: '2026-06-26T00:00:00.000Z',
      metadata_json: null,
    },
  ]

  const view = buildDocumentGraphView({
    nodes,
    edges,
    selectedNodeId: 'node-a',
    width: 800,
    height: 480,
    maxNodes: 2,
  })

  assert.deepEqual(view.edges.map((edge) => edge.id), ['edge-a-b'])
  assert.deepEqual(view.nodes.map((node) => node.id), ['node-a', 'node-b'])
  assert.equal(view.nodes.find((node) => node.id === 'node-a')?.selected, true)
  assert.equal(view.nodes.every((node) => node.x >= 0 && node.x <= 800), true)
  assert.equal(view.nodes.every((node) => node.y >= 0 && node.y <= 480), true)

  const secondView = buildDocumentGraphView({
    nodes,
    edges,
    selectedNodeId: 'node-a',
    width: 800,
    height: 480,
    maxNodes: 2,
  })
  assert.deepEqual(secondView.nodes.map((node) => [node.id, node.x, node.y]), view.nodes.map((node) => [node.id, node.x, node.y]))
})
