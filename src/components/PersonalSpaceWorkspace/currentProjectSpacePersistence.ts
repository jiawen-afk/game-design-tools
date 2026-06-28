import {
  readActiveProjectId,
} from '../ProjectStorage/projectActiveProject'
import {
  readProjectDeviceBinding,
} from '../ProjectStorage/projectDeviceBindings'
import {
  createDesktopLocalProjectRepository,
} from '../ProjectStorage/projectLocalRepositoryProxy'
import {
  createDesktopRemoteProjectRepository,
} from '../ProjectStorage/projectRemoteRepositoryProxy'
import {
  createDesktopLocalProjectObjectStorage,
} from '../ProjectStorage/projectLocalObjectStorage'
import {
  createDesktopKodoProjectObjectStorage,
} from '../ProjectStorage/projectKodoObjectStorage'
import {
  createDesktopProjectAssetCacheStorage,
  createProjectAssetManager,
  type ProjectAssetManager,
} from '../ProjectStorage/projectAssetManager'
import {
  syncProjectSpaceStateToLocalProjectStorage,
} from '../ProjectStorage/projectMigrationService'
import type {
  ProjectObjectStorage,
} from '../ProjectStorage/projectObjectStorage'
import type {
  Project,
  ProjectDatabaseProvider,
} from '../ProjectStorage/projectStorageTypes'
import type {
  ProjectRepository,
  ProjectWithSettings,
} from '../ProjectStorage/projectSqliteRepository'
import type { PersonalSpaceState } from './personalSpaceModel'
import {
  getPersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
  type PersonalSpaceDirectoryHandle,
} from './personalSpaceFileStorage'
import {
  writeCurrentProjectSpaceState,
} from './projectSpaceState'
export {
  loadProjectSpaceStateFromStorage,
  projectAssetObjectKeys,
} from './currentProjectSpaceStateLoader'
export type { ProjectSpaceStateLoadOptions } from './currentProjectSpaceStateLoader'

export interface CurrentProjectSpacePersistenceOptions {
  storage?: Storage
  localRepository?: ProjectRepository
  remoteRepository?: ProjectRepository
  localObjectStorage?: ProjectObjectStorage
  remoteObjectStorage?: ProjectObjectStorage
  assetManager?: ProjectAssetManager
  getDirectoryHandle?: () => PersonalSpaceDirectoryHandle | null | Promise<PersonalSpaceDirectoryHandle | null>
  now?: () => string
}

export interface CurrentProjectSpacePersistenceResult {
  projectId: string
  projectMode: Project['mode'] | ''
  synced: boolean
  syncError: unknown | null
}

function databaseProfileIdForProject(projectId: string, storage: Storage) {
  return readProjectDeviceBinding(projectId, storage)?.databaseProfileId ?? ''
}

function storageProfileIdForProject(projectId: string, storage: Storage) {
  return readProjectDeviceBinding(projectId, storage)?.storageProfileId ?? ''
}

function remoteDatabaseProvider(settingsProvider?: ProjectDatabaseProvider | null): Extract<ProjectDatabaseProvider, 'postgresql' | 'mysql'> {
  return settingsProvider === 'mysql' ? 'mysql' : 'postgresql'
}

async function defaultDirectoryHandle() {
  const current = getPersonalSpaceDirectoryHandle()
  if (current) return current
  const persisted = await loadPersistedPersonalSpaceDirectoryHandle()
  if (persisted) setPersonalSpaceDirectoryHandle(persisted)
  return persisted
}

function createDefaultRepositories(storage: Storage, activeProjectId: string) {
  const localRepository = createDesktopLocalProjectRepository()
  const remoteRepository = createDesktopRemoteProjectRepository((projectId) => (
    databaseProfileIdForProject(projectId || activeProjectId, storage)
  ))
  return { localRepository, remoteRepository }
}

function createDefaultObjectStorage(storage: Storage, activeProjectId: string) {
  const localObjectStorage = createDesktopLocalProjectObjectStorage()
  const remoteObjectStorage = createDesktopKodoProjectObjectStorage(() => (
    storageProfileIdForProject(activeProjectId, storage)
  ))
  return { localObjectStorage, remoteObjectStorage }
}

async function findActiveProject(
  activeProjectId: string,
  localRepository: ProjectRepository,
  remoteRepository: ProjectRepository,
): Promise<ProjectWithSettings | null> {
  const localProject = await localRepository.getProject(activeProjectId)
  if (localProject) return localProject
  return remoteRepository.getProject(activeProjectId)
}

export async function persistCurrentProjectSpaceState(
  state: PersonalSpaceState,
  options: CurrentProjectSpacePersistenceOptions = {},
): Promise<CurrentProjectSpacePersistenceResult> {
  const storage = options.storage ?? localStorage
  writeCurrentProjectSpaceState(state, storage)

  const activeProjectId = readActiveProjectId(storage)
  if (!activeProjectId) {
    return { projectId: '', projectMode: '', synced: false, syncError: null }
  }

  const repositories = createDefaultRepositories(storage, activeProjectId)
  const objectStorage = createDefaultObjectStorage(storage, activeProjectId)
  const localRepository = options.localRepository ?? repositories.localRepository
  const remoteRepository = options.remoteRepository ?? repositories.remoteRepository
  const localObjectStorage = options.localObjectStorage ?? objectStorage.localObjectStorage
  const remoteObjectStorage = options.remoteObjectStorage ?? objectStorage.remoteObjectStorage
  const assetManager = options.assetManager ?? createProjectAssetManager({
    localObjectStorage,
    remoteObjectStorage,
    cacheStorage: createDesktopProjectAssetCacheStorage(),
  })
  const getDirectoryHandle = options.getDirectoryHandle ?? defaultDirectoryHandle
  const now = options.now?.() ?? new Date().toISOString()

  try {
    const activeProject = await findActiveProject(activeProjectId, localRepository, remoteRepository)
    if (!activeProject) {
      return { projectId: activeProjectId, projectMode: '', synced: false, syncError: null }
    }
    const directoryHandle = await getDirectoryHandle()
    if (activeProject.project.mode === 'remote') {
      await syncProjectSpaceStateToLocalProjectStorage({
        projectId: activeProject.project.id,
        projectName: activeProject.project.name,
        localObjectRoot: '',
        state,
        repository: remoteRepository,
        objectStorage: remoteObjectStorage,
        assetManager,
        storageProvider: 'qiniu_kodo',
        databaseProvider: remoteDatabaseProvider(activeProject.settings.database_provider),
        directoryHandle,
        now,
      })
    } else {
      await syncProjectSpaceStateToLocalProjectStorage({
        projectId: activeProject.project.id,
        projectName: activeProject.project.name,
        localObjectRoot: activeProject.settings.local_object_root ?? state.settings.storageDirectory,
        state,
        localRepository,
        localObjectStorage,
        directoryHandle,
        now,
      })
    }
    return {
      projectId: activeProject.project.id,
      projectMode: activeProject.project.mode,
      synced: true,
      syncError: null,
    }
  } catch (error) {
    return {
      projectId: activeProjectId,
      projectMode: '',
      synced: false,
      syncError: error,
    }
  }
}
