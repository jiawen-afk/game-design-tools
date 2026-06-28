import type { LegacyProjectRows } from './projectLegacyMigration'
import type {
  Asset,
  DocumentCollection,
  DocumentCollectionGraph,
  DocumentSource,
  DocumentSourceContent,
  Project,
  ProjectCleanupTask,
  ProjectDatabaseProvider,
  ProjectSettings,
} from './projectStorageTypes'
import type {
  DocumentImportResult,
  DocumentNeighbor,
  DocumentNodeDetails,
  DocumentNodeSearchInput,
  DocumentNodeSearchResult,
  DocumentRecordSearchInput,
  DocumentRecordSearchResult,
  ReplaceDocumentGraphInput,
} from './projectDocumentRepositoryTypes'

export type {
  DocumentImportResult,
  DocumentNeighbor,
  DocumentNodeDetails,
  DocumentNodeSearchInput,
  DocumentNodeSearchResult,
  DocumentRecordSearchInput,
  DocumentRecordSearchResult,
  ReplaceDocumentGraphInput,
} from './projectDocumentRepositoryTypes'

export interface CreateLocalProjectInput {
  name: string
  description: string
  localObjectRoot: string
  now: string
}

export interface CreateRemoteProjectInput {
  id?: string
  name: string
  description: string
  databaseProvider: Extract<ProjectDatabaseProvider, 'postgresql' | 'mysql'>
  databaseProfileId: string
  storageProfileId: string
  now: string
}

export interface UpdateProjectInput {
  name: string
  description: string
  updatedAt: string
  databaseProvider?: Extract<ProjectDatabaseProvider, 'postgresql' | 'mysql'>
  databaseProfileId?: string
  storageProfileId?: string
}

export interface ProjectWithSettings {
  project: Project
  settings: ProjectSettings
}

export interface ProjectRepository {
  initializeSchema(): Promise<void>
  createProject(input: CreateLocalProjectInput): Promise<ProjectWithSettings>
  createRemoteProject(input: CreateRemoteProjectInput): Promise<ProjectWithSettings>
  updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectWithSettings | null>
  listProjects(): Promise<Project[]>
  getProject(projectId: string): Promise<ProjectWithSettings | null>
  importProjectRows(rows: LegacyProjectRows): Promise<void>
  exportProjectRows(projectId: string): Promise<LegacyProjectRows | null>
  listAssets(projectId: string): Promise<Asset[]>
  addCleanupTasks(tasks: ProjectCleanupTask[]): Promise<void>
  listCleanupTasks(projectId: string): Promise<ProjectCleanupTask[]>
  listDocumentCollections(projectId: string): Promise<DocumentCollection[]>
  getDocumentCollection(projectId: string, collectionId: string): Promise<DocumentCollection | null>
  deleteDocumentCollection(projectId: string, collectionId: string): Promise<void>
  listDocumentSources(projectId: string, collectionId: string): Promise<DocumentSource[]>
  getDocumentSourceContent(projectId: string, sourceId: string): Promise<DocumentSourceContent | null>
  replaceDocumentGraph(input: ReplaceDocumentGraphInput): Promise<DocumentImportResult>
  getDocumentCollectionGraph(projectId: string, collectionId: string): Promise<DocumentCollectionGraph>
  searchDocumentRecords(input: DocumentRecordSearchInput): Promise<DocumentRecordSearchResult>
  searchDocumentNodes(input: DocumentNodeSearchInput): Promise<DocumentNodeSearchResult>
  getDocumentNode(projectId: string, nodeId: string): Promise<DocumentNodeDetails | null>
  listDocumentNeighbors(projectId: string, nodeId: string): Promise<DocumentNeighbor[]>
  deleteProject(projectId: string): Promise<void>
}
