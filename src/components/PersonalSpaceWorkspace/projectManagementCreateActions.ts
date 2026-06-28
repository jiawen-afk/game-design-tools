import type { ProjectManagementActionsOptions } from './projectManagementActions'
import { isRemoteProjectConfigurationReady } from './projectManagementModel'
import { createEmptyProjectSpaceState, writeProjectSpaceState } from './projectSpaceState'

function getCurrentLocalObjectRoot(options: ProjectManagementActionsOptions) {
  const settingsWorkspace = options.getSettingsWorkspace()
  const space = options.getSpace()
  return settingsWorkspace.draftStorageDirectory || space.settings.storageDirectory || ''
}

export function createProjectManagementCreateActions(options: ProjectManagementActionsOptions) {
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
    await options.remoteDeviceBindingResolver.bindProjectToCurrentDevice(
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

  return {
    createLocalProject,
    createRemoteProject,
  }
}
