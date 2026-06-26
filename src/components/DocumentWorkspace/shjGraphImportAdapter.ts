import type {
  KnowledgeBaseImportAdapter,
  KnowledgeBaseImportRows,
  KnowledgeBaseSourceInput,
  KnowledgeBaseValidationResult,
} from './documentKnowledgeTypes'

interface ShjGraphNode {
  id: string
  label: string
  type: string
  records?: string[]
  data?: Record<string, unknown>
}

interface ShjGraphEdge {
  id: string
  source: string
  target: string
  type: string
  label?: string
  weight?: number
  record_ids?: string[]
  source_kind?: string
  data?: Record<string, unknown>
}

interface ShjGraphData {
  nodes: Record<string, ShjGraphNode>
  edges: Record<string, ShjGraphEdge>
}

const acceptedFileName = 'entity_graph.json'

const nodeTypeLabels: Record<string, string> = {
  book: '书目',
  chapter: '篇章',
  descriptor: '描述',
  entity: '实体',
  version: '版本',
}

const edgeTypeLabels: Record<string, string> = {
  HAS_CATEGORY_1: '一级类目',
  HAS_CATEGORY_2: '二级类目',
  HAS_CATEGORY_3: '三级类目',
  HAS_VERSION: '版本',
  IN_BOOK: '书目',
  IN_CHAPTER: '篇章',
  LOCATED_IN: '地点',
  PART_OF_PLACE: '地点层级',
  site_relation: '站点关系',
}

function parseGraphText(text: string): ShjGraphData {
  return JSON.parse(String(text).replace(/^\uFEFF/, '')) as ShjGraphData
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asString(value: unknown) {
  return String(value ?? '').trim()
}

function optionalString(value: unknown) {
  const text = asString(value)
  return text || null
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : []
}

function flattenSearchParts(parts: unknown[]): string[] {
  return parts.flatMap((part) => {
    if (part == null) return []
    if (Array.isArray(part)) return flattenSearchParts(part)
    const value = String(part).replace(/\s+/g, ' ').trim()
    return value ? [value] : []
  })
}

function searchText(parts: unknown[]) {
  return Array.from(new Set(flattenSearchParts(parts))).join(' ')
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function rowId(kind: string, ...parts: string[]) {
  return `doc_${kind}_${stableHash(parts.join('\u001f'))}`
}

function jsonOrNull(value: Record<string, unknown>) {
  const entries = Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')
  return entries.length > 0 ? JSON.stringify(Object.fromEntries(entries)) : null
}

function filteredNodeMetadata(node: ShjGraphNode) {
  const data = asRecord(node.data) ?? {}
  const {
    term_record: _termRecord,
    term_records,
    place_records,
    category_records,
    ...rest
  } = data
  return jsonOrNull({
    ...rest,
    term_records,
    place_records,
    category_records,
  })
}

function filteredRecordMetadata(record: Record<string, unknown>, node: ShjGraphNode) {
  return jsonOrNull({
    glx_id: record.glx_id,
    book_id: record.book_id,
    chapter_id: record.chapter_id,
    page_num: record.page_num,
    image_url: record.image_url,
    roles: asRecord(node.data)?.roles,
    category_paths: asRecord(node.data)?.category_paths,
    has_description: asRecord(node.data)?.has_description,
  })
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

function validateSource(input: KnowledgeBaseSourceInput): KnowledgeBaseValidationResult {
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

function requireValidGraph(input: KnowledgeBaseSourceInput) {
  const validation = validateSource(input)
  if (!validation.ok) throw new Error(validation.errors.join('\n'))
  return parseGraphText(input.text)
}

function collectRecords(input: KnowledgeBaseSourceInput, nodes: ShjGraphNode[]) {
  const recordsByExternalId = new Map<string, ReturnType<typeof createRecordRow>>()
  for (const node of nodes) {
    const data = asRecord(node.data)
    const termRecord = asRecord(data?.term_record)
    if (!termRecord) continue
    const externalId = optionalString(termRecord.source_id) ?? optionalString(node.records?.[0]) ?? optionalString(termRecord.glx_id)
    if (!externalId || recordsByExternalId.has(externalId)) continue
    recordsByExternalId.set(externalId, createRecordRow(input, node, termRecord, externalId))
  }
  return [...recordsByExternalId.values()]
}

function createRecordRow(
  input: KnowledgeBaseSourceInput,
  node: ShjGraphNode,
  record: Record<string, unknown>,
  externalId: string,
) {
  const title = optionalString(record.name) ?? node.label
  const description = optionalString(record.description) ?? ''
  const category1 = optionalString(record.category_1)
  const category2 = optionalString(record.category_2)
  const category3 = optionalString(record.category_3)
  const placePath = optionalString(record.place_path)
  const bookTitle = optionalString(record.book_title)
  const chapterTitle = optionalString(record.chapter_title)
  const versionTitle = optionalString(record.version) ?? optionalString(record.version_title)
  const usageText = optionalString(record.usage)
  const effectText = optionalString(record.effect)
  const sourceUrl = optionalString(record.source_url)
  return {
    id: rowId('record', input.collectionId, externalId),
    project_id: input.projectId,
    collection_id: input.collectionId,
    source_id: input.sourceId,
    external_id: externalId,
    record_type: stringArray(asRecord(node.data)?.roles)[0] ?? 'term',
    title,
    description,
    category_1: category1,
    category_2: category2,
    category_3: category3,
    place_path: placePath,
    book_title: bookTitle,
    chapter_title: chapterTitle,
    version_title: versionTitle,
    usage_text: usageText,
    effect_text: effectText,
    source_url: sourceUrl,
    search_text: searchText([
      title,
      description,
      category1,
      category2,
      category3,
      placePath,
      bookTitle,
      chapterTitle,
      versionTitle,
      usageText,
      effectText,
      sourceUrl,
    ]),
    created_at: input.now,
    updated_at: input.now,
    metadata_json: filteredRecordMetadata(record, node),
  }
}

function createNodeRow(input: KnowledgeBaseSourceInput, node: ShjGraphNode) {
  const termRecord = asRecord(asRecord(node.data)?.term_record)
  const description = optionalString(termRecord?.description) ?? optionalString(asRecord(node.data)?.description) ?? ''
  return {
    id: rowId('node', input.collectionId, node.id),
    project_id: input.projectId,
    collection_id: input.collectionId,
    external_id: node.id,
    node_type: node.type,
    label: node.label,
    description,
    search_text: searchText([
      node.label,
      node.type,
      description,
      asRecord(node.data)?.category_paths,
      termRecord?.category_1,
      termRecord?.category_2,
      termRecord?.category_3,
      termRecord?.place_path,
      termRecord?.book_title,
      termRecord?.chapter_title,
      termRecord?.version,
      termRecord?.usage,
      termRecord?.effect,
      termRecord?.source_url,
    ]),
    created_at: input.now,
    updated_at: input.now,
    metadata_json: filteredNodeMetadata(node),
  }
}

function createEdgeRow(
  input: KnowledgeBaseSourceInput,
  edge: ShjGraphEdge,
  nodeIdByExternalId: Map<string, string>,
) {
  return {
    id: rowId('edge', input.collectionId, edge.id),
    project_id: input.projectId,
    collection_id: input.collectionId,
    external_id: edge.id,
    source_node_id: nodeIdByExternalId.get(edge.source) ?? '',
    target_node_id: nodeIdByExternalId.get(edge.target) ?? '',
    edge_type: edge.type,
    label: edge.label ?? '',
    weight: Number.isFinite(edge.weight) ? Number(edge.weight) : 1,
    source_kind: edge.source_kind ?? '',
    created_at: input.now,
    metadata_json: jsonOrNull(edge.data ?? {}),
  }
}

function convertSource(input: KnowledgeBaseSourceInput): KnowledgeBaseImportRows {
  const graph = requireValidGraph(input)
  const nodes = Object.values(graph.nodes)
  const edges = Object.values(graph.edges)
  const records = collectRecords(input, nodes)
  const recordIdByExternalId = new Map(records.map((record) => [record.external_id, record.id]))
  const nodeRows = nodes.map((node) => createNodeRow(input, node))
  const nodeIdByExternalId = new Map(nodeRows.map((node) => [node.external_id, node.id]))
  const edgeRows = edges.map((edge) => createEdgeRow(input, edge, nodeIdByExternalId))
  const edgeIdByExternalId = new Map(edgeRows.map((edge) => [edge.external_id, edge.id]))
  const nodeRecordLinks = nodes.flatMap((node) => (
    stringArray(node.records).flatMap((recordExternalId) => {
      const recordId = recordIdByExternalId.get(recordExternalId)
      const nodeId = nodeIdByExternalId.get(node.id)
      if (!recordId || !nodeId) return []
      return [{
        id: rowId('node_record', input.collectionId, node.id, recordExternalId),
        project_id: input.projectId,
        collection_id: input.collectionId,
        node_id: nodeId,
        record_id: recordId,
        link_role: node.type === 'entity' ? 'primary' : 'related',
        created_at: input.now,
      }]
    })
  ))
  const edgeRecordLinks = edges.flatMap((edge) => (
    stringArray(edge.record_ids).flatMap((recordExternalId) => {
      const recordId = recordIdByExternalId.get(recordExternalId)
      const edgeId = edgeIdByExternalId.get(edge.id)
      if (!recordId || !edgeId) return []
      return [{
        id: rowId('edge_record', input.collectionId, edge.id, recordExternalId),
        project_id: input.projectId,
        collection_id: input.collectionId,
        edge_id: edgeId,
        record_id: recordId,
        created_at: input.now,
      }]
    })
  ))

  return {
    sources: [{
      id: input.sourceId,
      project_id: input.projectId,
      collection_id: input.collectionId,
      role: 'entity_graph',
      file_name: input.fileName,
      mime_group: 'application',
      mime_type: 'application/json',
      extension: 'json',
      size_bytes: input.sizeBytes,
      hash_sha256: input.hashSha256,
      encoding: 'utf-8',
      created_at: input.now,
      metadata_json: JSON.stringify({ sourceType: shjGraphImportAdapter.sourceType }),
    }],
    records,
    nodes: nodeRows,
    edges: edgeRows,
    nodeRecordLinks,
    edgeRecordLinks,
  }
}

export const shjGraphImportAdapter: KnowledgeBaseImportAdapter = {
  sourceType: 'shj_nlc_graph',
  displayName: '山海经实体图谱',
  acceptedFileNames: [acceptedFileName],
  validateSource,
  convertSource,
  getNodeTypeLabel: (nodeType) => nodeTypeLabels[nodeType] ?? nodeType,
  getEdgeTypeLabel: (edgeType) => edgeTypeLabels[edgeType] ?? edgeType,
}
