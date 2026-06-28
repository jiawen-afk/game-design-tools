import {
  hardDeleteProjectWithObjects,
  readActiveProjectId,
  resolveEnabledProjectId,
  type Project,
  type ProjectAssetManager,
  type ProjectDatabaseProvider,
  type ProjectObjectStorage,
  type ProjectRepository,
  type ProjectSettings,
} from '../ProjectStorage'
import type { PersonalSpaceState } from './personalSpaceModel'
import { deleteProjectSpaceState } from './projectSpaceState'
import { isRemoteProjectConfigurationReady } from './projectManagementModel'
import { projectAssetObjectKeys } from './currentProjectSpacePersistence'
import { createProjectManagementMigrationAction } from './projectManagementMigrationAction'
import { createProjectManagementCreateActions } from './projectManagementCreateActions'

interface ProjectManagementMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

interface ProjectManagementSettingsWorkspace {
  draftStorageDirectory: string
  remoteReady: boolean
  kodoVerificationProjectId: string
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  databaseProfileDraft: {
    provider: Extract<ProjectDatabaseProvider, 'postgresql' | 'mysql'>
  }
}

interface ProjectStorageWorkflowForManagement {
  repositoryForProject: (project?: Project | null) => ProjectRepository
  syncProjectStateToStorage: (project: Project, state: PersonalSpaceState) => Promise<void>
}

interface RemoteDeviceBindingResolverForManagement {
  bindProjectToCurrentDevice: (
    projectId: string,
    databaseProfileId: string,
    storageProfileId: string,
  ) => Promise<void> | void
  clearProjectFromCurrentDevice: (projectId: string) => Promise<void> | void
}

export interface ProjectManagementActionsOptions {
  localRepository: ProjectRepository
  remoteRepository: ProjectRepository
  localObjectStorage: ProjectObjectStorage
  remoteObjectStorage: ProjectObjectStorage
  assetManager: ProjectAssetManager
  storageWorkflow: ProjectStorageWorkflowForManagement
  remoteDeviceBindingResolver: RemoteDeviceBindingResolverForManagement
  messageApi: ProjectManagementMessageApi
  getSettingsWorkspace: () => ProjectManagementSettingsWorkspace
  getProjects: () => Project[]
  getActiveProjectId: () => string
  getSpace: () => PersonalSpaceState
  migrationInFlightProjectIdRef: { current: string }
  setMigratingProjectId: (projectId: string) => void
  refreshProjectList: (preferredProjectId?: string) => Promise<Project[]>
  activateProjectState: (projectId: string, fallbackState?: PersonalSpaceState) => void
  activateProjectStateFromStorage: (
    projectId: string,
    fallbackState?: PersonalSpaceState,
    projectList?: Project[],
  ) => Promise<boolean>
  ensureRemoteProjectSettings: (projectId: string) => Promise<void>
  rememberRemoteProjectSettings: (
    project: Project,
    settings: ProjectSettings,
    assetObjectKeys?: string[],
  ) => void
  findProject: (projectId: string, projectList?: Project[]) => Project | undefined
}

export function createProjectManagementActions(options: ProjectManagementActionsOptions) {
  const { createLocalProject, createRemoteProject } = createProjectManagementCreateActions(options)

  const renameProject = async (projectId: string, name: string, description: string) => {
    await options.ensureRemoteProjectSettings(projectId)
    const repository = options.storageWorkflow.repositoryForProject(options.findProject(projectId))
    const updated = await repository.updateProject(projectId, {
      name,
      description,
      updatedAt: new Date().toISOString(),
    })
    if (!updated) {
      void options.messageApi.warning('项目不存在，无法编辑')
      return false
    }
    await options.refreshProjectList(projectId)
    void options.messageApi.success('已编辑项目')
    return true
  }

  const updateRemoteProjectLinks = async (projectId: string) => {
    const project = options.findProject(projectId)
    const settingsWorkspace = options.getSettingsWorkspace()
    if (!project || project.mode !== 'remote') {
      void options.messageApi.warning('请选择远程项目')
      return false
    }
    if (!isRemoteProjectConfigurationReady(settingsWorkspace, projectId)) {
      void options.messageApi.warning('请先完成远程数据库验证、表结构初始化和当前项目 Kodo 验证')
      return false
    }

    const input = {
      name: project.name,
      description: project.description,
      updatedAt: new Date().toISOString(),
      databaseProvider: settingsWorkspace.databaseProfileDraft.provider,
      databaseProfileId: settingsWorkspace.selectedDatabaseProfileId,
      storageProfileId: settingsWorkspace.selectedKodoProfileId,
    }
    const updated = await options.remoteRepository.updateProject(projectId, input)
    if (!updated) {
      void options.messageApi.warning('远程项目不存在，无法保存连接')
      return false
    }
    await options.remoteDeviceBindingResolver.bindProjectToCurrentDevice(
      projectId,
      settingsWorkspace.selectedDatabaseProfileId,
      settingsWorkspace.selectedKodoProfileId,
    )
    const remoteRows = await options.remoteRepository.exportProjectRows(projectId)
    options.rememberRemoteProjectSettings(
      updated.project,
      updated.settings,
      remoteRows ? projectAssetObjectKeys(remoteRows) : undefined,
    )
    const localSnapshot = await options.localRepository.getProject(projectId)
    if (localSnapshot?.project.mode === 'remote') {
      await options.localRepository.updateProject(projectId, input)
    }
    await options.refreshProjectList(projectId)
    void options.messageApi.success('已保存远程项目连接')
    return true
  }

  const deleteProject = async (projectId: string) => {
    const projectToDelete = options.getProjects().find((project) => project.id === projectId)
    if (projectToDelete?.mode === 'remote') await options.ensureRemoteProjectSettings(projectId)
    const repository = options.storageWorkflow.repositoryForProject(projectToDelete)
    const result = await hardDeleteProjectWithObjects({
      projectId,
      repository,
      localRepository: projectToDelete?.mode === 'remote' ? options.localRepository : undefined,
      objectStorage: projectToDelete?.mode === 'remote' ? options.remoteObjectStorage : options.localObjectStorage,
      assetManager: options.assetManager,
      storageProvider: projectToDelete?.mode === 'remote' ? 'qiniu_kodo' : 'local',
      now: new Date().toISOString(),
    })
    deleteProjectSpaceState(projectId)
    await options.remoteDeviceBindingResolver.clearProjectFromCurrentDevice(projectId)
    const wasActive = options.getActiveProjectId() === projectId
    if (wasActive) options.activateProjectState('')
    const nextProjects = await options.refreshProjectList('')
    const nextEnabledProjectId = wasActive
      ? resolveEnabledProjectId(nextProjects, readActiveProjectId())
      : options.getActiveProjectId()
    if (wasActive && nextEnabledProjectId) {
      void options.activateProjectStateFromStorage(nextEnabledProjectId, undefined, nextProjects)
    }
    if (result.cleanupTasks.length > 0) {
      void options.messageApi.warning('已删除项目，部分对象进入待清理记录。')
    } else {
      void options.messageApi.success('已删除项目')
    }
  }

  const migrateActiveProjectToRemote = createProjectManagementMigrationAction(options)

  return {
    createLocalProject,
    createRemoteProject,
    renameProject,
    updateRemoteProjectLinks,
    deleteProject,
    migrateActiveProjectToRemote,
  }
}
