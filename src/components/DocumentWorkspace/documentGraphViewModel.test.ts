import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDocumentCategoryTree,
  contextActionForDocumentNode,
  filterDocumentGraph,
} from './documentGraphViewModel'
import type { DocumentCollectionGraph } from '../ProjectStorage'

test('filters entity list by category path, role, and description', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:少陽之山': {
        id: 'entity:少陽之山',
        label: '少陽之山',
        type: 'entity',
        records: ['1275'],
        data: { roles: ['term', 'place'], categoryPathGroups: [['地名', '山名']], has_description: true },
      },
      'entity:酸水': {
        id: 'entity:酸水',
        label: '酸水',
        type: 'entity',
        records: ['1280'],
        data: { roles: ['term'], categoryPathGroups: [['地名', '水名']], has_description: false },
      },
      'descriptor:其上多玉': {
        id: 'descriptor:其上多玉',
        label: '其上多玉',
        type: 'descriptor',
        records: ['1275'],
        data: {},
      },
    },
    edges: {
      'edge:description': {
        id: 'edge:description',
        source: 'entity:少陽之山',
        target: 'descriptor:其上多玉',
        type: 'site_relation',
        label: '描述',
        weight: 1,
        record_ids: ['1275'],
        source_kind: 'detail_graph',
      },
    },
  }

  const filtered = filterDocumentGraph(graph, {
    query: '',
    categories: [],
    categoryFilters: [{ level: 2, parent: '地名', value: '山名' }],
    entityRoles: ['place'],
    description: 'with',
    nodeTypes: ['entity', 'descriptor'],
    edgeTypes: ['site_relation'],
  })

  assert.deepEqual(Object.keys(filtered.nodes).sort(), ['descriptor:其上多玉', 'entity:少陽之山'])
  assert.deepEqual(Object.keys(filtered.edges), ['edge:description'])
})

test('builds category tree from entity category path groups', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:少陽之山': {
        id: 'entity:少陽之山',
        label: '少陽之山',
        type: 'entity',
        records: ['1275'],
        data: { categoryPathGroups: [['地名', '山名'], ['地名', '水名', '酸水']] },
      },
    },
    edges: {},
  }

  assert.deepEqual(buildDocumentCategoryTree(graph), [{
    name: '地名',
    children: [{ name: '山名', children: [] }, { name: '水名', children: ['酸水'] }],
  }])
})

test('turns category context action into category filter action', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:畢方': {
        id: 'entity:畢方',
        label: '畢方',
        type: 'entity',
        records: ['813'],
        data: { category_1: '动物', category_2: '鸟名' },
      },
      'category:鸟名': {
        id: 'category:鸟名',
        label: '鸟名',
        type: 'category',
        records: ['813'],
        data: {},
      },
    },
    edges: {
      'edge:category': {
        id: 'edge:category',
        source: 'entity:畢方',
        target: 'category:鸟名',
        type: 'HAS_CATEGORY_2',
        label: '二级类目',
        weight: 1,
        record_ids: ['813'],
        source_kind: 'derived_field',
      },
    },
  }

  assert.deepEqual(contextActionForDocumentNode(graph, graph, 'category:鸟名', '813'), {
    type: 'category_filter',
    categoryLevel: 2,
    category: '鸟名',
    parent: '动物',
  })
})

test('focused entity shows incoming and outgoing relationship chains up to three levels', () => {
  const data: DocumentCollectionGraph = {
    nodes: {
      'entity:章莪之山': { id: 'entity:章莪之山', label: '章莪之山', type: 'entity', records: ['807', '813'], data: {} },
      'entity:畢方': { id: 'entity:畢方', label: '畢方', type: 'entity', records: ['813'], data: {} },
      'entity:山名': { id: 'entity:山名', label: '山名', type: 'entity', records: ['807'], data: {} },
      'entity:地名': { id: 'entity:地名', label: '地名', type: 'entity', records: ['807'], data: {} },
      'entity:类目根': { id: 'entity:类目根', label: '类目根', type: 'entity', records: ['807'], data: {} },
      'entity:四级之外': { id: 'entity:四级之外', label: '四级之外', type: 'entity', records: ['807'], data: {} },
    },
    edges: {
      'edge:813-place': { id: 'edge:813-place', source: 'entity:畢方', target: 'entity:章莪之山', type: 'site_relation', label: '山', weight: 1, record_ids: ['813'], source_kind: 'detail_graph' },
      'edge:807-category-1': { id: 'edge:807-category-1', source: 'entity:章莪之山', target: 'entity:山名', type: 'site_relation', label: '类目', weight: 1, record_ids: ['807'], source_kind: 'detail_graph' },
      'edge:807-category-2': { id: 'edge:807-category-2', source: 'entity:山名', target: 'entity:地名', type: 'site_relation', label: '类目', weight: 1, record_ids: ['807'], source_kind: 'detail_graph' },
      'edge:807-category-3': { id: 'edge:807-category-3', source: 'entity:地名', target: 'entity:类目根', type: 'site_relation', label: '类目', weight: 1, record_ids: ['807'], source_kind: 'detail_graph' },
      'edge:807-category-4': { id: 'edge:807-category-4', source: 'entity:类目根', target: 'entity:四级之外', type: 'site_relation', label: '类目', weight: 1, record_ids: ['807'], source_kind: 'detail_graph' },
    },
  }

  const filtered = filterDocumentGraph(data, {
    query: '',
    categories: [],
    description: 'all',
    focusNodeId: 'entity:章莪之山',
    nodeTypes: ['entity'],
    edgeTypes: ['site_relation'],
  })

  assert.deepEqual(Object.keys(filtered.edges).sort(), ['edge:807-category-1', 'edge:807-category-2', 'edge:807-category-3', 'edge:813-place'])
})

test('groups focused entity description relationships under a virtual description node', () => {
  const data: DocumentCollectionGraph = {
    nodes: {
      'entity:槐江之山': { id: 'entity:槐江之山', label: '槐江之山', type: 'entity', records: ['705'], data: {} },
      'descriptor:丘時之水出焉': { id: 'descriptor:丘時之水出焉', label: '丘時之水出焉', type: 'descriptor', records: ['705'], data: {} },
      'descriptor:多玉': { id: 'descriptor:多玉', label: '多玉', type: 'descriptor', records: ['705'], data: {} },
    },
    edges: {
      'edge:desc-1': { id: 'edge:desc-1', source: 'entity:槐江之山', target: 'descriptor:丘時之水出焉', type: 'site_relation', label: '描述', weight: 1, record_ids: ['705'], source_kind: 'detail_graph' },
      'edge:desc-2': { id: 'edge:desc-2', source: 'entity:槐江之山', target: 'descriptor:多玉', type: 'site_relation', label: '描述', weight: 1, record_ids: ['705'], source_kind: 'detail_graph' },
    },
  }

  const filtered = filterDocumentGraph(data, {
    query: '',
    categories: [],
    description: 'all',
    focusNodeId: 'entity:槐江之山',
    nodeTypes: ['entity', 'descriptor', 'description_group'],
    edgeTypes: ['site_relation'],
  })

  const groupId = 'description_group:entity:槐江之山:entity:槐江之山'
  assert.equal(filtered.nodes[groupId]?.label, '描述')
  assert.equal(filtered.nodes[groupId]?.data.virtual, true)
})
