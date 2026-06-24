import type {
  Project,
  ProjectAssetManager,
  ProjectDatabaseProvider,
  ProjectObjectStorage,
  ProjectRepository,
} from '../ProjectStorage'
import { syncProjectSpaceStateToLocalProjectStorage } from '../ProjectStorage'
import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'
import type { PersonalSpaceState } from './personalSpaceModel'

export interface RemoteProjectSettingsSnapshot {
  database_provider: ProjectDatabaseProvider
}

export interface ProjectStorageWorkflowOptions {
  localRepository: ProjectRepository
  remoteRepository: ProjectRepository
  localObjectStorage: ProjectObjectStorage
  remoteObjectStorage: ProjectObjectStorage
  assetManager: ProjectAssetManager
  getRemoteSettings: (projectId: string) => RemoteProjectSettingsSnapshot
  ensureRemoteSettings: (projectId: string) => Promise<void>
  getDirectoryHandle: () => PersonalSpaceDirectoryHandle | null
  getLocalObjectRoot: (state: PersonalSpaceState) => string
  now?: () => string
}

export function createProjectStorageWorkflow(options: ProjectStorageWorkflowOptions) {
  const now = options.now ?? (() => new Date().toISOString())

  function repositoryForProject(project?: Project | null) {
    return project?.mode === 'remote' ? options.remoteRepository : options.localRepository
  }

  function objectStorageForProject(project?: Project | null) {
    return project?.mode === 'remote' ? options.remoteObjectStorage : options.localObjectStorage
  }

  function projectReadOptionsForProject(project?: Project | null) {
    return {
      projectObjectStorage: objectStorageForProject(project),
      projectAssetManager: options.assetManager,
      projectId: project?.id,
      projectMode: project?.mode,
    }
  }

  async function syncProjectStateToStorage(project: Project, state: PersonalSpaceState) {
    if (project.mode === 'remote') {
      await options.ensureRemoteSettings(project.id)
      const remoteSettings = options.getRemoteSettings(project.id)
      await syncProjectSpaceStateToLocalProjectStorage({
        projectId: project.id,
        projectName: project.name,
        localObjectRoot: '',
        state,
        repository: options.remoteRepository,
        objectStorage: options.remoteObjectStorage,
        assetManager: options.assetManager,
        storageProvider: 'qiniu_kodo',
        databaseProvider: remoteSettings.database_provider,
        remoteDatabaseProfileId: null,
        remoteStorageProfileId: null,
        directoryHandle: options.getDirectoryHandle(),
        now: now(),
      })
      return
    }

    await syncProjectSpaceStateToLocalProjectStorage({
      projectId: project.id,
      projectName: project.name,
      localObjectRoot: options.getLocalObjectRoot(state),
      state,
      localRepository: options.localRepository,
      localObjectStorage: options.localObjectStorage,
      directoryHandle: options.getDirectoryHandle(),
      now: now(),
    })
  }

  return {
    objectStorageForProject,
    projectReadOptionsForProject,
    repositoryForProject,
    syncProjectStateToStorage,
  }
}
