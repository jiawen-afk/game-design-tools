import assert from 'node:assert/strict'
import test from 'node:test'

import type { DocumentCollectionGraph } from '../ProjectStorage'
import { buildDocumentCategoryTree } from './documentGraphCategoryModel'

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
