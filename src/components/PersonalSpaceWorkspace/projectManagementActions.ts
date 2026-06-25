import {
  clearProjectDeviceBinding,
  hardDeleteProjectWithObjects,
  migrateLocalProjectToRemote,
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
import {
  createEmptyProjectSpaceState,
  deleteProjectSpaceState,
  writeProjectSpaceState,
} from './projectSpaceState'
import { isRemoteProjectConfigurationReady } from './projectManagementModel'

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
  ) => void
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

function getCurrentLocalObjectRoot(options: ProjectManagementActionsOptions) {
  const settingsWorkspace = options.getSettingsWorkspace()
  const space = options.getSpace()
  return settingsWorkspace.draftStorageDirectory || space.settings.storageDirectory || ''
}

export function createProjectManagementActions(options: ProjectManagementActionsOptions) {
  const createLocalProject = async (name: string, description: string) => {
    const localObjectRoot = getCurrentLocalObjectRoot(options)
    const created = await options.localRepository.createProject({
      name,
      description,
      localObjectRoot,
      now: new Date().toISOString(),
    })
    writeProjectSpaceState(created.project.id, createEmptyProjectSpaceState(localObjectRoot))
    const nextProjects = await options.refreshProjectList(created.project.id)
    if (nextProjects.length === 1) options.activateProjectState(created.project.id)
    void options.messageApi.success('已创建本地项目')
  }

  const createRemoteProject = async (projectId: string, name: string, description: string) => {
    const settingsWorkspace = options.getSettingsWorkspace()
    if (!isRemoteProjectConfigurationReady(settingsWorkspace, projectId)) {
      void options.messageApi.warning('请先完成远程数据库验证、表结构初始化和七牛 Kodo 验证')
      return
    }

    const created = await options.remoteRepository.createRemoteProject({
      id: projectId,
      name,
      description,
      databaseProvider: settingsWorkspace.databaseProfileDraft.provider,
      databaseProfileId: settingsWorkspace.selectedDatabaseProfileId,
      storageProfileId: settingsWorkspace.selectedKodoProfileId,
      now: new Date().toISOString(),
    })
    if (
      created.settings.database_provider !== 'postgresql' &&
      created.settings.database_provider !== 'mysql'
    ) {
      throw new Error('远程项目数据库类型无效。')
    }
    options.remoteDeviceBindingResolver.bindProjectToCurrentDevice(
      created.project.id,
      settingsWorkspace.selectedDatabaseProfileId,
      settingsWorkspace.selectedKodoProfileId,
    )
    await options.localRepository.createRemoteProject({
      id: created.project.id,
      name: created.project.name,
      description: created.project.description,
      databaseProvider: created.settings.database_provider,
      databaseProfileId: settingsWorkspace.selectedDatabaseProfileId,
      storageProfileId: settingsWorkspace.selectedKodoProfileId,
      now: created.project.created_at,
    })
    options.rememberRemoteProjectSettings(created.project, created.settings)
    writeProjectSpaceState(created.project.id, createEmptyProjectSpaceState(getCurrentLocalObjectRoot(options)))
    const nextProjects = await options.refreshProjectList(created.project.id)
    if (nextProjects.length === 1) options.activateProjectState(created.project.id)
    void options.messageApi.success('已创建远程项目')
  }

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
    }
    const updated = await options.remoteRepository.updateProject(projectId, input)
    if (!updated) {
      void options.messageApi.warning('远程项目不存在，无法保存连接')
      return false
    }
    options.remoteDeviceBindingResolver.bindProjectToCurrentDevice(
      projectId,
      settingsWorkspace.selectedDatabaseProfileId,
      settingsWorkspace.selectedKodoProfileId,
    )
    options.rememberRemoteProjectSettings(updated.project, updated.settings)
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
    clearProjectDeviceBinding(projectId)
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

  const migrateActiveProjectToRemote = async () => {
    const activeProjectId = options.getActiveProjectId()
    const settingsWorkspace = options.getSettingsWorkspace()
    if (options.migrationInFlightProjectIdRef.current) {
      void options.messageApi.warning('项目正在迁移，请稍候')
      return
    }
    if (!isRemoteProjectConfigurationReady(settingsWorkspace, activeProjectId)) {
      void options.messageApi.warning('请先验证远程数据库和七牛 Kodo 配置')
      return
    }

    const migrationProjectId = activeProjectId
    options.migrationInFlightProjectIdRef.current = migrationProjectId
    options.setMigratingProjectId(migrationProjectId)
    try {
      const currentSpace = options.getSpace()
      writeProjectSpaceState(migrationProjectId, currentSpace)
      const project = options.getProjects().find((item) => item.id === migrationProjectId)
      if (!project) {
        void options.messageApi.warning('当前项目不存在，无法迁移')
        return
      }
      const now = new Date().toISOString()
      options.rememberRemoteProjectSettings(project, {
        project_id: migrationProjectId,
        storage_provider: 'qiniu_kodo',
        database_provider: settingsWorkspace.databaseProfileDraft.provider,
        local_object_root: null,
        remote_database_profile_id: null,
        remote_storage_profile_id: null,
        last_verified_at: now,
        updated_at: now,
      })
      try {
        await options.storageWorkflow.syncProjectStateToStorage(project, currentSpace)
      } catch (error) {
        void options.messageApi.warning(`同步本地项目存储失败：${error instanceof Error ? error.message : String(error)}`)
        return
      }

      options.remoteDeviceBindingResolver.bindProjectToCurrentDevice(
        migrationProjectId,
        settingsWorkspace.selectedDatabaseProfileId,
        settingsWorkspace.selectedKodoProfileId,
      )

      const result = await migrateLocalProjectToRemote({
        projectId: migrationProjectId,
        localRepository: options.localRepository,
        remoteRepository: options.remoteRepository,
        remoteDatabaseProvider: settingsWorkspace.databaseProfileDraft.provider,
        remoteDatabaseProfileId: settingsWorkspace.selectedDatabaseProfileId,
        remoteStorageProfileId: settingsWorkspace.selectedKodoProfileId,
        sourceObjectStorage: options.localObjectStorage,
        remoteObjectStorage: options.remoteObjectStorage,
        assetManager: options.assetManager,
        now: new Date().toISOString(),
      })

      if (result.status === 'failed') {
        void options.messageApi.warning(`迁移到远程失败：${result.errorMessage}`)
        return
      }

      const nextProjects = await options.refreshProjectList(migrationProjectId)
      await options.activateProjectStateFromStorage(migrationProjectId, undefined, nextProjects)
      void options.messageApi.success('已迁移到远程项目存储')
    } finally {
      if (options.migrationInFlightProjectIdRef.current === migrationProjectId) {
        options.migrationInFlightProjectIdRef.current = ''
        options.setMigratingProjectId('')
      }
    }
  }

  return {
    createLocalProject,
    createRemoteProject,
    renameProject,
    updateRemoteProjectLinks,
    deleteProject,
    migrateActiveProjectToRemote,
  }
}
