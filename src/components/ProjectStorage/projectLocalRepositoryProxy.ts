import { getDesktopApi } from '../../desktopApi'
import type { LegacyProjectRows } from './projectLegacyMigration'
import {
  createMemoryProjectRepository,
  type CreateLocalProjectInput,
  type CreateRemoteProjectInput,
  type ProjectRepository,
  type UpdateProjectInput,
} from './projectSqliteRepository'
import type { ProjectCleanupTask } from './projectStorageTypes'

export class DesktopLocalProjectRepository implements ProjectRepository {
  private readonly fallbackRepository = createMemoryProjectRepository()

  async initializeSchema() {
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      await this.fallbackRepository.initializeSchema()
      return
    }
    await desktopApi.initializeLocalProjectRepository()
  }

  async createProject(input: CreateLocalProjectInput) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return this.fallbackRepository.createProject(input)
    return desktopApi.createLocalProject(input)
  }

  async createRemoteProject(input: CreateRemoteProjectInput) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return this.fallbackRepository.createRemoteProject(input)
    return desktopApi.createLocalRemoteProject(input)
  }

  async updateProject(projectId: string, input: UpdateProjectInput) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return this.fallbackRepository.updateProject(projectId, input)
    return desktopApi.updateLocalProject(projectId, input)
  }

  async listProjects() {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return this.fallbackRepository.listProjects()
    return desktopApi.listLocalProjects()
  }

  async getProject(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return this.fallbackRepository.getProject(projectId)
    return desktopApi.getLocalProject(projectId)
  }

  async importProjectRows(rows: LegacyProjectRows) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      await this.fallbackRepository.importProjectRows(rows)
      return
    }
    await desktopApi.importLocalProjectRows(rows)
  }

  async exportProjectRows(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return this.fallbackRepository.exportProjectRows(projectId)
    return desktopApi.exportLocalProjectRows(projectId)
  }

  async listAssets(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return this.fallbackRepository.listAssets(projectId)
    return desktopApi.listLocalProjectAssets(projectId)
  }

  async addCleanupTasks(tasks: ProjectCleanupTask[]) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      await this.fallbackRepository.addCleanupTasks(tasks)
      return
    }
    await desktopApi.addLocalProjectCleanupTasks(tasks)
  }

  async listCleanupTasks(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return this.fallbackRepository.listCleanupTasks(projectId)
    return desktopApi.listLocalProjectCleanupTasks(projectId)
  }

  async deleteProject(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      await this.fallbackRepository.deleteProject(projectId)
      return
    }
    await desktopApi.deleteLocalProject(projectId)
  }
}

export function createDesktopLocalProjectRepository() {
  return new DesktopLocalProjectRepository()
}
