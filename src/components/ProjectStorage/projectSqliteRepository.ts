import { createProjectId } from './projectId'
import { sanitizeObjectKeyPart } from './projectStorageModel'
import { createProjectSchemaSql } from './projectSchema'
import { MemoryProjectDocumentStore } from './projectMemoryDocumentStore'
import { MemoryProjectSpaceStore } from './projectMemoryProjectSpaceStore'
import type { LegacyProjectRows } from './projectLegacyMigration'
import type {
  CreateLocalProjectInput,
  CreateRemoteProjectInput,
  DocumentNodeSearchInput,
  DocumentRecordSearchInput,
  ProjectRepository,
  ProjectWithSettings,
  ReplaceDocumentGraphInput,
  UpdateProjectInput,
} from './projectRepositoryTypes'
import type {
  Project,
  ProjectCleanupTask,
  ProjectSettings,
} from './projectStorageTypes'

export type {
  CreateLocalProjectInput,
  CreateRemoteProjectInput,
  DocumentImportResult,
  DocumentNeighbor,
  DocumentNodeDetails,
  DocumentNodeSearchInput,
  DocumentNodeSearchResult,
  DocumentRecordSearchInput,
  DocumentRecordSearchResult,
  ProjectRepository,
  ProjectWithSettings,
  ReplaceDocumentGraphInput,
  UpdateProjectInput,
} from './projectRepositoryTypes'

export class MemoryProjectRepository implements ProjectRepository {
  private initialized = false
  private projects = new Map<string, Project>()
  private settings = new Map<string, ProjectSettings>()
  private projectSpace = new MemoryProjectSpaceStore()
  private documents = new MemoryProjectDocumentStore()

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
    this.projectSpace.initializeProject(id)
    this.documents.initializeProject(id)
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
    this.projectSpace.initializeProject(id)
    this.documents.initializeProject(id)
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
    this.projectSpace.importProjectRows(rows.project.id, rows)
    this.documents.importProjectRows(rows.project.id, rows)
  }

  async exportProjectRows(projectId: string) {
    const project = this.projects.get(projectId)
    const settings = this.settings.get(projectId)
    if (!project || !settings) return null
    return {
      project,
      settings,
      ...this.projectSpace.exportProjectRows(projectId),
      ...this.documents.exportProjectRows(projectId),
    }
  }

  async listAssets(projectId: string) {
    return this.projectSpace.listAssets(projectId)
  }

  async addCleanupTasks(tasks: ProjectCleanupTask[]) {
    this.projectSpace.addCleanupTasks(tasks)
  }

  async listCleanupTasks(projectId: string) {
    return this.projectSpace.listCleanupTasks(projectId)
  }

  async listDocumentCollections(projectId: string) {
    return this.documents.listDocumentCollections(projectId)
  }

  async getDocumentCollection(projectId: string, collectionId: string) {
    return this.documents.getDocumentCollection(projectId, collectionId)
  }

  async deleteDocumentCollection(projectId: string, collectionId: string) {
    this.documents.deleteDocumentCollection(projectId, collectionId)
  }

  async listDocumentSources(projectId: string, collectionId: string) {
    return this.documents.listDocumentSources(projectId, collectionId)
  }

  async getDocumentSourceContent(projectId: string, sourceId: string) {
    return this.documents.getDocumentSourceContent(projectId, sourceId)
  }

  async replaceDocumentGraph(input: ReplaceDocumentGraphInput) {
    return this.documents.replaceDocumentGraph(input)
  }

  async getDocumentCollectionGraph(projectId: string, collectionId: string) {
    return this.documents.getDocumentCollectionGraph(projectId, collectionId)
  }

  async searchDocumentRecords(input: DocumentRecordSearchInput) {
    return this.documents.searchDocumentRecords(input)
  }

  async searchDocumentNodes(input: DocumentNodeSearchInput) {
    return this.documents.searchDocumentNodes(input)
  }

  async getDocumentNode(projectId: string, nodeId: string) {
    return this.documents.getDocumentNode(projectId, nodeId)
  }

  async listDocumentNeighbors(projectId: string, nodeId: string) {
    return this.documents.listDocumentNeighbors(projectId, nodeId)
  }

  async deleteProject(projectId: string) {
    this.projects.delete(projectId)
    this.settings.delete(projectId)
    this.projectSpace.deleteProject(projectId)
    this.documents.deleteProject(projectId)
  }
}

export function createMemoryProjectRepository() {
  return new MemoryProjectRepository()
}
