import type { LegacyProjectRows } from '../ProjectStorage/projectLegacyMigration'
import { restoreProjectRowsToPersonalSpaceState } from '../ProjectStorage/projectLegacyMigration'
import type { Project, ProjectSettings } from '../ProjectStorage/projectStorageTypes'
import type { ProjectRepository } from '../ProjectStorage/projectSqliteRepository'
import type { PersonalSpaceState } from './personalSpaceModel'
import {
  createEmptyProjectSpaceState,
  readCachedProjectSpaceState,
  writeProjectSpaceState,
} from './projectSpaceState'
import { formatRemoteProjectReadError } from './remoteProjectMessages'

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
