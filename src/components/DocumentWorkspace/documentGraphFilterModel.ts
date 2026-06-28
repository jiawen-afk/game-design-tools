import type { DocumentCollectionGraph, DocumentGraphNode } from '../ProjectStorage'
import type { DocumentCategoryFilter, DocumentDescriptionFilter, DocumentGraphFilterState } from './documentGraphTypes'
import { allDocumentEdgeTypes, documentGraphEntityRoles, documentGraphNodeTypes } from './documentGraphLabels'
import {
  categoryPathsForDocumentGraphNode,
  recordForDocumentGraphNode,
  stringArray,
} from './documentGraphCoreModel'
import { focusDocumentGraph } from './documentGraphFocusModel'

export function createDefaultDocumentGraphFilter(graph: DocumentCollectionGraph): DocumentGraphFilterState {
  return {
    query: '',
    categories: [],
    categoryFilters: [],
    entityRoles: documentGraphEntityRoles,
    description: 'all',
    nodeTypes: documentGraphNodeTypes,
    edgeTypes: allDocumentEdgeTypes(graph),
  }
}

function matchesDescription(node: DocumentGraphNode, description: DocumentDescriptionFilter) {
  if (!['term', 'entity'].includes(node.type) || description === 'all') return true
  const hasDescription = node.data.has_description === true || Boolean(recordForDocumentGraphNode(node)?.description)
  return description === 'with' ? hasDescription : !hasDescription
}

function matchesQuery(node: DocumentGraphNode, query: string) {
  const value = query.trim()
  return !value || node.label.includes(value)
}

function matchesCategoryFilter(path: string[], filter: DocumentCategoryFilter) {
  if (filter.level === 1) return path[0] === filter.value
  if (filter.level === 2) return path[0] === filter.parent && path[1] === filter.value
  return path[0] === filter.grandparent && path[1] === filter.parent && path[2] === filter.value
}

function matchesCategory(node: DocumentGraphNode, state: DocumentGraphFilterState) {
  if (!['term', 'entity'].includes(node.type)) return true
  const paths = categoryPathsForDocumentGraphNode(node)
  if (state.categoryFilters?.length) {
    return state.categoryFilters.some((filter) => paths.some((path) => matchesCategoryFilter(path, filter)))
  }
  if (state.categories.length === 0) return true
  const level = state.categoryLevel ?? 1
  return paths.some((path) => state.categories.includes(path[level - 1] ?? ''))
}

function matchesEntityRoles(node: DocumentGraphNode, roles: string[] | undefined) {
  if (node.type !== 'entity' || !roles?.length) return true
  const nodeRoles = stringArray(node.data.roles)
  return roles.some((role) => nodeRoles.includes(role))
}

export function filterDocumentGraph(graph: DocumentCollectionGraph, state: DocumentGraphFilterState): DocumentCollectionGraph {
  if (state.focusNodeId) return focusDocumentGraph(graph, state)

  const hasEntities = Object.values(graph.nodes).some((node) => node.type === 'entity')
  const primaryType = hasEntities ? 'entity' : 'term'
  const matchingTermIds = new Set(
    Object.entries(graph.nodes)
      .filter(([, node]) => node.type === primaryType)
      .filter(([, node]) => (
        state.nodeTypes.includes(node.type)
        && matchesQuery(node, state.query)
        && matchesCategory(node, state)
        && matchesDescription(node, state.description)
        && matchesEntityRoles(node, state.entityRoles)
      ))
      .map(([id]) => id),
  )
  const visibleNodeIds = new Set<string>(matchingTermIds)
  const edges = Object.fromEntries(Object.entries(graph.edges).filter(([, edge]) => {
    if (!state.edgeTypes.includes(edge.type)) return false
    const sourceIsMatch = matchingTermIds.has(edge.source)
    const targetIsMatch = matchingTermIds.has(edge.target)
    if (!sourceIsMatch && !targetIsMatch) return false
    if (sourceIsMatch && targetIsMatch) {
      visibleNodeIds.add(edge.source)
      visibleNodeIds.add(edge.target)
      return true
    }
    const neighborId = sourceIsMatch ? edge.target : edge.source
    const neighbor = graph.nodes[neighborId]
    if (!neighbor || !state.nodeTypes.includes(neighbor.type)) return false
    if (neighbor.type === primaryType) return false
    visibleNodeIds.add(edge.source)
    visibleNodeIds.add(edge.target)
    return true
  }))
  const nodes = Object.fromEntries(Object.entries(graph.nodes).filter(([id]) => visibleNodeIds.has(id)))
  return { nodes, edges }
}

export function filterDocumentTermList(graph: DocumentCollectionGraph) {
  const hasEntities = Object.values(graph.nodes).some((node) => node.type === 'entity')
  return Object.values(graph.nodes)
    .filter((node) => node.type === (hasEntities ? 'entity' : 'term'))
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-Hans-CN'))
}
