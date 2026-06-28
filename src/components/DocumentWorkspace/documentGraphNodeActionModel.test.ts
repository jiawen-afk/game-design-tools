import assert from 'node:assert/strict'
import test from 'node:test'

import type { DocumentCollectionGraph } from '../ProjectStorage'
import {
  contextActionForDocumentNode,
  focusTargetForDocumentNode,
} from './documentGraphNodeActionModel'

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

test('turns category-like entity context action into category filter action from record path', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:槐江之山': {
        id: 'entity:槐江之山',
        label: '槐江之山',
        type: 'entity',
        records: ['807'],
        data: {
          category_1: '地名',
          category_2: '山名',
          categoryPathGroups: [['地名', '山名']],
        },
      },
      'entity:山名': {
        id: 'entity:山名',
        label: '山名',
        type: 'entity',
        records: ['807'],
        data: {},
      },
    },
    edges: {
      'edge:category': {
        id: 'edge:category',
        source: 'entity:槐江之山',
        target: 'entity:山名',
        type: 'site_relation',
        label: '类目',
        weight: 1,
        record_ids: ['807'],
        source_kind: 'detail_graph',
      },
    },
  }

  assert.deepEqual(contextActionForDocumentNode(graph, graph, 'entity:山名', '807'), {
    type: 'category_filter',
    categoryLevel: 2,
    category: '山名',
    parent: '地名',
  })
})

test('keeps same-label ordinary entity context action focused without category relation', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:槐江之山': {
        id: 'entity:槐江之山',
        label: '槐江之山',
        type: 'entity',
        records: ['807'],
        data: {
          category_1: '地名',
          category_2: '山名',
          categoryPathGroups: [['地名', '山名']],
        },
      },
      'entity:山名': {
        id: 'entity:山名',
        label: '山名',
        type: 'entity',
        records: ['807'],
        data: {},
      },
    },
    edges: {
      'edge:alias': {
        id: 'edge:alias',
        source: 'entity:槐江之山',
        target: 'entity:山名',
        type: 'detail_relation',
        label: '别称',
        weight: 1,
        record_ids: ['807'],
        source_kind: 'detail_graph',
      },
    },
  }

  assert.deepEqual(contextActionForDocumentNode(graph, graph, 'entity:山名', '807'), {
    type: 'focus',
    nodeId: 'entity:山名',
    recordId: undefined,
  })
})

test('document graph node action model resolves focus record from same-label entity records', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:槐江之山': {
        id: 'entity:槐江之山',
        label: '槐江之山',
        type: 'entity',
        records: ['705'],
        data: { source_id: '705' },
      },
      'descriptor:槐江之山': {
        id: 'descriptor:槐江之山',
        label: '槐江之山',
        type: 'descriptor',
        records: ['705'],
        data: {},
      },
    },
    edges: {
      'edge:alias': {
        id: 'edge:alias',
        source: 'entity:槐江之山',
        target: 'descriptor:槐江之山',
        type: 'site_relation',
        label: '别称',
        weight: 1,
        record_ids: ['705'],
        source_kind: 'detail_graph',
      },
    },
  }

  assert.deepEqual(focusTargetForDocumentNode(graph, graph, 'descriptor:槐江之山'), {
    nodeId: 'descriptor:槐江之山',
    recordId: '705',
  })
})
