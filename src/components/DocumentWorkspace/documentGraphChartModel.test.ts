import assert from 'node:assert/strict'
import test from 'node:test'

import type { DocumentCollectionGraph } from '../ProjectStorage'
import { buildDocumentGraphChartOption } from './documentGraphChartModel'

test('document graph chart model highlights the focused node and hides unused legend categories', () => {
  const graph: DocumentCollectionGraph = {
    nodes: {
      'entity:槐江之山': { id: 'entity:槐江之山', label: '槐江之山', type: 'entity', records: ['705'], data: {} },
      'descriptor:多玉': { id: 'descriptor:多玉', label: '多玉', type: 'descriptor', records: ['705'], data: {} },
    },
    edges: {
      'edge:desc': { id: 'edge:desc', source: 'entity:槐江之山', target: 'descriptor:多玉', type: 'site_relation', label: '描述', weight: 1, record_ids: ['705'], source_kind: 'detail_graph' },
    },
  }

  const option = buildDocumentGraphChartOption(graph, 'entity:槐江之山')
  const series = option.series[0]!

  assert.deepEqual(option.legend.data, ['术语', '描述'])
  assert.deepEqual(series.links, [{ source: 'entity:槐江之山', target: 'descriptor:多玉', value: '描述', silent: true }])
  assert.deepEqual(series.data.find((node) => node.id === 'entity:槐江之山'), {
    id: 'entity:槐江之山',
    name: '槐江之山',
    category: 0,
    symbolSize: 80,
    itemStyle: { color: '#6f5bd7' },
  })
})
