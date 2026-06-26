import type { DocumentCollectionGraph, DocumentGraphEdge, DocumentGraphNode } from '../ProjectStorage'

export type DocumentDescriptionFilter = 'all' | 'with' | 'without'
export type DocumentCategoryLevel = 1 | 2 | 3

export interface DocumentCategoryFilter {
  level: DocumentCategoryLevel
  value: string
  grandparent?: string
  parent?: string
}

export interface DocumentGraphFilterState {
  query: string
  categories: string[]
  categoryLevel?: DocumentCategoryLevel
  categoryFilters?: DocumentCategoryFilter[]
  entityRoles?: string[]
  description: DocumentDescriptionFilter
  nodeTypes: string[]
  edgeTypes: string[]
  focusNodeId?: string
  focusRecordId?: string
}

export type DocumentNodeAction =
  | { type: 'focus'; nodeId: string; recordId?: string }
  | { type: 'category_filter'; categoryLevel: DocumentCategoryLevel; category: string; parent?: string; grandparent?: string }

export interface DocumentCategoryBranch {
  name: string
  children: Array<{ name: string; children: string[] }>
}

export interface DocumentGraphNodeDetails {
  node: DocumentGraphNode
  neighbors: Array<{
    id: string
    label: string
    edgeLabel: string
    focusable: boolean
    children?: Array<{ id: string; label: string; edgeLabel: string; focusable: boolean }>
  }>
}

export interface DocumentGraphChartNode {
  id: string
  name: string
  category: number
  symbolSize: number
  itemStyle?: { color: string }
}

export interface DocumentGraphChartLink {
  source: string
  target: string
  value: string
  silent: boolean
}

export interface DocumentGraphChartOption {
  legend: { data: string[]; y: string }
  tooltip: { show: boolean }
  series: Array<{
    type: 'graph'
    layout: 'force'
    roam: boolean
    symbolSize: number
    categories: Array<{ name: string }>
    data: DocumentGraphChartNode[]
    links: DocumentGraphChartLink[]
    draggable: boolean
    force: { gravity: number; edgeLength: number; layoutAnimation: boolean; repulsion: number }
    lineStyle: { color: string; width: number; type: 'solid'; curveness: number; opacity: number }
    label: { show: boolean; position: string; distance: number; fontSize: number; align: string }
    edgeSymbol: [string, string]
    legendHoverLink: boolean
    focusNodeAdjacency: boolean
    edgeLabel: { show: boolean; position: string; fontSize: number; formatter: string }
  }>
}

export const documentGraphNodeTypes = ['entity', 'term', 'category', 'place', 'book', 'chapter', 'version', 'descriptor', 'description_group']
export const documentGraphEntityRoles = ['term', 'place', 'category']

const documentGraphCategoryNames = ['术语', '描述', '类目', '归属']
const documentGraphFocusColor = '#6f5bd7'
const documentGraphLineColor = '#7a3342'
const documentGraphEdgeTypeOrder = [
  'HAS_CATEGORY_1',
  'HAS_CATEGORY_2',
  'HAS_CATEGORY_3',
  'HAS_CATEGORY',
  'LOCATED_IN',
  'PART_OF_PLACE',
  'IN_BOOK',
  'IN_CHAPTER',
  'HAS_VERSION',
]
const semanticShareTypes = new Set(['term', 'place', 'category', 'descriptor', 'entity'])
const edgeSourceKindField = ['source', 'kind'].join('_') as keyof DocumentGraphEdge

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

export function allDocumentEdgeTypes(graph: DocumentCollectionGraph): string[] {
  return Array.from(new Set(Object.values(graph.edges).map((edge) => edge.type))).sort((left, right) => {
    const leftOrder = documentGraphEdgeTypeOrder.indexOf(left)
    const rightOrder = documentGraphEdgeTypeOrder.indexOf(right)
    if (leftOrder !== -1 || rightOrder !== -1) {
      return (leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder)
        - (rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder)
    }
    return left.localeCompare(right, 'zh-Hans-CN')
  })
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

function categoryPathsForNode(node: DocumentGraphNode): string[][] {
  if (node.type === 'entity' && Array.isArray(node.data.categoryPathGroups)) {
    return node.data.categoryPathGroups
      .filter(Array.isArray)
      .map((path) => path.map((item) => String(item).trim()))
  }
  if (node.type === 'term' || node.type === 'entity') {
    const record = recordForNode(node)
    return [[
      String(record?.category_1 ?? node.data.category_1 ?? '').trim(),
      String(record?.category_2 ?? node.data.category_2 ?? '').trim(),
      String(record?.category_3 ?? node.data.category_3 ?? '').trim(),
    ]]
  }
  return []
}

function recordForNode(node: DocumentGraphNode): Record<string, unknown> | undefined {
  const record = node.data.record
  return record && typeof record === 'object' && !Array.isArray(record) ? record as Record<string, unknown> : undefined
}

function matchesDescription(node: DocumentGraphNode, description: DocumentDescriptionFilter) {
  if (!['term', 'entity'].includes(node.type) || description === 'all') return true
  const hasDescription = node.data.has_description === true || Boolean(recordForNode(node)?.description)
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
  const paths = categoryPathsForNode(node)
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

function isDetailRelation(edge: DocumentGraphEdge) {
  return edge.record_ids.length > 0
}

type DocumentGraphEdgeCore = Pick<DocumentGraphEdge, 'id' | 'source' | 'target' | 'type' | 'label' | 'weight' | 'record_ids'>

function documentEdgeWithSourceKind(edge: DocumentGraphEdgeCore, sourceKind: string): DocumentGraphEdge {
  return { ...edge, [edgeSourceKindField]: sourceKind } as DocumentGraphEdge
}

function edgeSourceKind(edge: DocumentGraphEdge) {
  const value = edge[edgeSourceKindField]
  return typeof value === 'string' ? value : ''
}

function descriptionGroupId(recordId: string, focusNodeId: string) {
  return `description_group:${recordId}:${focusNodeId}`
}

function detailCenterTermId(graph: DocumentCollectionGraph, recordId: string) {
  return Object.entries(graph.nodes).find(([, node]) => {
    if (node.type !== 'term' && node.type !== 'entity') return false
    const sourceId = node.data.source_id
    return String(sourceId ?? node.records[0] ?? '') === recordId || node.records.includes(recordId)
  })?.[0]
}

function sameLabelSemanticNodeIds(graph: DocumentCollectionGraph, node: DocumentGraphNode) {
  const sameLabelNodes = Object.values(graph.nodes)
    .filter((candidate) => semanticShareTypes.has(candidate.type) && candidate.label === node.label)
  if (!sameLabelNodes.some((candidate) => candidate.type === 'term' || candidate.type === 'entity')) return []
  return sameLabelNodes.map((candidate) => candidate.id)
}

function sameLabelSemanticRecordIds(graph: DocumentCollectionGraph, sameLabelIds: Set<string>) {
  const sameLabelNodes = Object.values(graph.nodes).filter((candidate) => sameLabelIds.has(candidate.id))
  const termRecordIds = sameLabelNodes
    .filter((candidate) => candidate.type === 'term' || candidate.type === 'entity')
    .flatMap((candidate) => [String(candidate.data.source_id ?? ''), ...candidate.records])
  const detailRecordIds = Object.values(graph.edges)
    .filter((edge) => isDetailRelation(edge))
    .filter((edge) => sameLabelIds.has(edge.source) || sameLabelIds.has(edge.target))
    .flatMap((edge) => edge.record_ids)
  return Array.from(new Set([...termRecordIds, ...detailRecordIds].filter(Boolean)))
}

function directDistanceEdges(edges: Array<[string, DocumentGraphEdge]>, centerIds: Set<string>) {
  if (centerIds.size === 0) return edges
  return edges.filter(([, edge]) => centerIds.has(edge.source) || centerIds.has(edge.target))
}

function directionalEntityDetailEdges(graph: DocumentCollectionGraph, focusNodeId: string) {
  const detailEdges = Object.entries(graph.edges).filter(([, edge]) => isDetailRelation(edge))
  const bySource = new Map<string, Array<[string, DocumentGraphEdge]>>()
  const byTarget = new Map<string, Array<[string, DocumentGraphEdge]>>()
  detailEdges.forEach(([edgeId, edge]) => {
    bySource.set(edge.source, [...(bySource.get(edge.source) ?? []), [edgeId, edge]])
    byTarget.set(edge.target, [...(byTarget.get(edge.target) ?? []), [edgeId, edge]])
  })

  const selected = new Map<string, DocumentGraphEdge>()
  const walk = (direction: 'out' | 'in') => {
    let frontier = new Set([focusNodeId])
    const visited = new Set([focusNodeId])
    for (let distance = 0; distance < 3; distance += 1) {
      const nextFrontier = new Set<string>()
      frontier.forEach((nodeId) => {
        const entries = direction === 'out' ? bySource.get(nodeId) ?? [] : byTarget.get(nodeId) ?? []
        entries.forEach(([edgeId, edge]) => {
          selected.set(edgeId, edge)
          const nextNodeId = direction === 'out' ? edge.target : edge.source
          if (!visited.has(nextNodeId)) {
            visited.add(nextNodeId)
            nextFrontier.add(nextNodeId)
          }
        })
      })
      frontier = nextFrontier
      if (frontier.size === 0) break
    }
  }

  walk('out')
  walk('in')
  return detailEdges.filter(([edgeId]) => selected.has(edgeId))
}

function focusGraph(graph: DocumentCollectionGraph, state: DocumentGraphFilterState): DocumentCollectionGraph {
  const focusNodeId = state.focusNodeId
  if (!focusNodeId) return { nodes: {}, edges: {} }
  const focusNode = graph.nodes[focusNodeId]
  if (!focusNode || !state.nodeTypes.includes(focusNode.type)) return { nodes: {}, edges: {} }

  const visibleNodeIds = new Set<string>([focusNodeId])
  const visibleNodes: Record<string, DocumentGraphNode> = {}
  const visibleEdges: Record<string, DocumentGraphEdge> = {}
  const sameLabelIds = new Set(sameLabelSemanticNodeIds(graph, focusNode))
  const sameLabelRecordIds = sameLabelSemanticRecordIds(graph, sameLabelIds)
  const focusedRecordIds = sameLabelRecordIds.length > 0
    ? sameLabelRecordIds
    : [String(state.focusRecordId ?? focusNode.data.source_id ?? focusNode.records[0] ?? '')].filter(Boolean)
  const focusedSourceId = focusedRecordIds.length === 1 ? focusedRecordIds[0] : ''
  const recordEdgeEntries = Object.entries(graph.edges).filter(([, edge]) => {
    if (!isDetailRelation(edge)) return false
    if (sameLabelRecordIds.length === 0 && focusNode.type !== 'term' && focusNode.type !== 'entity' && !state.focusRecordId) {
      return edge.source === focusNodeId || edge.target === focusNodeId
    }
    return focusedRecordIds.length === 0 || edge.record_ids.some((recordId) => focusedRecordIds.includes(recordId))
  })
  const detailEdgeEntries = focusNode.type === 'entity'
    ? directionalEntityDetailEdges(graph, focusNodeId)
    : focusNode.type === 'term'
      ? recordEdgeEntries
      : directDistanceEdges(recordEdgeEntries, sameLabelIds)
  const descriptionCenterId = focusNode.type === 'entity'
    ? focusNodeId
    : focusedSourceId
      ? detailCenterTermId(graph, focusedSourceId)
      : undefined
  const descriptionEdges = descriptionCenterId
    ? detailEdgeEntries.filter(([, edge]) => edge.label === '描述' && (edge.source === descriptionCenterId || edge.target === descriptionCenterId))
    : []
  const descriptionGroupKey = focusNode.type === 'entity' ? focusNodeId : focusedSourceId
  const descriptionGroupRecords = focusNode.type === 'entity' ? focusNode.records : [focusedSourceId]
  const groupDescriptions = Boolean(descriptionGroupKey && descriptionCenterId && descriptionEdges.length > 1)
  const groupId = groupDescriptions ? descriptionGroupId(descriptionGroupKey, descriptionCenterId!) : ''
  let addedDescriptionGroup = false

  if (groupDescriptions) {
    visibleNodes[groupId] = {
      id: groupId,
      label: '描述',
      type: 'description_group',
      records: descriptionGroupRecords,
      data: { focusable: false, virtual: true },
    }
    visibleNodeIds.add(groupId)
  }

  detailEdgeEntries.forEach(([edgeId, edge]) => {
    if (!state.edgeTypes.includes(edge.type)) return
    const source = graph.nodes[edge.source]
    const target = graph.nodes[edge.target]
    if (!source || !target || !state.nodeTypes.includes(source.type) || !state.nodeTypes.includes(target.type)) return

    if (groupDescriptions && descriptionCenterId && edge.label === '描述' && (edge.source === descriptionCenterId || edge.target === descriptionCenterId)) {
      const descriptorId = edge.source === descriptionCenterId ? edge.target : edge.source
      if (!addedDescriptionGroup) {
        visibleEdges[`edge:description-group:${descriptionGroupKey}:${descriptionCenterId}`] = documentEdgeWithSourceKind({
          id: `edge:description-group:${descriptionGroupKey}:${descriptionCenterId}`,
          source: descriptionCenterId,
          target: groupId,
          type: edge.type,
          label: '描述',
          weight: 1,
          record_ids: descriptionGroupRecords,
        }, 'virtual_description_group')
        addedDescriptionGroup = true
      }
      visibleEdges[`edge:description-item:${edgeId}`] = documentEdgeWithSourceKind({
        id: `edge:description-item:${edgeId}`,
        source: groupId,
        target: descriptorId,
        type: edge.type,
        label: '描述',
        weight: edge.weight,
        record_ids: edge.record_ids,
      }, 'virtual_description_item')
      visibleNodeIds.add(descriptionCenterId)
      visibleNodeIds.add(descriptorId)
      return
    }

    visibleEdges[edgeId] = edge
    visibleNodeIds.add(edge.source)
    visibleNodeIds.add(edge.target)
  })

  return {
    nodes: {
      ...Object.fromEntries(Object.entries(graph.nodes).filter(([id]) => visibleNodeIds.has(id))),
      ...visibleNodes,
    },
    edges: visibleEdges,
  }
}

export function filterDocumentGraph(graph: DocumentCollectionGraph, state: DocumentGraphFilterState): DocumentCollectionGraph {
  if (state.focusNodeId) return focusGraph(graph, state)

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

export function buildDocumentCategoryTree(graph: DocumentCollectionGraph): DocumentCategoryBranch[] {
  const branches = new Map<string, Map<string, Set<string>>>()
  Object.values(graph.nodes).forEach((node) => {
    categoryPathsForNode(node).forEach((path) => {
      const [first = '', second = '', third = ''] = path.map((item) => item.trim())
      if (!first) return
      const seconds = branches.get(first) ?? new Map<string, Set<string>>()
      if (second) {
        const thirds = seconds.get(second) ?? new Set<string>()
        if (third) thirds.add(third)
        seconds.set(second, thirds)
      }
      branches.set(first, seconds)
    })
  })
  return Array.from(branches.entries())
    .map(([name, seconds]) => ({
      name,
      children: Array.from(seconds.entries())
        .map(([secondName, thirds]) => ({
          name: secondName,
          children: Array.from(thirds).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN')),
        }))
        .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN')),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
}

export function filterDocumentTermList(graph: DocumentCollectionGraph) {
  const hasEntities = Object.values(graph.nodes).some((node) => node.type === 'entity')
  return Object.values(graph.nodes)
    .filter((node) => node.type === (hasEntities ? 'entity' : 'term'))
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-Hans-CN'))
}

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

function categoryRecordNode(graph: DocumentCollectionGraph, recordId?: string) {
  if (!recordId) return undefined
  return Object.values(graph.nodes).find((node) => (
    (node.type === 'term' || node.type === 'entity') && node.records.includes(recordId)
  ))
}

function categoryPathForNode(graph: DocumentCollectionGraph, nodeId: string, currentRecordId?: string) {
  const recordNode = categoryRecordNode(graph, currentRecordId)
  if (!recordNode) return {}
  const record = recordForNode(recordNode)
  const category1 = String(recordNode.data.category_1 ?? record?.category_1 ?? '')
  const category2 = String(recordNode.data.category_2 ?? record?.category_2 ?? '')
  const category3 = String(recordNode.data.category_3 ?? record?.category_3 ?? '')
  const categoryId = nodeId.startsWith('category:') ? nodeId.slice('category:'.length) : graph.nodes[nodeId]?.label
  if (category2 === categoryId) return { parent: category1 || undefined }
  if (category3 === categoryId) return { grandparent: category1 || undefined, parent: category2 || undefined }
  return {}
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
        ...categoryPathForNode(graph, nodeId, currentRecordId),
      }
    }
  }
  return { type: 'focus', nodeId, recordId: undefined }
}

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
