import type { DocumentCollectionGraph } from '../ProjectStorage'
import type { DocumentCategoryLevel, DocumentNodeAction } from './documentGraphTypes'
import {
  categoryPathsForDocumentGraphNode,
  recordForDocumentGraphNode,
} from './documentGraphCoreModel'

function nodeFrom(graph: DocumentCollectionGraph, visibleGraph: DocumentCollectionGraph, nodeId: string) {
  return graph.nodes[nodeId] ?? visibleGraph.nodes[nodeId]
}

function nodeRecordId(graph: DocumentCollectionGraph, nodeId: string) {
  const node = graph.nodes[nodeId]
  return String(node?.data.source_id ?? node?.records[0] ?? '') || undefined
}

function termWithSameLabel(graph: DocumentCollectionGraph, nodeId: string) {
  const node = graph.nodes[nodeId]
  if (!node || node.type === 'term') return undefined
  return Object.values(graph.nodes)
    .filter((candidate) => (candidate.type === 'term' || candidate.type === 'entity') && candidate.label === node.label)
    .map((candidate) => ({ nodeId: candidate.id, recordId: String(candidate.data.source_id ?? candidate.records[0] ?? '') }))
    .find((candidate) => candidate.recordId && node.records.includes(candidate.recordId))
}

function recordForFocusedDocumentNode(
  graph: DocumentCollectionGraph,
  visibleGraph: DocumentCollectionGraph,
  nodeId: string,
  currentRecordId?: string,
) {
  const node = nodeFrom(graph, visibleGraph, nodeId)
  if (!node || node.data.focusable === false) return undefined
  if (node.type === 'term') return nodeRecordId(graph, nodeId)

  const ownTerm = termWithSameLabel(graph, nodeId)
  if (ownTerm) return ownTerm.recordId
  if (currentRecordId && node.records.includes(currentRecordId)) return currentRecordId

  const relatedRecordIds = Object.values(visibleGraph.edges)
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .flatMap((edge) => edge.record_ids)
  return relatedRecordIds.find((recordId) => node.records.includes(recordId)) ?? node.records[0]
}

export function focusTargetForDocumentNode(
  graph: DocumentCollectionGraph,
  visibleGraph: DocumentCollectionGraph,
  nodeId: string,
  currentRecordId?: string,
) {
  const node = nodeFrom(graph, visibleGraph, nodeId)
  if (!node || node.data.focusable === false) return undefined
  return {
    nodeId,
    recordId: recordForFocusedDocumentNode(graph, visibleGraph, nodeId, currentRecordId),
  }
}

function categoryLevelFromEdgeType(edgeType: string, edgeLabel: string): DocumentCategoryLevel | undefined {
  if (edgeType === 'HAS_CATEGORY_1' || edgeLabel === '一级类目') return 1
  if (edgeType === 'HAS_CATEGORY_2' || edgeLabel === '二级类目') return 2
  if (edgeType === 'HAS_CATEGORY_3' || edgeLabel === '三级类目') return 3
  return undefined
}

function categoryRecordNode(graph: DocumentCollectionGraph, recordId?: string) {
  if (!recordId) return undefined
  return Object.values(graph.nodes).find((node) => (
    (node.type === 'term' || node.type === 'entity') && node.records.includes(recordId)
  ))
}

function categoryPathForActionNode(graph: DocumentCollectionGraph, nodeId: string, currentRecordId?: string) {
  const recordNode = categoryRecordNode(graph, currentRecordId)
  if (!recordNode) return {}
  const record = recordForDocumentGraphNode(recordNode)
  const category1 = String(recordNode.data.category_1 ?? record?.category_1 ?? '')
  const category2 = String(recordNode.data.category_2 ?? record?.category_2 ?? '')
  const category3 = String(recordNode.data.category_3 ?? record?.category_3 ?? '')
  const categoryId = nodeId.startsWith('category:') ? nodeId.slice('category:'.length) : graph.nodes[nodeId]?.label
  if (category2 === categoryId) return { parent: category1 || undefined }
  if (category3 === categoryId) return { grandparent: category1 || undefined, parent: category2 || undefined }
  return {}
}

function categoryLevelForNode(
  graph: DocumentCollectionGraph,
  visibleGraph: DocumentCollectionGraph,
  nodeId: string,
  currentRecordId?: string,
) {
  const rawEdge = Object.values(graph.edges).find((item) => {
    if (item.source !== nodeId && item.target !== nodeId) return false
    if (!currentRecordId || !item.record_ids.includes(currentRecordId)) return false
    return Boolean(categoryLevelFromEdgeType(item.type, item.label))
  })
  if (rawEdge) return categoryLevelFromEdgeType(rawEdge.type, rawEdge.label)

  const edge = Object.values(visibleGraph.edges).find((item) => item.source === nodeId || item.target === nodeId)
  return edge ? categoryLevelFromEdgeType(edge.type, edge.label) : undefined
}

function categoryRelationRecordIds(
  graph: DocumentCollectionGraph,
  visibleGraph: DocumentCollectionGraph,
  nodeId: string,
  currentRecordId?: string,
) {
  const edges = [...Object.values(graph.edges), ...Object.values(visibleGraph.edges)]
  return Array.from(new Set(edges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .filter((edge) => edge.label.includes('类目') || Boolean(categoryLevelFromEdgeType(edge.type, edge.label)))
    .filter((edge) => !currentRecordId || edge.record_ids.includes(currentRecordId))
    .flatMap((edge) => edge.record_ids)
    .filter((recordId) => !currentRecordId || recordId === currentRecordId)))
}

function categoryFilterFromPath(path: string[], label: string): DocumentNodeAction | undefined {
  const [first = '', second = '', third = ''] = path.map((item) => item.trim())
  if (label === first) {
    return { type: 'category_filter', categoryLevel: 1, category: first }
  }
  if (label === second) {
    return { type: 'category_filter', categoryLevel: 2, category: second, parent: first || undefined }
  }
  if (label === third) {
    return {
      type: 'category_filter',
      categoryLevel: 3,
      category: third,
      grandparent: first || undefined,
      parent: second || undefined,
    }
  }
  return undefined
}

function categoryFilterForRecordPathNode(
  graph: DocumentCollectionGraph,
  visibleGraph: DocumentCollectionGraph,
  nodeId: string,
  currentRecordId?: string,
) {
  const node = nodeFrom(graph, visibleGraph, nodeId)
  const label = node?.label.trim()
  if (!node || !label) return undefined
  const relationRecordIds = categoryRelationRecordIds(graph, visibleGraph, nodeId, currentRecordId)
  const recordIds = currentRecordId && relationRecordIds.includes(currentRecordId)
    ? [currentRecordId]
    : relationRecordIds
  if (recordIds.length === 0) return undefined

  for (const recordId of recordIds) {
    const recordNodes = Object.values(graph.nodes).filter((candidate) => (
      (candidate.type === 'term' || candidate.type === 'entity') && candidate.records.includes(recordId)
    ))
    for (const recordNode of recordNodes) {
      for (const path of categoryPathsForDocumentGraphNode(recordNode)) {
        const categoryFilter = categoryFilterFromPath(path, label)
        if (categoryFilter) return categoryFilter
      }
    }
  }
  return undefined
}

export function contextActionForDocumentNode(
  graph: DocumentCollectionGraph,
  visibleGraph: DocumentCollectionGraph,
  nodeId: string,
  currentRecordId?: string,
): DocumentNodeAction | undefined {
  const node = nodeFrom(graph, visibleGraph, nodeId)
  if (!node || node.data.focusable === false) return undefined
  if (node.type === 'category') {
    const categoryLevel = categoryLevelForNode(graph, visibleGraph, nodeId, currentRecordId)
    if (categoryLevel === 1 || categoryLevel === 2 || categoryLevel === 3) {
      return {
        type: 'category_filter',
        categoryLevel,
        category: node.label,
        ...categoryPathForActionNode(graph, nodeId, currentRecordId),
      }
    }
  }
  const categoryPathAction = categoryFilterForRecordPathNode(graph, visibleGraph, nodeId, currentRecordId)
  if (categoryPathAction) return categoryPathAction
  return { type: 'focus', nodeId, recordId: undefined }
}
