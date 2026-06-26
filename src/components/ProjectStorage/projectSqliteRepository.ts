import { createProjectId } from './projectId'
import { sanitizeObjectKeyPart } from './projectStorageModel'
import { createProjectSchemaSql } from './projectSchema'
import type { LegacyProjectRows } from './projectLegacyMigration'
import type {
  Asset,
  AssetGroup,
  AssetRelation,
  Character,
  CharacterAssetLink,
  DocumentCollection,
  DocumentCollectionGraph,
  DocumentEdge,
  DocumentEdgeRecordLink,
  DocumentGraphEdge,
  DocumentGraphNode,
  DocumentImportRun,
  DocumentNode,
  DocumentNodeRecordLink,
  DocumentRecord,
  DocumentSource,
  DocumentSourceContent,
  Project,
  ProjectDatabaseProvider,
  ProjectCleanupTask,
  ProjectSettings,
  StoryboardGroup,
  StoryboardVoiceEntry,
} from './projectStorageTypes'

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

export class MemoryProjectRepository implements ProjectRepository {
  private initialized = false
  private projects = new Map<string, Project>()
  private settings = new Map<string, ProjectSettings>()
  private assetGroups = new Map<string, AssetGroup[]>()
  private assets = new Map<string, Asset[]>()
  private characters = new Map<string, Character[]>()
  private characterAssetLinks = new Map<string, CharacterAssetLink[]>()
  private storyboardGroups = new Map<string, StoryboardGroup[]>()
  private storyboardVoiceEntries = new Map<string, StoryboardVoiceEntry[]>()
  private assetRelations = new Map<string, AssetRelation[]>()
  private documentCollections = new Map<string, DocumentCollection[]>()
  private documentSources = new Map<string, DocumentSource[]>()
  private documentSourceContents = new Map<string, DocumentSourceContent[]>()
  private documentRecords = new Map<string, DocumentRecord[]>()
  private documentNodes = new Map<string, DocumentNode[]>()
  private documentEdges = new Map<string, DocumentEdge[]>()
  private documentNodeRecordLinks = new Map<string, DocumentNodeRecordLink[]>()
  private documentEdgeRecordLinks = new Map<string, DocumentEdgeRecordLink[]>()
  private documentImportRuns = new Map<string, DocumentImportRun[]>()
  private cleanupTasks = new Map<string, ProjectCleanupTask[]>()

  async initializeSchema() {
    createProjectSchemaSql('sqlite')
    this.initialized = true
  }

  async createProject(input: CreateLocalProjectInput): Promise<ProjectWithSettings> {
    if (!this.initialized) await this.initializeSchema()
    const id = createProjectId()
    const name = input.name.trim() || '未命名项目'
    const project: Project = {
      id,
      name,
      description: input.description.trim(),
      mode: 'local',
      status: 'active',
      object_key_prefix: `objects/${sanitizeObjectKeyPart(name)}`,
      created_at: input.now,
      updated_at: input.now,
      metadata_json: null,
    }
    const settings: ProjectSettings = {
      project_id: id,
      storage_provider: 'local',
      database_provider: 'sqlite',
      local_object_root: input.localObjectRoot,
      remote_database_profile_id: null,
      remote_storage_profile_id: null,
      last_verified_at: null,
      updated_at: input.now,
    }
    this.projects.set(id, project)
    this.settings.set(id, settings)
    this.assetGroups.set(id, [])
    this.assets.set(id, [])
    this.characters.set(id, [])
    this.characterAssetLinks.set(id, [])
    this.storyboardGroups.set(id, [])
    this.storyboardVoiceEntries.set(id, [])
    this.assetRelations.set(id, [])
    this.documentCollections.set(id, [])
    this.documentSources.set(id, [])
    this.documentSourceContents.set(id, [])
    this.documentRecords.set(id, [])
    this.documentNodes.set(id, [])
    this.documentEdges.set(id, [])
    this.documentNodeRecordLinks.set(id, [])
    this.documentEdgeRecordLinks.set(id, [])
    this.documentImportRuns.set(id, [])
    return { project, settings }
  }

  async createRemoteProject(input: CreateRemoteProjectInput): Promise<ProjectWithSettings> {
    if (!this.initialized) await this.initializeSchema()
    const id = input.id ?? createProjectId()
    const name = input.name.trim() || '未命名项目'
    const project: Project = {
      id,
      name,
      description: input.description.trim(),
      mode: 'remote',
      status: 'active',
      object_key_prefix: `objects/${sanitizeObjectKeyPart(name)}`,
      created_at: input.now,
      updated_at: input.now,
      metadata_json: null,
    }
    const settings: ProjectSettings = {
      project_id: id,
      storage_provider: 'qiniu_kodo',
      database_provider: input.databaseProvider,
      local_object_root: null,
      remote_database_profile_id: null,
      remote_storage_profile_id: null,
      last_verified_at: input.now,
      updated_at: input.now,
    }
    this.projects.set(id, project)
    this.settings.set(id, settings)
    this.assetGroups.set(id, [])
    this.assets.set(id, [])
    this.characters.set(id, [])
    this.characterAssetLinks.set(id, [])
    this.storyboardGroups.set(id, [])
    this.storyboardVoiceEntries.set(id, [])
    this.assetRelations.set(id, [])
    this.documentCollections.set(id, [])
    this.documentSources.set(id, [])
    this.documentSourceContents.set(id, [])
    this.documentRecords.set(id, [])
    this.documentNodes.set(id, [])
    this.documentEdges.set(id, [])
    this.documentNodeRecordLinks.set(id, [])
    this.documentEdgeRecordLinks.set(id, [])
    this.documentImportRuns.set(id, [])
    return { project, settings }
  }

  async updateProject(projectId: string, input: UpdateProjectInput) {
    const project = this.projects.get(projectId)
    const settings = this.settings.get(projectId)
    if (!project || !settings) return null
    const updated: Project = {
      ...project,
      name: input.name.trim() || '未命名项目',
      description: input.description.trim(),
      updated_at: input.updatedAt,
    }
    const updatedSettings: ProjectSettings = {
      ...settings,
      database_provider: input.databaseProvider ?? settings.database_provider,
      remote_database_profile_id: null,
      remote_storage_profile_id: null,
      updated_at: input.updatedAt,
    }
    this.projects.set(projectId, updated)
    this.settings.set(projectId, updatedSettings)
    return { project: updated, settings: updatedSettings }
  }

  async listProjects() {
    return Array.from(this.projects.values())
  }

  async getProject(projectId: string) {
    const project = this.projects.get(projectId)
    const settings = this.settings.get(projectId)
    return project && settings ? { project, settings } : null
  }

  async importProjectRows(rows: LegacyProjectRows) {
    if (!this.initialized) await this.initializeSchema()
    this.projects.set(rows.project.id, rows.project)
    this.settings.set(rows.project.id, rows.settings)
    this.assetGroups.set(rows.project.id, [...rows.assetGroups])
    this.assets.set(rows.project.id, [...rows.assets])
    this.characters.set(rows.project.id, [...rows.characters])
    this.characterAssetLinks.set(rows.project.id, [...rows.characterAssetLinks])
    this.storyboardGroups.set(rows.project.id, [...rows.storyboardGroups])
    this.storyboardVoiceEntries.set(rows.project.id, [...rows.storyboardVoiceEntries])
    this.assetRelations.set(rows.project.id, [...rows.assetRelations])
    this.documentCollections.set(rows.project.id, [...(rows.documentCollections ?? [])])
    this.documentSources.set(rows.project.id, [...(rows.documentSources ?? [])])
    this.documentSourceContents.set(rows.project.id, [...(rows.documentSourceContents ?? [])])
    this.documentRecords.set(rows.project.id, [...(rows.documentRecords ?? [])])
    this.documentNodes.set(rows.project.id, [...(rows.documentNodes ?? [])])
    this.documentEdges.set(rows.project.id, [...(rows.documentEdges ?? [])])
    this.documentNodeRecordLinks.set(rows.project.id, [...(rows.documentNodeRecordLinks ?? [])])
    this.documentEdgeRecordLinks.set(rows.project.id, [...(rows.documentEdgeRecordLinks ?? [])])
    this.documentImportRuns.set(rows.project.id, [...(rows.documentImportRuns ?? [])])
  }

  async exportProjectRows(projectId: string) {
    const project = this.projects.get(projectId)
    const settings = this.settings.get(projectId)
    if (!project || !settings) return null
    return {
      project,
      settings,
      assetGroups: [...(this.assetGroups.get(projectId) ?? [])],
      assets: [...(this.assets.get(projectId) ?? [])],
      characters: [...(this.characters.get(projectId) ?? [])],
      characterAssetLinks: [...(this.characterAssetLinks.get(projectId) ?? [])],
      storyboardGroups: [...(this.storyboardGroups.get(projectId) ?? [])],
      storyboardVoiceEntries: [...(this.storyboardVoiceEntries.get(projectId) ?? [])],
      assetRelations: [...(this.assetRelations.get(projectId) ?? [])],
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

  async listAssets(projectId: string) {
    return [...(this.assets.get(projectId) ?? [])]
  }

  async addCleanupTasks(tasks: ProjectCleanupTask[]) {
    for (const task of tasks) {
      const current = this.cleanupTasks.get(task.project_id) ?? []
      this.cleanupTasks.set(task.project_id, [...current.filter((item) => item.id !== task.id), task])
    }
  }

  async listCleanupTasks(projectId: string) {
    return [...(this.cleanupTasks.get(projectId) ?? [])]
  }

  async listDocumentCollections(projectId: string) {
    return [...(this.documentCollections.get(projectId) ?? [])]
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
  }

  async getDocumentCollection(projectId: string, collectionId: string) {
    return (this.documentCollections.get(projectId) ?? [])
      .find((collection) => collection.id === collectionId) ?? null
  }

  async deleteDocumentCollection(projectId: string, collectionId: string) {
    this.documentCollections.set(projectId, (this.documentCollections.get(projectId) ?? [])
      .filter((collection) => collection.id !== collectionId))
    this.deleteDocumentCollectionChildren(projectId, collectionId)
  }

  async listDocumentSources(projectId: string, collectionId: string) {
    return (this.documentSources.get(projectId) ?? [])
      .filter((source) => source.collection_id === collectionId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
  }

  async getDocumentSourceContent(projectId: string, sourceId: string) {
    return (this.documentSourceContents.get(projectId) ?? [])
      .find((content) => content.source_id === sourceId) ?? null
  }

  async replaceDocumentGraph(input: ReplaceDocumentGraphInput) {
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

  async getDocumentCollectionGraph(projectId: string, collectionId: string): Promise<DocumentCollectionGraph> {
    const records = (this.documentRecords.get(projectId) ?? [])
      .filter((record) => record.collection_id === collectionId)
    const recordsById = new Map(records.map((record) => [record.id, record]))
    const recordIdsByNodeId = groupValuesByKey(
      (this.documentNodeRecordLinks.get(projectId) ?? []).filter((link) => link.collection_id === collectionId),
      (link) => link.node_id,
      (link) => link.record_id,
    )
    const recordIdsByEdgeId = groupValuesByKey(
      (this.documentEdgeRecordLinks.get(projectId) ?? []).filter((link) => link.collection_id === collectionId),
      (link) => link.edge_id,
      (link) => link.record_id,
    )
    const nodes = Object.fromEntries((this.documentNodes.get(projectId) ?? [])
      .filter((node) => node.collection_id === collectionId)
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
    const edges = Object.fromEntries((this.documentEdges.get(projectId) ?? [])
      .filter((edge) => edge.collection_id === collectionId)
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

  async searchDocumentRecords(input: DocumentRecordSearchInput): Promise<DocumentRecordSearchResult> {
    const query = normalizeDocumentQuery(input.query)
    const matched = (this.documentRecords.get(input.projectId) ?? [])
      .filter((record) => !input.collectionId || record.collection_id === input.collectionId)
      .filter((record) => !query || record.search_text.toLocaleLowerCase().includes(query))
      .sort((left, right) => left.title.localeCompare(right.title))
    return {
      items: matched.slice(0, normalizeDocumentLimit(input.limit)),
      total: matched.length,
    }
  }

  async searchDocumentNodes(input: DocumentNodeSearchInput): Promise<DocumentNodeSearchResult> {
    const query = normalizeDocumentQuery(input.query)
    const matched = (this.documentNodes.get(input.projectId) ?? [])
      .filter((node) => !input.collectionId || node.collection_id === input.collectionId)
      .filter((node) => !input.nodeType || node.node_type === input.nodeType)
      .filter((node) => !query || node.search_text.toLocaleLowerCase().includes(query))
      .sort((left, right) => left.label.localeCompare(right.label))
    return {
      items: matched.slice(0, normalizeDocumentLimit(input.limit)),
      total: matched.length,
    }
  }

  async getDocumentNode(projectId: string, nodeId: string) {
    const node = (this.documentNodes.get(projectId) ?? []).find((item) => item.id === nodeId)
    if (!node) return null
    const recordIds = new Set((this.documentNodeRecordLinks.get(projectId) ?? [])
      .filter((link) => link.node_id === nodeId)
      .map((link) => link.record_id))
    const records = (this.documentRecords.get(projectId) ?? [])
      .filter((record) => recordIds.has(record.id))
      .sort((left, right) => left.title.localeCompare(right.title))
    return { node, records }
  }

  async listDocumentNeighbors(projectId: string, nodeId: string) {
    const nodes = this.documentNodes.get(projectId) ?? []
    return (this.documentEdges.get(projectId) ?? [])
      .flatMap((edge): DocumentNeighbor[] => {
        if (edge.source_node_id !== nodeId && edge.target_node_id !== nodeId) return []
        const direction = edge.source_node_id === nodeId ? 'outgoing' : 'incoming'
        const neighborNodeId = direction === 'outgoing' ? edge.target_node_id : edge.source_node_id
        const node = nodes.find((item) => item.id === neighborNodeId)
        return node ? [{ edge, node, direction }] : []
      })
      .sort((left, right) => left.node.label.localeCompare(right.node.label))
  }

  async deleteProject(projectId: string) {
    this.projects.delete(projectId)
    this.settings.delete(projectId)
    this.assetGroups.delete(projectId)
    this.assets.delete(projectId)
    this.characters.delete(projectId)
    this.characterAssetLinks.delete(projectId)
    this.storyboardGroups.delete(projectId)
    this.storyboardVoiceEntries.delete(projectId)
    this.assetRelations.delete(projectId)
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

export function createMemoryProjectRepository() {
  return new MemoryProjectRepository()
}
