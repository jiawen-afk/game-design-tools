import type {
  DocumentCollection,
  DocumentEdge,
  DocumentEdgeRecordLink,
  DocumentImportRun,
  DocumentNode,
  DocumentNodeRecordLink,
  DocumentRecord,
  DocumentSource,
  DocumentSourceContent,
} from './projectStorageTypes'

export interface ReplaceDocumentGraphInput {
  projectId: string
  collection: DocumentCollection
  sources: DocumentSource[]
  sourceContents: DocumentSourceContent[]
  records: DocumentRecord[]
  nodes: DocumentNode[]
  edges: DocumentEdge[]
  nodeRecordLinks: DocumentNodeRecordLink[]
  edgeRecordLinks: DocumentEdgeRecordLink[]
  importRun: DocumentImportRun
}

export interface DocumentImportResult {
  collection: DocumentCollection
  importRun: DocumentImportRun
}

export interface DocumentRecordSearchInput {
  projectId: string
  collectionId?: string
  query?: string
  limit?: number
}

export interface DocumentRecordSearchResult {
  items: DocumentRecord[]
  total: number
}

export interface DocumentNodeSearchInput {
  projectId: string
  collectionId?: string
  query?: string
  nodeType?: string
  limit?: number
}

export interface DocumentNodeSearchResult {
  items: DocumentNode[]
  total: number
}

export interface DocumentNodeDetails {
  node: DocumentNode
  records: DocumentRecord[]
}

export interface DocumentNeighbor {
  edge: DocumentEdge
  node: DocumentNode
  direction: 'incoming' | 'outgoing'
}

export interface ProjectDocumentRowSets {
  documentCollections: DocumentCollection[]
  documentSources: DocumentSource[]
  documentSourceContents: DocumentSourceContent[]
  documentRecords: DocumentRecord[]
  documentNodes: DocumentNode[]
  documentEdges: DocumentEdge[]
  documentNodeRecordLinks: DocumentNodeRecordLink[]
  documentEdgeRecordLinks: DocumentEdgeRecordLink[]
  documentImportRuns: DocumentImportRun[]
}

export type ProjectDocumentRows = Partial<ProjectDocumentRowSets>
