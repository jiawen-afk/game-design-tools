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
  LegacyProjectRows,
} from '../ProjectStorage/projectLegacyMigration'
import {
  restoreProjectRowsToPersonalSpaceState,
} from '../ProjectStorage/projectLegacyMigration'
import type {
  ProjectObjectStorage,
} from '../ProjectStorage/projectObjectStorage'
import type {
  Project,
  ProjectDatabaseProvider,
  ProjectSettings,
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
  createEmptyProjectSpaceState,
  readCachedProjectSpaceState,
  writeCurrentProjectSpaceState,
  writeProjectSpaceState,
} from './projectSpaceState'
import { formatRemoteProjectReadError } from './remoteProjectMessages'

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

export interface ProjectSpaceStateLoadOptions {
  projectId: string
  project?: Project
  fallbackState?: PersonalSpaceState
  storage?: Storage
  localRepository: Pick<ProjectRepository, 'importProjectRows' | 'exportProjectRows'>
  remoteRepository: Pick<ProjectRepository, 'exportProjectRows'>
  ensureRemoteSettings?: (projectId: string) => Promise<void> | void
  onRemoteProjectLoaded?: (
    project: Project,
    settings: ProjectSettings,
    assetObjectKeys: string[],
  ) => Promise<void> | void
  onWarning?: (message: string) => void
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

export function projectAssetObjectKeys(rows: LegacyProjectRows) {
  return rows.assets.flatMap((asset) => [
    asset.primary_object_key,
    asset.sprite_index_object_key,
    asset.cover_object_key,
  ]).filter((objectKey): objectKey is string => Boolean(objectKey))
}

function formatLocalCacheSyncError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export async function loadProjectSpaceStateFromStorage(
  options: ProjectSpaceStateLoadOptions,
): Promise<PersonalSpaceState | null> {
  const storage = options.storage ?? localStorage
  const fallbackSpace = options.fallbackState ?? createEmptyProjectSpaceState()
  const project = options.project
  if (project?.mode === 'remote') {
    try {
      await options.ensureRemoteSettings?.(options.projectId)
      const remoteRows = await options.remoteRepository.exportProjectRows(options.projectId)
      let localCacheSyncError: unknown | null = null
      if (remoteRows) {
        await options.onRemoteProjectLoaded?.(
          remoteRows.project,
          remoteRows.settings,
          projectAssetObjectKeys(remoteRows),
        )
        try {
          await options.localRepository.importProjectRows(remoteRows)
        } catch (error) {
          localCacheSyncError = error
        }
      }
      const nextSpace = remoteRows
        ? restoreProjectRowsToPersonalSpaceState(remoteRows)
        : readCachedProjectSpaceState(options.projectId, storage)
      if (nextSpace) writeProjectSpaceState(options.projectId, nextSpace, storage)
      if (localCacheSyncError) {
        options.onWarning?.(
          `远程项目数据已读取，但本地项目缓存同步失败：${formatLocalCacheSyncError(localCacheSyncError)}`,
        )
      } else if (!remoteRows) {
        options.onWarning?.(
          nextSpace
            ? '远程项目数据读取失败，已使用本地项目缓存'
            : '远程项目数据读取失败，且当前设备没有可用的项目缓存。请检查远程数据库连接后重试。',
        )
      }
      return nextSpace
    } catch (error) {
      const cachedSpace = readCachedProjectSpaceState(options.projectId, storage)
      const errorMessage = formatRemoteProjectReadError(error, project)
      options.onWarning?.(
        cachedSpace
          ? `远程项目数据读取失败，已使用本地项目缓存：${errorMessage}`
          : `远程项目数据读取失败，且当前设备没有可用的项目缓存：${errorMessage}`,
      )
      return cachedSpace
    }
  }

  if (project?.mode === 'local') {
    try {
      const localRows = await options.localRepository.exportProjectRows(options.projectId)
      const nextSpace = localRows
        ? restoreProjectRowsToPersonalSpaceState(localRows)
        : readCachedProjectSpaceState(options.projectId, storage) ?? fallbackSpace
      if (nextSpace) writeProjectSpaceState(options.projectId, nextSpace, storage)
      return nextSpace
    } catch (error) {
      const cachedSpace = readCachedProjectSpaceState(options.projectId, storage)
      if (cachedSpace) {
        options.onWarning?.(
          `本地项目数据读取失败，已使用本地项目缓存：${formatLocalCacheSyncError(error)}`,
        )
        return cachedSpace
      }
      options.onWarning?.(
        `本地项目数据读取失败，已使用空项目空间：${formatLocalCacheSyncError(error)}`,
      )
      return fallbackSpace
    }
  }

  return readCachedProjectSpaceState(options.projectId, storage) ?? fallbackSpace
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
