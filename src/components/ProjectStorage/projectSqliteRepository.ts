import { createProjectId } from './projectId'
import { createProjectSchemaSql } from './projectSchema'
import type { LegacyProjectRows } from './projectLegacyMigration'
import type { Asset, Project, ProjectSettings } from './projectStorageTypes'

export interface CreateLocalProjectInput {
  name: string
  description: string
  localObjectRoot: string
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
  updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectWithSettings | null>
  listProjects(): Promise<Project[]>
  getProject(projectId: string): Promise<ProjectWithSettings | null>
  importProjectRows(rows: LegacyProjectRows): Promise<void>
  listAssets(projectId: string): Promise<Asset[]>
  deleteProject(projectId: string): Promise<void>
}

export class MemoryProjectRepository implements ProjectRepository {
  private initialized = false
  private projects = new Map<string, Project>()
  private settings = new Map<string, ProjectSettings>()
  private assets = new Map<string, Asset[]>()

  async initializeSchema() {
    createProjectSchemaSql('sqlite')
    this.initialized = true
  }

  async createProject(input: CreateLocalProjectInput): Promise<ProjectWithSettings> {
    if (!this.initialized) await this.initializeSchema()
    const id = createProjectId()
    const project: Project = {
      id,
      name: input.name.trim() || '未命名项目',
      description: input.description.trim(),
      mode: 'local',
      status: 'active',
      object_key_prefix: `objects/${id}`,
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
    this.assets.set(id, [])
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
    this.assets.set(rows.project.id, [...rows.assets])
  }

  async listAssets(projectId: string) {
    return [...(this.assets.get(projectId) ?? [])]
  }

  async deleteProject(projectId: string) {
    this.projects.delete(projectId)
    this.settings.delete(projectId)
    this.assets.delete(projectId)
  }
}

export function createMemoryProjectRepository() {
  return new MemoryProjectRepository()
}
