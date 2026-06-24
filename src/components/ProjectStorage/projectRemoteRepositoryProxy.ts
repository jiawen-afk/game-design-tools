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
    return desktopApi.updateRemoteProject(projectId, input, this.requireProjectDatabaseProfileId(projectId))
  }

  async listProjects() {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return []
    try {
      return await desktopApi.listRemoteProjects(this.getDatabaseProfileId())
    } catch {
      return []
    }
  }

  async getProject(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return null
    try {
      return await desktopApi.getRemoteProject(projectId, this.requireProjectDatabaseProfileId(projectId))
    } catch {
      return null
    }
  }

  async importProjectRows(rows: LegacyProjectRows) {
    const desktopApi = this.requireDesktopApi()
    await desktopApi.importRemoteProjectRows(rows, this.requireProjectDatabaseProfileId(rows.project.id))
  }

  async exportProjectRows(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return null
    return desktopApi.exportRemoteProjectRows(projectId, this.requireProjectDatabaseProfileId(projectId))
  }

  async listAssets(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return []
    try {
      return await desktopApi.listRemoteProjectAssets(projectId, this.requireProjectDatabaseProfileId(projectId))
    } catch {
      return []
    }
  }

  async deleteProject(projectId: string) {
    const desktopApi = this.requireDesktopApi()
    await desktopApi.deleteRemoteProject(projectId, this.requireProjectDatabaseProfileId(projectId))
  }

  private requireProjectDatabaseProfileId(projectId: string) {
    const databaseProfileId = this.getDatabaseProfileId(projectId)
    if (!databaseProfileId) {
      throw new Error(`项目 ${projectId} 缺少远程数据库配置，请在项目管理中重新保存远程数据库连接。`)
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
