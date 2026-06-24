import { getDesktopApi } from '../../desktopApi'
import { createProjectId } from './projectId'
import type { LegacyProjectRows } from './projectLegacyMigration'
import type {
  CreateLocalProjectInput,
  CreateRemoteProjectInput,
  ProjectWithSettings,
  ProjectRepository,
  UpdateProjectInput,
} from './projectSqliteRepository'
import type { ProjectCleanupTask } from './projectStorageTypes'

const listedProjectDatabaseProfileIds = new Map<string, string>()

export class DesktopRemoteProjectRepository implements ProjectRepository {
  private readonly getDatabaseProfileId: (projectId?: string) => string

  constructor(getDatabaseProfileId: (projectId?: string) => string = () => '') {
    this.getDatabaseProfileId = getDatabaseProfileId
  }

  async initializeSchema() {}

  async createProject(_input: CreateLocalProjectInput): Promise<ProjectWithSettings> {
    throw new Error('远程仓库不支持创建本地项目。')
  }

  async createRemoteProject(input: CreateRemoteProjectInput) {
    const desktopApi = this.requireDesktopApi()
    return desktopApi.createRemoteProject({
      ...input,
      id: input.id ?? createProjectId(),
    })
  }

  async updateProject(projectId: string, input: UpdateProjectInput) {
    const desktopApi = this.requireDesktopApi()
    return desktopApi.updateRemoteProject(
      projectId,
      input,
      input.databaseProfileId || this.requireProjectDatabaseProfileId(projectId),
    )
  }

  async listProjects() {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return []
    const databaseProfileId = this.getDatabaseProfileId()
    if (!databaseProfileId) throw new Error('缺少远程数据库配置，请在项目管理中选择远程数据库连接。')
    const projects = await desktopApi.listRemoteProjects(databaseProfileId)
    if (databaseProfileId) {
      for (const project of projects) {
        listedProjectDatabaseProfileIds.set(project.id, databaseProfileId)
      }
    }
    return projects
  }

  async getProject(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return null
    return desktopApi.getRemoteProject(projectId, this.requireProjectDatabaseProfileId(projectId))
  }

  async importProjectRows(rows: LegacyProjectRows) {
    const desktopApi = this.requireDesktopApi()
    await desktopApi.importRemoteProjectRows(
      rows,
      this.requireProjectDatabaseProfileId(rows.project.id, rows.project.name),
    )
  }

  async exportProjectRows(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return null
    return desktopApi.exportRemoteProjectRows(projectId, this.requireProjectDatabaseProfileId(projectId))
  }

  async listAssets(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return []
    return desktopApi.listRemoteProjectAssets(projectId, this.requireProjectDatabaseProfileId(projectId))
  }

  async addCleanupTasks(tasks: ProjectCleanupTask[]) {
    if (tasks.length === 0) return
    const desktopApi = this.requireDesktopApi()
    await desktopApi.addRemoteProjectCleanupTasks(tasks, this.requireProjectDatabaseProfileId(tasks[0]?.project_id || ''))
  }

  async listCleanupTasks(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return []
    return desktopApi.listRemoteProjectCleanupTasks(projectId, this.requireProjectDatabaseProfileId(projectId))
  }

  async deleteProject(projectId: string) {
    const desktopApi = this.requireDesktopApi()
    await desktopApi.deleteRemoteProject(projectId, this.requireProjectDatabaseProfileId(projectId))
  }

  private requireProjectDatabaseProfileId(projectId: string, projectName?: string | null) {
    const databaseProfileId = this.getDatabaseProfileId(projectId) || listedProjectDatabaseProfileIds.get(projectId)
    if (!databaseProfileId) {
      const projectLabel = projectName?.trim() ? `“${projectName.trim()}”` : ` ${projectId} `
      throw new Error(`项目${projectLabel}缺少远程数据库配置，请在项目管理中重新保存远程数据库连接。`)
    }
    return databaseProfileId
  }

  private requireDesktopApi() {
    const desktopApi = getDesktopApi()
    if (!desktopApi) throw new Error('当前桌面运行时不可用，无法访问远程项目数据库。')
    return desktopApi
  }
}

export function createDesktopRemoteProjectRepository(getDatabaseProfileId?: (projectId?: string) => string) {
  return new DesktopRemoteProjectRepository(getDatabaseProfileId)
}
