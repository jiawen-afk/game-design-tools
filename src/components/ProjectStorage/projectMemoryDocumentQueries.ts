import type {
  DocumentCollectionGraph,
  DocumentEdge,
  DocumentEdgeRecordLink,
  DocumentGraphEdge,
  DocumentGraphNode,
  DocumentNode,
  DocumentNodeRecordLink,
  DocumentRecord,
} from './projectStorageTypes'
import type {
  DocumentNeighbor,
  DocumentNodeDetails,
  DocumentNodeSearchInput,
  DocumentNodeSearchResult,
  DocumentRecordSearchInput,
  DocumentRecordSearchResult,
} from './projectDocumentRepositoryTypes'

interface MemoryDocumentGraphRows {
  collectionId: string
  records: DocumentRecord[]
  nodes: DocumentNode[]
  edges: DocumentEdge[]
  nodeRecordLinks: DocumentNodeRecordLink[]
  edgeRecordLinks: DocumentEdgeRecordLink[]
}

export function buildMemoryDocumentCollectionGraph(rows: MemoryDocumentGraphRows): DocumentCollectionGraph {
  const records = rows.records.filter((record) => record.collection_id === rows.collectionId)
  const recordsById = new Map(records.map((record) => [record.id, record]))
  const recordIdsByNodeId = groupValuesByKey(
    rows.nodeRecordLinks.filter((link) => link.collection_id === rows.collectionId),
    (link) => link.node_id,
    (link) => link.record_id,
  )
  const recordIdsByEdgeId = groupValuesByKey(
    rows.edgeRecordLinks.filter((link) => link.collection_id === rows.collectionId),
    (link) => link.edge_id,
    (link) => link.record_id,
  )
  const nodes = Object.fromEntries(rows.nodes
    .filter((node) => node.collection_id === rows.collectionId)
    .map((node): [string, DocumentGraphNode] => {
      const recordIds = recordIdsByNodeId.get(node.id) ?? []
      const firstRecord = recordIds.map((recordId) => recordsById.get(recordId)).find(Boolean)
      return [node.id, {
        id: node.id,
        label: node.label,
        type: node.node_type,
        records: recordIds,
        data: {
          ...parseMetadataJson(node.metadata_json),
          ...(firstRecord ? { record: documentRecordGraphData(firstRecord) } : {}),
        },
      }]
    }))
  const edges = Object.fromEntries(rows.edges
    .filter((edge) => edge.collection_id === rows.collectionId)
    .map((edge): [string, DocumentGraphEdge] => [edge.id, {
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      type: edge.edge_type,
      label: edge.label,
      weight: edge.weight,
      record_ids: recordIdsByEdgeId.get(edge.id) ?? [],
      source_kind: edge.source_kind,
    }]))
  return { nodes, edges }
}

export function searchMemoryDocumentRecords(
  input: DocumentRecordSearchInput,
  records: DocumentRecord[],
): DocumentRecordSearchResult {
  const query = normalizeDocumentQuery(input.query)
  const matched = records
    .filter((record) => !input.collectionId || record.collection_id === input.collectionId)
    .filter((record) => !query || record.search_text.toLocaleLowerCase().includes(query))
    .sort((left, right) => left.title.localeCompare(right.title))
  return {
    items: matched.slice(0, normalizeDocumentLimit(input.limit)),
    total: matched.length,
  }
}

export function searchMemoryDocumentNodes(
  input: DocumentNodeSearchInput,
  nodes: DocumentNode[],
): DocumentNodeSearchResult {
  const query = normalizeDocumentQuery(input.query)
  const matched = nodes
    .filter((node) => !input.collectionId || node.collection_id === input.collectionId)
    .filter((node) => !input.nodeType || node.node_type === input.nodeType)
    .filter((node) => !query || node.search_text.toLocaleLowerCase().includes(query))
    .sort((left, right) => left.label.localeCompare(right.label))
  return {
    items: matched.slice(0, normalizeDocumentLimit(input.limit)),
    total: matched.length,
  }
}

export function getMemoryDocumentNodeDetails(
  nodeId: string,
  nodes: DocumentNode[],
  records: DocumentRecord[],
  nodeRecordLinks: DocumentNodeRecordLink[],
): DocumentNodeDetails | null {
  const node = nodes.find((item) => item.id === nodeId)
  if (!node) return null
  const recordIds = new Set(nodeRecordLinks
    .filter((link) => link.node_id === nodeId)
    .map((link) => link.record_id))
  const matchedRecords = records
    .filter((record) => recordIds.has(record.id))
    .sort((left, right) => left.title.localeCompare(right.title))
  return { node, records: matchedRecords }
}

export function listMemoryDocumentNeighbors(
  nodeId: string,
  nodes: DocumentNode[],
  edges: DocumentEdge[],
): DocumentNeighbor[] {
  return edges
    .flatMap((edge): DocumentNeighbor[] => {
      if (edge.source_node_id !== nodeId && edge.target_node_id !== nodeId) return []
      const direction = edge.source_node_id === nodeId ? 'outgoing' : 'incoming'
      const neighborNodeId = direction === 'outgoing' ? edge.target_node_id : edge.source_node_id
      const node = nodes.find((item) => item.id === neighborNodeId)
      return node ? [{ edge, node, direction }] : []
    })
    .sort((left, right) => left.node.label.localeCompare(right.node.label))
}

function groupValuesByKey<TItem, TKey, TValue>(
  items: TItem[],
  keyFor: (item: TItem) => TKey,
  valueFor: (item: TItem) => TValue,
) {
  const grouped = new Map<TKey, TValue[]>()
  for (const item of items) {
    const key = keyFor(item)
    grouped.set(key, [...(grouped.get(key) ?? []), valueFor(item)])
  }
  return grouped
}

function parseMetadataJson(value: string | null): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function documentRecordGraphData(record: DocumentRecord): Record<string, unknown> {
  return {
    ...parseMetadataJson(record.metadata_json),
    id: record.id,
    external_id: record.external_id,
    record_type: record.record_type,
    title: record.title,
    description: record.description,
    category_1: record.category_1,
    category_2: record.category_2,
    category_3: record.category_3,
    place_path: record.place_path,
    book_title: record.book_title,
    chapter_title: record.chapter_title,
    version_title: record.version_title,
    usage: record.usage_text,
    effect: record.effect_text,
    source_url: record.source_url,
  }
}

function normalizeDocumentQuery(query: string | undefined) {
  return String(query || '').trim().toLocaleLowerCase()
}

function normalizeDocumentLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) return 50
  return Math.max(1, Math.min(200, Math.floor(limit as number)))
}
