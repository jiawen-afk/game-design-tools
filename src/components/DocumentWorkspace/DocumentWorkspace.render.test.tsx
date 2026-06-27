import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { DocumentGraphCanvasPanel } from './DocumentGraphCanvasPanel'
import { DocumentGraphControlsPanel } from './DocumentGraphControlsPanel'
import { DocumentGraphDetailsPanel } from './DocumentGraphDetailsPanel'
import {
  createDefaultDocumentGraphFilter,
  filterDocumentGraph,
  type DocumentGraphFilterState,
} from './documentGraphViewModel'
import type { DocumentCollectionGraph } from '../ProjectStorage'

const graph: DocumentCollectionGraph = {
  nodes: {
    'entity:畢方': {
      id: 'entity:畢方',
      label: '畢方',
      type: 'entity',
      records: ['813'],
      data: {
        roles: ['term'],
        categoryPathGroups: [['动物', '鸟名']],
        has_description: true,
        record: {
          title: '畢方',
          description: '其状如鹤',
          category_1: '动物',
          category_2: '鸟名',
          place_path: '章莪之山',
          book_title: '山海经',
        },
      },
    },
    'descriptor:其状如鹤': {
      id: 'descriptor:其状如鹤',
      label: '其状如鹤',
      type: 'descriptor',
      records: ['813'],
      data: {},
    },
  },
  edges: {
    'edge:desc': {
      id: 'edge:desc',
      source: 'entity:畢方',
      target: 'descriptor:其状如鹤',
      type: 'detail_relation',
      label: '描述',
      weight: 1,
      record_ids: ['813'],
      source_kind: 'record',
    },
  },
}

test('document graph panels render admin-style controls, list, graph mode, and details', () => {
  const filter: DocumentGraphFilterState = {
    ...createDefaultDocumentGraphFilter(graph),
    focusNodeId: undefined,
    categoryLevel: 2,
    categories: ['鸟名'],
    categoryFilters: [{ level: 2, parent: '动物', value: '鸟名' }],
  }
  const visible = filterDocumentGraph(graph, filter)

  const controls = renderToStaticMarkup(
    <DocumentGraphControlsPanel
      graph={graph}
      visibleGraph={visible}
      filter={filter}
      searchDraft=""
      categoryTreeQuery=""
      onSearchDraftChange={() => undefined}
      onSearchSubmit={() => undefined}
      onCategoryTreeQueryChange={() => undefined}
      onFilterChange={() => undefined}
      onReset={() => undefined}
    />,
  )
  assert.match(controls, /山海经图谱/)
  assert.match(controls, /层级类目关联展示筛选/)
  assert.match(controls, /<details/)
  assert.match(controls, /已筛选类目/)
  assert.match(controls, /动物 \/ 鸟名/)
  assert.match(controls, /清空类目筛选/)
  assert.match(controls, /是否有描述/)
  assert.match(controls, /词条/)
  assert.match(controls, /词条实体/)
  assert.match(controls, /描述特征/)
  assert.match(controls, /详情页关系/)

  const list = renderToStaticMarkup(
    <DocumentGraphCanvasPanel
      mode="list"
      graph={visible}
      focusNodeId={undefined}
      onFocusNode={() => undefined}
      onContextNode={() => undefined}
      onOpenListNode={() => undefined}
    />,
  )
  assert.match(list, /筛选结果/)
  assert.match(list, /查看详情/)

  const details = renderToStaticMarkup(
    <DocumentGraphDetailsPanel
      graph={graph}
      node={graph.nodes['entity:畢方']}
      onFocusNode={() => undefined}
    />,
  )
  assert.match(details, /畢方/)
  assert.match(details, /词条实体/)
  assert.match(details, /词条/)
  assert.match(details, /相邻节点/)
})
