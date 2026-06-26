import { listKnowledgeBaseAdapters } from './documentKnowledgeModel'
import type { ProjectRepository, DocumentImportResult } from '../ProjectStorage/projectSqliteRepository'
import type { DocumentSourceContent } from '../ProjectStorage/projectStorageTypes'

export interface KnowledgeBaseFileLike {
  name: string
  size: number
  text(): Promise<string>
}

export type KnowledgeBaseImportProgressStage =
  | 'reading'
  | 'hashing'
  | 'checking-existing'
  | 'converting'
  | 'writing'
  | 'done'
  | 'failed'

export interface KnowledgeBaseImportProgress {
  stage: KnowledgeBaseImportProgressStage
  message: string
  percent: number
  counts?: {
    records: number
    nodes: number
    edges: number
  }
}

export interface ImportKnowledgeBaseFileInput {
  repository: ProjectRepository
  projectId: string
  collectionName: string
  file: KnowledgeBaseFileLike
  now?: string
  onProgress?: (event: KnowledgeBaseImportProgress) => void
}

const textEncoder = new TextEncoder()

export async function importKnowledgeBaseFile(input: ImportKnowledgeBaseFileInput): Promise<DocumentImportResult> {
  const fileName = input.file.name
  const adapter = listKnowledgeBaseAdapters().find((item) => item.acceptedFileNames.includes(fileName))
  if (!adapter) {
    throw new Error(`第一版只支持导入 entity_graph.json，请选择实体图谱文件。`)
  }

  const now = input.now ?? new Date().toISOString()
  reportProgress(input, {
    stage: 'reading',
    message: `读取 ${fileName}`,
    percent: 8,
  })
  const text = await input.file.text()
  reportProgress(input, {
    stage: 'hashing',
    message: '计算文件指纹',
    percent: 18,
  })
  const hashSha256 = await sha256Hex(text)
  const collectionName = input.collectionName.trim() || adapter.displayName
  reportProgress(input, {
    stage: 'checking-existing',
    message: '检查已有知识库集合',
    percent: 32,
  })
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

  reportProgress(input, {
    stage: 'converting',
    message: '解析图谱节点与关系',
    percent: 52,
  })
  const rows = adapter.convertSource(sourceInput)
  const sourceContents: DocumentSourceContent[] = rows.sourceContents?.length ? rows.sourceContents : [{
    source_id: sourceId,
    project_id: input.projectId,
    collection_id: collectionId,
    content_text: text,
    content_encoding: 'utf-8',
    size_bytes: input.file.size,
    hash_sha256: hashSha256,
    created_at: now,
    metadata_json: JSON.stringify({ sourceType: adapter.sourceType }),
  }]
  const counts = {
    records: rows.records.length,
    nodes: rows.nodes.length,
    edges: rows.edges.length,
  }
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

  reportProgress(input, {
    stage: 'writing',
    message: `写入 ${counts.records} 条记录、${counts.nodes} 个节点、${counts.edges} 条关系`,
    percent: 78,
    counts,
  })
  return input.repository.replaceDocumentGraph({
    projectId: input.projectId,
    collection,
    sources: rows.sources,
    sourceContents,
    records: rows.records,
    nodes: rows.nodes,
    edges: rows.edges,
    nodeRecordLinks: rows.nodeRecordLinks,
    edgeRecordLinks: rows.edgeRecordLinks,
    importRun,
  }).then((result) => {
    reportProgress(input, {
      stage: 'done',
      message: `导入完成：${counts.records} 条记录、${counts.nodes} 个节点、${counts.edges} 条关系`,
      percent: 100,
      counts,
    })
    return result
  })
}

function reportProgress(input: ImportKnowledgeBaseFileInput, event: KnowledgeBaseImportProgress) {
  input.onProgress?.(event)
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
