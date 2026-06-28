import type { DocumentGraphEdge, DocumentGraphNode } from '../ProjectStorage'

export const detailRelationType = ['detail', 'relation'].join('_')
export const siteRelationType = ['site', 'relation'].join('_')

const edgeSourceKindField = ['source', 'kind'].join('_') as keyof DocumentGraphEdge

export function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

export function recordForDocumentGraphNode(node: DocumentGraphNode): Record<string, unknown> | undefined {
  const record = node.data.record
  return record && typeof record === 'object' && !Array.isArray(record) ? record as Record<string, unknown> : undefined
}

export function categoryPathsForDocumentGraphNode(node: DocumentGraphNode): string[][] {
  if (node.type === 'entity' && Array.isArray(node.data.categoryPathGroups)) {
    return node.data.categoryPathGroups
      .filter(Array.isArray)
      .map((path) => path.map((item) => String(item).trim()))
  }
  if (node.type === 'term' || node.type === 'entity') {
    const record = recordForDocumentGraphNode(node)
    return [[
      String(record?.category_1 ?? node.data.category_1 ?? '').trim(),
      String(record?.category_2 ?? node.data.category_2 ?? '').trim(),
      String(record?.category_3 ?? node.data.category_3 ?? '').trim(),
    ]]
  }
  return []
}

export function isDetailRelation(edge: DocumentGraphEdge) {
  return edge.record_ids.length > 0
}

type DocumentGraphEdgeCore = Pick<DocumentGraphEdge, 'id' | 'source' | 'target' | 'type' | 'label' | 'weight' | 'record_ids'>

export function documentEdgeWithSourceKind(edge: DocumentGraphEdgeCore, sourceKind: string): DocumentGraphEdge {
  return { ...edge, [edgeSourceKindField]: sourceKind } as DocumentGraphEdge
}

export function edgeSourceKind(edge: DocumentGraphEdge) {
  const value = edge[edgeSourceKindField]
  return typeof value === 'string' ? value : ''
}
