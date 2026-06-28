import { migrateLocalProjectToRemote } from '../ProjectStorage'
import { isRemoteProjectConfigurationReady } from './projectManagementModel'
import type { ProjectManagementActionsOptions } from './projectManagementActions'
import { writeProjectSpaceState } from './projectSpaceState'

export function createProjectManagementMigrationAction(options: ProjectManagementActionsOptions) {
  return async function migrateActiveProjectToRemote() {
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

      await options.remoteDeviceBindingResolver.bindProjectToCurrentDevice(
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
}
