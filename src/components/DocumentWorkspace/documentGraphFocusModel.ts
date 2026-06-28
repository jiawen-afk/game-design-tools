import type { DocumentCollectionGraph, DocumentGraphEdge, DocumentGraphNode } from '../ProjectStorage'
import type { DocumentGraphFilterState } from './documentGraphTypes'
import { documentEdgeWithSourceKind, isDetailRelation } from './documentGraphCoreModel'

const semanticShareTypes = new Set(['term', 'place', 'category', 'descriptor', 'entity'])

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

export function focusDocumentGraph(
  graph: DocumentCollectionGraph,
  state: DocumentGraphFilterState,
): DocumentCollectionGraph {
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
