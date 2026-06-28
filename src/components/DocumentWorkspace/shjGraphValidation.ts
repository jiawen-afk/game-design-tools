import type {
  KnowledgeBaseSourceInput,
  KnowledgeBaseValidationResult,
} from './documentKnowledgeTypes'
import { asRecord, asString } from './shjGraphHelpers'
import {
  acceptedFileName,
  type ShjGraphData,
  type ShjGraphEdge,
  type ShjGraphNode,
} from './shjGraphTypes'

export function parseGraphText(text: string): ShjGraphData {
  return JSON.parse(String(text).replace(/^\uFEFF/, '')) as ShjGraphData
}

function validateGraphShape(graph: ShjGraphData, errors: string[]) {
  if (!graph || typeof graph !== 'object') {
    errors.push('图谱 JSON 不是有效对象。')
    return
  }
  if (!asRecord(graph.nodes)) errors.push('entity_graph.json 缺少 nodes 对象。')
  if (!asRecord(graph.edges)) errors.push('entity_graph.json 缺少 edges 对象。')
}

function validateNodeExternalIds(nodes: ShjGraphNode[], errors: string[]) {
  const seen = new Set<string>()
  for (const node of nodes) {
    const id = asString(node.id)
    if (!id) {
      errors.push('存在缺少 id 的节点。')
      continue
    }
    if (seen.has(id)) errors.push(`重复节点 external_id：${id}`)
    seen.add(id)
  }
}

function validateEdgeEndpoints(nodes: ShjGraphNode[], edges: ShjGraphEdge[], errors: string[]) {
  const nodeIds = new Set(nodes.map((node) => node.id))
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) errors.push(`边 ${edge.id} 引用了未知节点：${edge.source}`)
    if (!nodeIds.has(edge.target)) errors.push(`边 ${edge.id} 引用了未知节点：${edge.target}`)
  }
}

function validateEdgeExternalIds(edges: ShjGraphEdge[], errors: string[]) {
  const seen = new Set<string>()
  for (const edge of edges) {
    const id = asString(edge.id)
    if (!id) {
      errors.push('存在缺少 id 的边。')
      continue
    }
    if (seen.has(id)) errors.push(`重复边 external_id：${id}`)
    seen.add(id)
  }
}

export function validateSource(input: KnowledgeBaseSourceInput): KnowledgeBaseValidationResult {
  const errors: string[] = []
  if (input.fileName !== acceptedFileName) {
    errors.push(`第一版只支持导入 ${acceptedFileName}。`)
  }
  let graph: ShjGraphData | null = null
  try {
    graph = parseGraphText(input.text)
  } catch (error) {
    errors.push(`entity_graph.json 解析失败：${error instanceof Error ? error.message : String(error)}`)
  }
  if (graph) {
    validateGraphShape(graph, errors)
    if (asRecord(graph.nodes) && asRecord(graph.edges)) {
      const nodes = Object.values(graph.nodes)
      const edges = Object.values(graph.edges)
      validateNodeExternalIds(nodes, errors)
      validateEdgeExternalIds(edges, errors)
      validateEdgeEndpoints(nodes, edges, errors)
    }
  }
  return { ok: errors.length === 0, errors }
}

export function requireValidGraph(input: KnowledgeBaseSourceInput) {
  const validation = validateSource(input)
  if (!validation.ok) throw new Error(validation.errors.join('\n'))
  return parseGraphText(input.text)
}
