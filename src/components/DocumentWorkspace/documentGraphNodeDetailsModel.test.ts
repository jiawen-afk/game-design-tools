import assert from 'node:assert/strict'
import test from 'node:test'

import type { DocumentCollectionGraph } from '../ProjectStorage'
import { describeDocumentGraphNode } from './documentGraphNodeDetailsModel'

test('document graph node details model groups virtual description children under the neighbor', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:槐江之山': { id: 'entity:槐江之山', label: '槐江之山', type: 'entity', records: ['705'], data: {} },
      'description_group:705:entity:槐江之山': {
        id: 'description_group:705:entity:槐江之山',
        label: '描述',
        type: 'description_group',
        records: ['705'],
        data: { focusable: false, virtual: true },
      },
      'descriptor:多玉': { id: 'descriptor:多玉', label: '多玉', type: 'descriptor', records: ['705'], data: {} },
    },
    edges: {
      'edge:description-group': {
        id: 'edge:description-group',
        source: 'entity:槐江之山',
        target: 'description_group:705:entity:槐江之山',
        type: 'site_relation',
        label: '描述',
        weight: 1,
        record_ids: ['705'],
        source_kind: 'virtual_description_group',
      },
      'edge:description-item': {
        id: 'edge:description-item',
        source: 'description_group:705:entity:槐江之山',
        target: 'descriptor:多玉',
        type: 'site_relation',
        label: '描述',
        weight: 1,
        record_ids: ['705'],
        source_kind: 'virtual_description_item',
      },
    },
  }

  const details = describeDocumentGraphNode(graph, graph.nodes['entity:槐江之山']!)

  assert.deepEqual(details.neighbors, [{
    id: 'description_group:705:entity:槐江之山',
    label: '描述',
    edgeLabel: '描述',
    focusable: false,
    children: [{
      id: 'descriptor:多玉',
      label: '多玉',
      edgeLabel: '描述',
      focusable: true,
    }],
  }])
})
