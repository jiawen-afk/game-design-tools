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

export interface DocumentGraphChartNode {
  id: string
  name: string
  value: string
  category: string
  selected: boolean
  symbolSize: number
  x: number
  y: number
  itemStyle: {
    color: string
    borderColor: string
    borderWidth: number
  }
  label: {
    show: boolean
    color: string
    fontWeight: number
  }
}

export interface DocumentGraphChartLink {
  source: string
  target: string
  name: string
  value: number
  lineStyle: {
    width: number
  }
}

export interface DocumentGraphChartOption {
  backgroundColor: string
  animationDurationUpdate: number
  tooltip: {
    trigger: string
  }
  series: [{
    type: 'graph'
    layout: 'force'
    roam: boolean
    draggable: boolean
    focusNodeAdjacency: boolean
    data: DocumentGraphChartNode[]
    links: DocumentGraphChartLink[]
    categories: Array<{ name: string }>
    edgeSymbol: string[]
    edgeSymbolSize: number
    label: {
      show: boolean
      position: string
      overflow: string
      width: number
    }
    edgeLabel: {
      show: boolean
      formatter: string
      color: string
      fontSize: number
    }
    lineStyle: {
      color: string
      curveness: number
      opacity: number
    }
    force: {
      repulsion: number
      edgeLength: number | [number, number]
      gravity: number
    }
    emphasis: {
      focus: string
      lineStyle: {
        width: number
      }
    }
  }]
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

export function buildDocumentGraphChartOption(view: DocumentGraphView): DocumentGraphChartOption {
  const categories = Array.from(new Set(view.nodes.map((node) => node.nodeType || '节点')))
  return {
    backgroundColor: '#f5f7fb',
    animationDurationUpdate: 180,
    tooltip: {
      trigger: 'item',
    },
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      focusNodeAdjacency: true,
      data: view.nodes.map((node) => ({
        id: node.id,
        name: node.label,
        value: node.nodeType,
        category: node.nodeType || '节点',
        selected: node.selected,
        symbolSize: node.selected ? 52 : 38,
        x: node.x,
        y: node.y,
        itemStyle: {
          color: node.selected ? '#dbe7ff' : '#ffffff',
          borderColor: node.selected ? '#2456c7' : '#3b66c4',
          borderWidth: node.selected ? 3 : 1.6,
        },
        label: {
          show: true,
          color: '#263247',
          fontWeight: node.selected ? 700 : 600,
        },
      })),
      links: view.edges.map((edge) => ({
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        name: edge.label,
        value: edge.weight,
        lineStyle: {
          width: Math.max(1, Math.min(4, edge.weight || 1)),
        },
      })),
      categories: categories.map((name) => ({ name })),
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: 8,
      label: {
        show: true,
        position: 'bottom',
        overflow: 'truncate',
        width: 96,
      },
      edgeLabel: {
        show: true,
        formatter: '{b}',
        color: '#5f6f86',
        fontSize: 11,
      },
      lineStyle: {
        color: '#8794a8',
        curveness: 0.12,
        opacity: 0.78,
      },
      force: {
        repulsion: 170,
        edgeLength: [78, 140],
        gravity: 0.08,
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          width: 3,
        },
      },
    }],
  }
}
