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
  Project,
  ProjectDatabaseProvider,
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
      remote_database_profile_id: input.databaseProfileId,
      remote_storage_profile_id: input.storageProfileId,
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
    this.projects.set(projectId, updated)
    return { project: updated, settings }
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
    }
  }

  async listAssets(projectId: string) {
    return [...(this.assets.get(projectId) ?? [])]
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
  }
}

export function createMemoryProjectRepository() {
  return new MemoryProjectRepository()
}
