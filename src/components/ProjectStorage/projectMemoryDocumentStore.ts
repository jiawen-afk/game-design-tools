import type {
  DocumentCollection,
  DocumentCollectionGraph,
  DocumentEdge,
  DocumentEdgeRecordLink,
  DocumentImportRun,
  DocumentNode,
  DocumentNodeRecordLink,
  DocumentRecord,
  DocumentSource,
  DocumentSourceContent,
} from './projectStorageTypes'
import type {
  DocumentNeighbor,
  DocumentNodeDetails,
  DocumentNodeSearchInput,
  DocumentNodeSearchResult,
  DocumentRecordSearchInput,
  DocumentRecordSearchResult,
  ProjectDocumentRows,
  ProjectDocumentRowSets,
  ReplaceDocumentGraphInput,
} from './projectDocumentRepositoryTypes'
import {
  buildMemoryDocumentCollectionGraph,
  getMemoryDocumentNodeDetails,
  listMemoryDocumentNeighbors,
  searchMemoryDocumentNodes,
  searchMemoryDocumentRecords,
} from './projectMemoryDocumentQueries'

export class MemoryProjectDocumentStore {
  private documentCollections = new Map<string, DocumentCollection[]>()
  private documentSources = new Map<string, DocumentSource[]>()
  private documentSourceContents = new Map<string, DocumentSourceContent[]>()
  private documentRecords = new Map<string, DocumentRecord[]>()
  private documentNodes = new Map<string, DocumentNode[]>()
  private documentEdges = new Map<string, DocumentEdge[]>()
  private documentNodeRecordLinks = new Map<string, DocumentNodeRecordLink[]>()
  private documentEdgeRecordLinks = new Map<string, DocumentEdgeRecordLink[]>()
  private documentImportRuns = new Map<string, DocumentImportRun[]>()

  initializeProject(projectId: string) {
    this.documentCollections.set(projectId, [])
    this.documentSources.set(projectId, [])
    this.documentSourceContents.set(projectId, [])
    this.documentRecords.set(projectId, [])
    this.documentNodes.set(projectId, [])
    this.documentEdges.set(projectId, [])
    this.documentNodeRecordLinks.set(projectId, [])
    this.documentEdgeRecordLinks.set(projectId, [])
    this.documentImportRuns.set(projectId, [])
  }

  importProjectRows(projectId: string, rows: ProjectDocumentRows) {
    this.documentCollections.set(projectId, [...(rows.documentCollections ?? [])])
    this.documentSources.set(projectId, [...(rows.documentSources ?? [])])
    this.documentSourceContents.set(projectId, [...(rows.documentSourceContents ?? [])])
    this.documentRecords.set(projectId, [...(rows.documentRecords ?? [])])
    this.documentNodes.set(projectId, [...(rows.documentNodes ?? [])])
    this.documentEdges.set(projectId, [...(rows.documentEdges ?? [])])
    this.documentNodeRecordLinks.set(projectId, [...(rows.documentNodeRecordLinks ?? [])])
    this.documentEdgeRecordLinks.set(projectId, [...(rows.documentEdgeRecordLinks ?? [])])
    this.documentImportRuns.set(projectId, [...(rows.documentImportRuns ?? [])])
  }

  exportProjectRows(projectId: string): ProjectDocumentRowSets {
    return {
      documentCollections: [...(this.documentCollections.get(projectId) ?? [])],
      documentSources: [...(this.documentSources.get(projectId) ?? [])],
      documentSourceContents: [...(this.documentSourceContents.get(projectId) ?? [])],
      documentRecords: [...(this.documentRecords.get(projectId) ?? [])],
      documentNodes: [...(this.documentNodes.get(projectId) ?? [])],
      documentEdges: [...(this.documentEdges.get(projectId) ?? [])],
      documentNodeRecordLinks: [...(this.documentNodeRecordLinks.get(projectId) ?? [])],
      documentEdgeRecordLinks: [...(this.documentEdgeRecordLinks.get(projectId) ?? [])],
      documentImportRuns: [...(this.documentImportRuns.get(projectId) ?? [])],
    }
  }

  listDocumentCollections(projectId: string) {
    return [...(this.documentCollections.get(projectId) ?? [])]
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
  }

  getDocumentCollection(projectId: string, collectionId: string) {
    return (this.documentCollections.get(projectId) ?? [])
      .find((collection) => collection.id === collectionId) ?? null
  }

  deleteDocumentCollection(projectId: string, collectionId: string) {
    this.documentCollections.set(projectId, (this.documentCollections.get(projectId) ?? [])
      .filter((collection) => collection.id !== collectionId))
    this.deleteDocumentCollectionChildren(projectId, collectionId)
  }

  listDocumentSources(projectId: string, collectionId: string) {
    return (this.documentSources.get(projectId) ?? [])
      .filter((source) => source.collection_id === collectionId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
  }

  getDocumentSourceContent(projectId: string, sourceId: string) {
    return (this.documentSourceContents.get(projectId) ?? [])
      .find((content) => content.source_id === sourceId) ?? null
  }

  replaceDocumentGraph(input: ReplaceDocumentGraphInput) {
    this.deleteDocumentCollectionChildren(input.projectId, input.collection.id)
    this.documentCollections.set(input.projectId, [
      ...(this.documentCollections.get(input.projectId) ?? [])
        .filter((collection) => collection.id !== input.collection.id),
      input.collection,
    ])
    this.documentSources.set(input.projectId, [...(this.documentSources.get(input.projectId) ?? []), ...input.sources])
    this.documentSourceContents.set(input.projectId, [
      ...(this.documentSourceContents.get(input.projectId) ?? []),
      ...input.sourceContents,
    ])
    this.documentRecords.set(input.projectId, [...(this.documentRecords.get(input.projectId) ?? []), ...input.records])
    this.documentNodes.set(input.projectId, [...(this.documentNodes.get(input.projectId) ?? []), ...input.nodes])
    this.documentEdges.set(input.projectId, [...(this.documentEdges.get(input.projectId) ?? []), ...input.edges])
    this.documentNodeRecordLinks.set(input.projectId, [
      ...(this.documentNodeRecordLinks.get(input.projectId) ?? []),
      ...input.nodeRecordLinks,
    ])
    this.documentEdgeRecordLinks.set(input.projectId, [
      ...(this.documentEdgeRecordLinks.get(input.projectId) ?? []),
      ...input.edgeRecordLinks,
    ])
    this.documentImportRuns.set(input.projectId, [...(this.documentImportRuns.get(input.projectId) ?? []), input.importRun])
    return { collection: input.collection, importRun: input.importRun }
  }

  getDocumentCollectionGraph(projectId: string, collectionId: string): DocumentCollectionGraph {
    return buildMemoryDocumentCollectionGraph({
      collectionId,
      records: this.documentRecords.get(projectId) ?? [],
      nodes: this.documentNodes.get(projectId) ?? [],
      edges: this.documentEdges.get(projectId) ?? [],
      nodeRecordLinks: this.documentNodeRecordLinks.get(projectId) ?? [],
      edgeRecordLinks: this.documentEdgeRecordLinks.get(projectId) ?? [],
    })
  }

  searchDocumentRecords(input: DocumentRecordSearchInput): DocumentRecordSearchResult {
    return searchMemoryDocumentRecords(input, this.documentRecords.get(input.projectId) ?? [])
  }

  searchDocumentNodes(input: DocumentNodeSearchInput): DocumentNodeSearchResult {
    return searchMemoryDocumentNodes(input, this.documentNodes.get(input.projectId) ?? [])
  }

  getDocumentNode(projectId: string, nodeId: string): DocumentNodeDetails | null {
    return getMemoryDocumentNodeDetails(
      nodeId,
      this.documentNodes.get(projectId) ?? [],
      this.documentRecords.get(projectId) ?? [],
      this.documentNodeRecordLinks.get(projectId) ?? [],
    )
  }

  listDocumentNeighbors(projectId: string, nodeId: string): DocumentNeighbor[] {
    return listMemoryDocumentNeighbors(
      nodeId,
      this.documentNodes.get(projectId) ?? [],
      this.documentEdges.get(projectId) ?? [],
    )
  }

  deleteProject(projectId: string) {
    this.documentCollections.delete(projectId)
    this.documentSources.delete(projectId)
    this.documentSourceContents.delete(projectId)
    this.documentRecords.delete(projectId)
    this.documentNodes.delete(projectId)
    this.documentEdges.delete(projectId)
    this.documentNodeRecordLinks.delete(projectId)
    this.documentEdgeRecordLinks.delete(projectId)
    this.documentImportRuns.delete(projectId)
  }

  private deleteDocumentCollectionChildren(projectId: string, collectionId: string) {
    this.documentSources.set(projectId, (this.documentSources.get(projectId) ?? [])
      .filter((source) => source.collection_id !== collectionId))
    this.documentSourceContents.set(projectId, (this.documentSourceContents.get(projectId) ?? [])
      .filter((content) => content.collection_id !== collectionId))
    this.documentRecords.set(projectId, (this.documentRecords.get(projectId) ?? [])
      .filter((record) => record.collection_id !== collectionId))
    this.documentNodes.set(projectId, (this.documentNodes.get(projectId) ?? [])
      .filter((node) => node.collection_id !== collectionId))
    this.documentEdges.set(projectId, (this.documentEdges.get(projectId) ?? [])
      .filter((edge) => edge.collection_id !== collectionId))
    this.documentNodeRecordLinks.set(projectId, (this.documentNodeRecordLinks.get(projectId) ?? [])
      .filter((link) => link.collection_id !== collectionId))
    this.documentEdgeRecordLinks.set(projectId, (this.documentEdgeRecordLinks.get(projectId) ?? [])
      .filter((link) => link.collection_id !== collectionId))
    this.documentImportRuns.set(projectId, (this.documentImportRuns.get(projectId) ?? [])
      .filter((run) => run.collection_id !== collectionId))
  }
}
