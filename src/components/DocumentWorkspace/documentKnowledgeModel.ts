import { shjGraphImportAdapter } from './shjGraphImportAdapter'
import type { KnowledgeBaseImportAdapter } from './documentKnowledgeTypes'
import type { DocumentEdge, DocumentNode } from '../ProjectStorage/projectStorageTypes'

export interface DocumentGraphViewInput {
  nodes: DocumentNode[]
  edges: DocumentEdge[]
  selectedNodeId?: string | null
  width: number
  height: number
  maxNodes?: number
}

export interface DocumentGraphViewNode {
  id: string
  label: string
  nodeType: string
  x: number
  y: number
  selected: boolean
  source: DocumentNode
}

export interface DocumentGraphViewEdge {
  id: string
  label: string
  edgeType: string
  sourceNodeId: string
  targetNodeId: string
  source: DocumentGraphViewNode
  target: DocumentGraphViewNode
  weight: number
  sourceEdge: DocumentEdge
}

export interface DocumentGraphView {
  width: number
  height: number
  nodes: DocumentGraphViewNode[]
  edges: DocumentGraphViewEdge[]
}

function flattenSearchParts(parts: unknown[]): string[] {
  return parts.flatMap((part) => {
    if (part == null) return []
    if (Array.isArray(part)) return flattenSearchParts(part)
    const value = String(part).replace(/\s+/g, ' ').trim()
    return value ? [value] : []
  })
}

export function createDocumentSearchText(parts: unknown[]) {
  return Array.from(new Set(flattenSearchParts(parts))).join(' ')
}

const knowledgeBaseAdapters: KnowledgeBaseImportAdapter[] = [
  shjGraphImportAdapter,
]

export function listKnowledgeBaseAdapters() {
  return [...knowledgeBaseAdapters]
}

export function getDefaultKnowledgeBaseAdapter() {
  return knowledgeBaseAdapters[0] ?? null
}

export function getKnowledgeBaseAdapter(sourceType: string) {
  return knowledgeBaseAdapters.find((adapter) => adapter.sourceType === sourceType) ?? null
}

export function buildDocumentGraphView(input: DocumentGraphViewInput): DocumentGraphView {
  const width = Math.max(320, Math.round(input.width || 0))
  const height = Math.max(240, Math.round(input.height || 0))
  const maxNodes = Math.max(1, Math.min(120, Math.floor(input.maxNodes ?? 60)))
  const selectedNode = input.selectedNodeId
    ? input.nodes.find((node) => node.id === input.selectedNodeId)
    : null
  const orderedNodes = selectedNode
    ? [selectedNode, ...input.nodes.filter((node) => node.id !== selectedNode.id)]
    : input.nodes
  const visibleNodes = orderedNodes.slice(0, maxNodes)
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.max(70, Math.min(width, height) * 0.34)
  const graphNodes = visibleNodes.map((node, index): DocumentGraphViewNode => {
    if (visibleNodes.length === 1) {
      return {
        id: node.id,
        label: node.label,
        nodeType: node.node_type,
        x: Math.round(centerX),
        y: Math.round(centerY),
        selected: node.id === input.selectedNodeId,
        source: node,
      }
    }
    const angle = -Math.PI / 2 + (index / visibleNodes.length) * Math.PI * 2
    return {
      id: node.id,
      label: node.label,
      nodeType: node.node_type,
      x: clampGraphCoordinate(Math.round(centerX + Math.cos(angle) * radius), width),
      y: clampGraphCoordinate(Math.round(centerY + Math.sin(angle) * radius), height),
      selected: node.id === input.selectedNodeId,
      source: node,
    }
  })
  const nodeById = new Map(graphNodes.map((node) => [node.id, node]))
  const graphEdges = input.edges.flatMap((edge): DocumentGraphViewEdge[] => {
    const source = nodeById.get(edge.source_node_id)
    const target = nodeById.get(edge.target_node_id)
    if (!source || !target) return []
    return [{
      id: edge.id,
      label: edge.label,
      edgeType: edge.edge_type,
      sourceNodeId: edge.source_node_id,
      targetNodeId: edge.target_node_id,
      source,
      target,
      weight: edge.weight,
      sourceEdge: edge,
    }]
  })
  return { width, height, nodes: graphNodes, edges: graphEdges }
}

function clampGraphCoordinate(value: number, max: number) {
  return Math.max(16, Math.min(Math.max(16, max - 16), value))
}
