import { listKnowledgeBaseAdapters } from './documentKnowledgeModel'
import type { ProjectRepository, DocumentImportResult } from '../ProjectStorage/projectSqliteRepository'

export interface KnowledgeBaseFileLike {
  name: string
  size: number
  text(): Promise<string>
}

export interface ImportKnowledgeBaseFileInput {
  repository: ProjectRepository
  projectId: string
  collectionName: string
  file: KnowledgeBaseFileLike
  now?: string
}

const textEncoder = new TextEncoder()

export async function importKnowledgeBaseFile(input: ImportKnowledgeBaseFileInput): Promise<DocumentImportResult> {
  const fileName = input.file.name
  const adapter = listKnowledgeBaseAdapters().find((item) => item.acceptedFileNames.includes(fileName))
  if (!adapter) {
    throw new Error(`第一版只支持导入 entity_graph.json，请选择实体图谱文件。`)
  }

  const now = input.now ?? new Date().toISOString()
  const text = await input.file.text()
  const hashSha256 = await sha256Hex(text)
  const collectionName = input.collectionName.trim() || adapter.displayName
  const existingCollection = (await input.repository.listDocumentCollections(input.projectId))
    .find((collection) => collection.name === collectionName && collection.source_type === adapter.sourceType)
  const collectionId = existingCollection?.id
    ?? stableDocumentId('collection', input.projectId, adapter.sourceType, collectionName)
  const sourceId = stableDocumentId('source', collectionId, fileName, hashSha256)
  const importRunId = stableDocumentId('import', collectionId, hashSha256, now)
  const sourceInput = {
    projectId: input.projectId,
    collectionId,
    sourceId,
    fileName,
    text,
    sizeBytes: input.file.size,
    hashSha256,
    now,
  }
  const validation = adapter.validateSource(sourceInput)
  if (!validation.ok) throw new Error(validation.errors.join('\n'))

  const rows = adapter.convertSource(sourceInput)
  const collection = {
    id: collectionId,
    project_id: input.projectId,
    name: collectionName,
    description: existingCollection?.description ?? '',
    source_type: adapter.sourceType,
    status: 'ready',
    record_count: rows.records.length,
    node_count: rows.nodes.length,
    edge_count: rows.edges.length,
    created_at: existingCollection?.created_at ?? now,
    updated_at: now,
    imported_at: now,
    metadata_json: JSON.stringify({ adapter: adapter.displayName }),
  }
  const importRun = {
    id: importRunId,
    project_id: input.projectId,
    collection_id: collectionId,
    source_type: adapter.sourceType,
    status: 'succeeded',
    started_at: now,
    finished_at: now,
    total_records: rows.records.length,
    total_nodes: rows.nodes.length,
    total_edges: rows.edges.length,
    imported_records: rows.records.length,
    imported_nodes: rows.nodes.length,
    imported_edges: rows.edges.length,
    error_message: null,
    report_json: null,
  }

  return input.repository.replaceDocumentGraph({
    projectId: input.projectId,
    collection,
    sources: rows.sources,
    records: rows.records,
    nodes: rows.nodes,
    edges: rows.edges,
    nodeRecordLinks: rows.nodeRecordLinks,
    edgeRecordLinks: rows.edgeRecordLinks,
    importRun,
  })
}

async function sha256Hex(text: string) {
  const bytes = textEncoder.encode(text)
  const digestPromise = globalThis.crypto?.subtle?.digest?.('SHA-256', bytes)
  const digest = digestPromise ? await digestPromise.catch(() => null) : null
  if (digest) {
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return fallbackHex(text, 64)
}

function stableDocumentId(prefix: string, ...parts: string[]) {
  return `doc_${prefix}_${fallbackHex(parts.join('\u001f'), 24)}`
}

function fallbackHex(input: string, length: number) {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  let output = ''
  let current = hash
  while (output.length < length) {
    current ^= current << 13
    current ^= current >>> 17
    current ^= current << 5
    output += (current >>> 0).toString(16).padStart(8, '0')
  }
  return output.slice(0, length)
}
