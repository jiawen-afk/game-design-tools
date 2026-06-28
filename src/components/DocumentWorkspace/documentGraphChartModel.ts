import type { DocumentCollectionGraph, DocumentGraphNode } from '../ProjectStorage'
import type { DocumentGraphChartOption } from './documentGraphTypes'

const documentGraphCategoryNames = ['术语', '描述', '类目', '归属']
const documentGraphFocusColor = '#6f5bd7'
const documentGraphLineColor = '#7a3342'

function documentNodeCategory(node: DocumentGraphNode) {
  if (node.type === 'term' || node.type === 'entity') return 0
  if (node.type === 'descriptor' || node.type === 'description_group') return 1
  if (node.type === 'category') return 2
  return 3
}

export function buildDocumentGraphChartOption(data: DocumentCollectionGraph, focusNodeId?: string): DocumentGraphChartOption {
  const usedCategoryIndexes = new Set<number>()
  const nodes = Object.values(data.nodes).map((node) => {
    const category = documentNodeCategory(node)
    usedCategoryIndexes.add(category)
    return {
      id: node.id,
      name: node.label,
      category,
      symbolSize: node.id === focusNodeId ? 80 : 50,
      ...(node.id === focusNodeId ? { itemStyle: { color: documentGraphFocusColor } } : {}),
    }
  })
  const links = Object.values(data.edges).map((edge) => ({
    source: edge.source,
    target: edge.target,
    value: edge.label,
    silent: true,
  }))
  const legendData = Array.from(usedCategoryIndexes)
    .sort((left, right) => left - right)
    .map((index) => documentGraphCategoryNames[index])

  return {
    legend: {
      data: legendData,
      y: 'bottom',
    },
    tooltip: {
      show: false,
    },
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      symbolSize: 50,
      categories: documentGraphCategoryNames.map((name) => ({ name })),
      data: nodes,
      links,
      draggable: true,
      force: {
        gravity: 0,
        edgeLength: 150,
        layoutAnimation: false,
        repulsion: 420,
      },
      lineStyle: {
        color: documentGraphLineColor,
        width: 1,
        type: 'solid',
        curveness: 0,
        opacity: 1,
      },
      label: {
        show: true,
        position: 'bottom',
        distance: 5,
        fontSize: 14,
        align: 'center',
      },
      edgeSymbol: ['circle', 'arrow'],
      legendHoverLink: true,
      focusNodeAdjacency: false,
      edgeLabel: {
        show: true,
        position: 'middle',
        fontSize: 12,
        formatter: '{c}',
      },
    }],
  }
}
