import { createProjectStorageId } from './projectId'
import { listAssetObjectKeys } from './projectAssetResourceRefs'
import { writeAssetObjects } from './projectAssetObjectWriter'
import { migratePersonalSpaceStateToProjectRows, type LegacyProjectRows } from './projectLegacyMigration'
import { uploadAssetResource } from './projectMigrationObjectUploader'
import type { ProjectAssetManager } from './projectAssetManager'
import type { ProjectObjectStorage } from './projectObjectStorage'
import type { ProjectRepository } from './projectSqliteRepository'
import type { ProjectCleanupTask, ProjectDatabaseProvider, ProjectStorageProvider } from './projectStorageTypes'
import type { PersonalSpaceDirectoryHandle } from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import type { PersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'

export interface LocalToRemoteMigrationInput {
  projectId: string
  localRepository: ProjectRepository
  remoteRepository: ProjectRepository
  remoteDatabaseProvider?: Extract<ProjectDatabaseProvider, 'postgresql' | 'mysql'>
  remoteDatabaseProfileId?: string | null
  remoteStorageProfileId?: string | null
  uploadObject?: (objectKey: string) => Promise<void>
  sourceObjectStorage?: ProjectObjectStorage
  remoteObjectStorage?: ProjectObjectStorage
  assetManager?: ProjectAssetManager
  now: string
}

export interface ProjectSpaceStateSyncInput {
  projectId: string
  projectName: string
  localObjectRoot: string
  state: PersonalSpaceState
  repository?: ProjectRepository
  localRepository?: ProjectRepository
  objectStorage?: ProjectObjectStorage
  localObjectStorage?: ProjectObjectStorage
  assetManager?: ProjectAssetManager
  storageProvider?: ProjectStorageProvider
  databaseProvider?: ProjectDatabaseProvider
  remoteDatabaseProfileId?: string | null
  remoteStorageProfileId?: string | null
  directoryHandle?: PersonalSpaceDirectoryHandle | null
  now: string
}

export async function syncProjectSpaceStateToLocalProjectStorage(input: ProjectSpaceStateSyncInput) {
  const repository = input.repository ?? input.localRepository
  if (!repository) throw new Error('缺少项目数据库仓储。')
  const existing = await repository.getProject(input.projectId)
  const existingRows = existing ? await repository.exportProjectRows(input.projectId) : null
  const projectName = input.projectName.trim() || existing?.project.name || '默认项目'
  const localObjectRoot = input.localObjectRoot.trim()
    || existing?.settings.local_object_root
    || input.state.settings.storageDirectory
    || ''
  const syncsRemoteProject = input.storageProvider === 'qiniu_kodo'
  const rows = migratePersonalSpaceStateToProjectRows(input.state, {
    projectId: input.projectId,
    projectName,
    now: input.now,
    localObjectRoot,
    preserveSourceIds: syncsRemoteProject,
  })

  if (existing) {
    rows.project = {
      ...rows.project,
      description: existing.project.description,
      mode: existing.project.mode,
      created_at: existing.project.created_at,
    }
  }
  if (syncsRemoteProject) {
    rows.project = {
      ...rows.project,
      mode: 'remote',
    }
    rows.settings = {
      ...rows.settings,
      storage_provider: 'qiniu_kodo',
      database_provider: input.databaseProvider
        ?? existing?.settings.database_provider
        ?? 'postgresql',
      local_object_root: null,
      remote_database_profile_id: null,
      remote_storage_profile_id: null,
      last_verified_at: existing?.settings.last_verified_at ?? input.now,
      updated_at: input.now,
    }
  }

  await writeAssetObjects(input, rows, existingRows)
  await repository.importProjectRows(rows)
  return rows
}

export async function migrateLocalProjectToRemote(input: LocalToRemoteMigrationInput) {
  const sourceRows = await input.localRepository.exportProjectRows(input.projectId)
  if (!sourceRows) throw new Error('项目不存在')

  try {
    for (const asset of sourceRows.assets) {
      await uploadAssetResource(input, asset, 'primary')
      await uploadAssetResource(input, asset, 'sprite_index')
      await uploadAssetResource(input, asset, 'cover')
    }

    const migratedRows: LegacyProjectRows = {
      ...sourceRows,
      project: {
        ...sourceRows.project,
        mode: 'remote',
        updated_at: input.now,
      },
      settings: {
        ...sourceRows.settings,
        storage_provider: 'qiniu_kodo',
        database_provider: input.remoteDatabaseProvider
          ?? (sourceRows.settings.database_provider === 'sqlite' ? 'postgresql' : sourceRows.settings.database_provider),
        local_object_root: null,
        remote_database_profile_id: null,
        remote_storage_profile_id: null,
        last_verified_at: input.now,
        updated_at: input.now,
      },
    }

    await input.remoteRepository.importProjectRows(migratedRows)
    await input.localRepository.importProjectRows(migratedRows)

    return { status: 'succeeded' as const, errorMessage: '' }
  } catch (error) {
    return { status: 'failed' as const, errorMessage: error instanceof Error ? error.message : String(error) }
  }
}

export async function hardDeleteProjectWithObjects(input: {
  projectId: string
  repository: ProjectRepository
  localRepository?: ProjectRepository
  objectStorage: ProjectObjectStorage
  assetManager?: ProjectAssetManager
  storageProvider?: ProjectStorageProvider
  now: string
}) {
  const assets = await input.repository.listAssets(input.projectId)
  const objectKeys = assets.flatMap(listAssetObjectKeys)
  const deleteResult = await input.objectStorage.deleteObjects(objectKeys)
  const cleanupTasks = deleteResult.failed.map((failure): ProjectCleanupTask => ({
    id: createProjectStorageId(),
    project_id: input.projectId,
    storage_provider: input.storageProvider ?? 'local',
    object_key: failure.objectKey,
    status: 'pending',
    error_message: failure.errorMessage,
    created_at: input.now,
    updated_at: input.now,
  }))
  if (cleanupTasks.length > 0) await input.repository.addCleanupTasks(cleanupTasks)
  await input.repository.deleteProject(input.projectId)
  if (input.localRepository && input.localRepository !== input.repository) {
    await input.localRepository.deleteProject(input.projectId)
  }
  await input.assetManager?.deleteProjectCache(input.projectId)

  return {
    deletedProject: true,
    cleanupTasks,
  }
}
