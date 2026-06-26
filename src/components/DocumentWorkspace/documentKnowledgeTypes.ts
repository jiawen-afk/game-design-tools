import type {
  DocumentEdge,
  DocumentEdgeRecordLink,
  DocumentNode,
  DocumentNodeRecordLink,
  DocumentRecord,
  DocumentSource,
} from '../ProjectStorage/projectStorageTypes'

export interface KnowledgeBaseSourceInput {
  projectId: string
  collectionId: string
  sourceId: string
  fileName: string
  text: string
  sizeBytes: number
  hashSha256: string | null
  now: string
}

export interface KnowledgeBaseValidationResult {
  ok: boolean
  errors: string[]
}

export interface KnowledgeBaseImportRows {
  sources: DocumentSource[]
  records: DocumentRecord[]
  nodes: DocumentNode[]
  edges: DocumentEdge[]
  nodeRecordLinks: DocumentNodeRecordLink[]
  edgeRecordLinks: DocumentEdgeRecordLink[]
}

export interface KnowledgeBaseImportAdapter {
  sourceType: string
  displayName: string
  acceptedFileNames: string[]
  validateSource(input: KnowledgeBaseSourceInput): KnowledgeBaseValidationResult
  convertSource(input: KnowledgeBaseSourceInput): KnowledgeBaseImportRows
  getNodeTypeLabel(nodeType: string): string
  getEdgeTypeLabel(edgeType: string): string
}
