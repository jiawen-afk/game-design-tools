import type { DocumentCollectionGraph, DocumentGraphNode } from '../ProjectStorage'
import type { DocumentGraphNodeDetails } from './documentGraphTypes'
import { edgeSourceKind } from './documentGraphCoreModel'

function sourceKindLabel(sourceKind: string) {
  return {
    derived_field: '字段',
    detail_graph: '详情页关系',
    detail_site_graph: '详情页关系',
    virtual_description_group: '详情页关系',
    virtual_description_item: '详情页关系',
  }[sourceKind] ?? sourceKind
}

export function describeDocumentGraphNode(graph: DocumentCollectionGraph, node: DocumentGraphNode): DocumentGraphNodeDetails {
  const neighborsById = new Map<string, { id: string; labels: Set<string>; sources: Set<string> }>()
  Object.values(graph.edges).forEach((edge) => {
    const neighborId = edge.source === node.id ? edge.target : edge.target === node.id ? edge.source : ''
    if (!neighborId) return
    const entry = neighborsById.get(neighborId) ?? { id: neighborId, labels: new Set<string>(), sources: new Set<string>() }
    entry.labels.add(edge.label)
    entry.sources.add(sourceKindLabel(edgeSourceKind(edge)))
    neighborsById.set(neighborId, entry)
  })
  const neighbors = Array.from(neighborsById.values()).map((item) => {
    const labelText = Array.from(item.labels).join(' / ')
    const sourceText = Array.from(item.sources).join(' + ')
    const neighborNode = graph.nodes[item.id]
    const focusable = neighborNode?.data.focusable !== false
    const children = neighborNode?.type === 'description_group'
      ? Object.values(graph.edges)
        .filter((edge) => edge.source === item.id || edge.target === item.id)
        .map((edge) => ({ edge, childId: edge.source === item.id ? edge.target : edge.source }))
        .filter(({ childId }) => childId !== node.id)
        .map(({ edge, childId }) => {
          const childNode = graph.nodes[childId]
          return {
            id: childId,
            label: childNode?.label ?? childId,
            edgeLabel: edge.label,
            focusable: childNode?.data.focusable !== false,
          }
        })
      : undefined
    return {
      id: item.id,
      label: neighborNode?.label ?? item.id,
      edgeLabel: item.sources.size > 1 ? `${labelText} · ${sourceText}` : labelText,
      focusable,
      ...(children ? { children } : {}),
    }
  })
  return { node, neighbors }
}
