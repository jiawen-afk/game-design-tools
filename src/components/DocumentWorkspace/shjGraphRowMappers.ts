import type { KnowledgeBaseSourceInput } from './documentKnowledgeTypes'
import {
  asRecord,
  jsonOrNull,
  optionalString,
  rowId,
  searchText,
  stringArray,
} from './shjGraphHelpers'
import type { ShjGraphEdge, ShjGraphNode } from './shjGraphTypes'

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

export function collectRecords(input: KnowledgeBaseSourceInput, nodes: ShjGraphNode[]) {
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

export function createRecordRow(
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

export function createNodeRow(input: KnowledgeBaseSourceInput, node: ShjGraphNode) {
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

export function createEdgeRow(
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
