import type {
  Asset,
  CreateLocalProjectInput,
  CreateRemoteProjectInput,
  DocumentCollection,
  DocumentCollectionGraph,
  DocumentImportResult,
  DocumentNeighbor,
  DocumentNodeDetails,
  DocumentNodeSearchInput,
  DocumentNodeSearchResult,
  DocumentRecordSearchInput,
  DocumentRecordSearchResult,
  DocumentSource,
  DocumentSourceContent,
  LegacyProjectRows,
  Project,
  ProjectCleanupTask,
  ProjectDatabaseProvider,
  ProjectDeviceBinding,
  ProjectWithSettings,
  ReplaceDocumentGraphInput,
  UpdateProjectInput,
} from './components/ProjectStorage'

export interface DesktopProjectRepositoryApi {
  initializeLocalProjectRepository(): Promise<boolean>
  createLocalProject(input: CreateLocalProjectInput): Promise<ProjectWithSettings>
  createLocalRemoteProject(input: CreateRemoteProjectInput): Promise<ProjectWithSettings>
  updateLocalProject(projectId: string, input: UpdateProjectInput): Promise<ProjectWithSettings | null>
  listLocalProjects(): Promise<Project[]>
  getLocalProject(projectId: string): Promise<ProjectWithSettings | null>
  importLocalProjectRows(rows: LegacyProjectRows): Promise<boolean>
  exportLocalProjectRows(projectId: string): Promise<LegacyProjectRows | null>
  listLocalProjectAssets(projectId: string): Promise<Asset[]>
  addLocalProjectCleanupTasks(tasks: ProjectCleanupTask[]): Promise<boolean>
  listLocalProjectCleanupTasks(projectId: string): Promise<ProjectCleanupTask[]>
  listLocalDocumentCollections(projectId: string): Promise<DocumentCollection[]>
  getLocalDocumentCollection(projectId: string, collectionId: string): Promise<DocumentCollection | null>
  deleteLocalDocumentCollection(projectId: string, collectionId: string): Promise<boolean>
  listLocalDocumentSources(projectId: string, collectionId: string): Promise<DocumentSource[]>
  getLocalDocumentSourceContent(projectId: string, sourceId: string): Promise<DocumentSourceContent | null>
  getLocalDocumentCollectionGraph(projectId: string, collectionId: string): Promise<DocumentCollectionGraph>
  replaceLocalDocumentGraph(input: ReplaceDocumentGraphInput): Promise<DocumentImportResult>
  searchLocalDocumentRecords(input: DocumentRecordSearchInput): Promise<DocumentRecordSearchResult>
  searchLocalDocumentNodes(input: DocumentNodeSearchInput): Promise<DocumentNodeSearchResult>
  getLocalDocumentNode(projectId: string, nodeId: string): Promise<DocumentNodeDetails | null>
  listLocalDocumentNeighbors(projectId: string, nodeId: string): Promise<DocumentNeighbor[]>
  deleteLocalProject(projectId: string): Promise<boolean>
  listProjectDeviceBindings(): Promise<Record<string, ProjectDeviceBinding>>
  writeProjectDeviceBinding(projectId: string, binding: ProjectDeviceBinding): Promise<boolean>
  clearProjectDeviceBinding(projectId: string): Promise<boolean>
  createRemoteProject(input: {
    id: string
    name: string
    description: string
    databaseProvider: Extract<ProjectDatabaseProvider, 'postgresql' | 'mysql'>
    databaseProfileId: string
    storageProfileId: string
    now: string
  }): Promise<ProjectWithSettings>
  updateRemoteProject(projectId: string, input: UpdateProjectInput, databaseProfileId?: string): Promise<ProjectWithSettings | null>
  listRemoteProjects(databaseProfileId?: string): Promise<Project[]>
  getRemoteProject(projectId: string, databaseProfileId?: string): Promise<ProjectWithSettings | null>
  importRemoteProjectRows(rows: LegacyProjectRows, databaseProfileId?: string): Promise<boolean>
  exportRemoteProjectRows(projectId: string, databaseProfileId?: string): Promise<LegacyProjectRows | null>
  listRemoteProjectAssets(projectId: string, databaseProfileId?: string): Promise<Asset[]>
  addRemoteProjectCleanupTasks(tasks: ProjectCleanupTask[], databaseProfileId?: string): Promise<boolean>
  listRemoteProjectCleanupTasks(projectId: string, databaseProfileId?: string): Promise<ProjectCleanupTask[]>
  listRemoteDocumentCollections(projectId: string, databaseProfileId?: string): Promise<DocumentCollection[]>
  getRemoteDocumentCollection(projectId: string, collectionId: string, databaseProfileId?: string): Promise<DocumentCollection | null>
  deleteRemoteDocumentCollection(projectId: string, collectionId: string, databaseProfileId?: string): Promise<boolean>
  listRemoteDocumentSources(projectId: string, collectionId: string, databaseProfileId?: string): Promise<DocumentSource[]>
  getRemoteDocumentSourceContent(projectId: string, sourceId: string, databaseProfileId?: string): Promise<DocumentSourceContent | null>
  getRemoteDocumentCollectionGraph(projectId: string, collectionId: string, databaseProfileId?: string): Promise<DocumentCollectionGraph>
  replaceRemoteDocumentGraph(input: ReplaceDocumentGraphInput, databaseProfileId?: string): Promise<DocumentImportResult>
  searchRemoteDocumentRecords(input: DocumentRecordSearchInput, databaseProfileId?: string): Promise<DocumentRecordSearchResult>
  searchRemoteDocumentNodes(input: DocumentNodeSearchInput, databaseProfileId?: string): Promise<DocumentNodeSearchResult>
  getRemoteDocumentNode(projectId: string, nodeId: string, databaseProfileId?: string): Promise<DocumentNodeDetails | null>
  listRemoteDocumentNeighbors(projectId: string, nodeId: string, databaseProfileId?: string): Promise<DocumentNeighbor[]>
  deleteRemoteProject(projectId: string, databaseProfileId?: string): Promise<boolean>
}
