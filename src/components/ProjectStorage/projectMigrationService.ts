import { createProjectStorageId } from './projectId'
import { migratePersonalSpaceStateToProjectRows, type LegacyProjectRows } from './projectLegacyMigration'
import type { ProjectObjectStorage } from './projectObjectStorage'
import type { ProjectRepository } from './projectSqliteRepository'
import type { Asset, CleanupTaskStatus, ProjectDatabaseProvider, ProjectStorageProvider } from './projectStorageTypes'
import { readStoredResourceBlob, type PersonalSpaceDirectoryHandle } from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import type { PersonalSpaceAsset, PersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'

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
  now: string
}

export interface ProjectSpaceStateSyncInput {
  projectId: string
  projectName: string
  localObjectRoot: string
  state: PersonalSpaceState
  localRepository: ProjectRepository
  localObjectStorage: ProjectObjectStorage
  directoryHandle?: PersonalSpaceDirectoryHandle | null
  now: string
}

export interface ProjectCleanupTask {
  id: string
  project_id: string
  storage_provider: ProjectStorageProvider
  object_key: string
  status: CleanupTaskStatus
  error_message: string
  created_at: string
  updated_at: string
}

function listAssetObjectKeys(asset: Asset) {
  return [
    asset.primary_object_key,
    ...(asset.sprite_index_object_key ? [asset.sprite_index_object_key] : []),
  ]
}

async function readAssetResourceBlob(
  asset: PersonalSpaceAsset,
  resourceIndex: number,
  directoryHandle?: PersonalSpaceDirectoryHandle | null,
) {
  const storedPath = asset.storageResourcePaths[resourceIndex]
  const resourcePath = asset.resourcePaths[resourceIndex]
  if (directoryHandle && storedPath) {
    try {
      return await readStoredResourceBlob(directoryHandle, storedPath)
    } catch (error) {
      if (!resourcePath) throw error
    }
  }
  if (!resourcePath) throw new Error(`素材“${asset.name}”缺少第 ${resourceIndex + 1} 个资源文件。`)
  const response = await fetch(resourcePath)
  if (!response.ok) throw new Error(`读取素材“${asset.name}”失败：${response.status}`)
  return response.blob()
}

function replaceAssetInRows(rows: LegacyProjectRows, asset: Asset) {
  rows.assets = rows.assets.map((item) => (item.id === asset.id ? asset : item))
}

async function writeAssetObjects(input: ProjectSpaceStateSyncInput, rows: LegacyProjectRows) {
  for (let index = 0; index < rows.assets.length; index += 1) {
    let asset = rows.assets[index]!
    const sourceAsset = input.state.assets[index]
    if (!sourceAsset) continue

    const primaryBlob = await readAssetResourceBlob(sourceAsset, 0, input.directoryHandle)
    await input.localObjectStorage.putObject(asset.primary_object_key, primaryBlob)
    asset = {
      ...asset,
      primary_size_bytes: primaryBlob.size,
    }

    if (asset.sprite_index_object_key) {
      const spriteIndexBlob = await readAssetResourceBlob(sourceAsset, 1, input.directoryHandle)
      await input.localObjectStorage.putObject(asset.sprite_index_object_key, spriteIndexBlob)
      asset = {
        ...asset,
        sprite_index_size_bytes: spriteIndexBlob.size,
      }
    }

    replaceAssetInRows(rows, asset)
  }
}

export async function syncProjectSpaceStateToLocalProjectStorage(input: ProjectSpaceStateSyncInput) {
  const existing = await input.localRepository.getProject(input.projectId)
  const projectName = input.projectName.trim() || existing?.project.name || '默认项目'
  const localObjectRoot = input.localObjectRoot.trim()
    || existing?.settings.local_object_root
    || input.state.settings.storageDirectory
    || ''
  const rows = migratePersonalSpaceStateToProjectRows(input.state, {
    projectId: input.projectId,
    projectName,
    now: input.now,
    localObjectRoot,
  })

  if (existing) {
    rows.project = {
      ...rows.project,
      description: existing.project.description,
      created_at: existing.project.created_at,
    }
  }

  await writeAssetObjects(input, rows)
  await input.localRepository.importProjectRows(rows)
  return rows
}

async function uploadProjectObject(input: LocalToRemoteMigrationInput, objectKey: string) {
  if (input.sourceObjectStorage && input.remoteObjectStorage) {
    const objectData = await input.sourceObjectStorage.getObject(objectKey)
    await input.remoteObjectStorage.putObject(objectKey, objectData)
    return
  }
  if (input.uploadObject) {
    await input.uploadObject(objectKey)
    return
  }
  throw new Error('缺少项目对象迁移上传器。')
}

export async function migrateLocalProjectToRemote(input: LocalToRemoteMigrationInput) {
  const sourceRows = await input.localRepository.exportProjectRows(input.projectId)
  if (!sourceRows) throw new Error('项目不存在')

  try {
    for (const asset of sourceRows.assets) {
      for (const objectKey of listAssetObjectKeys(asset)) {
        await uploadProjectObject(input, objectKey)
      }
    }

    await input.remoteRepository.importProjectRows({
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
        remote_database_profile_id: input.remoteDatabaseProfileId ?? sourceRows.settings.remote_database_profile_id,
        remote_storage_profile_id: input.remoteStorageProfileId ?? sourceRows.settings.remote_storage_profile_id,
        last_verified_at: input.now,
        updated_at: input.now,
      },
    })

    return { status: 'succeeded' as const, errorMessage: '' }
  } catch (error) {
    return { status: 'failed' as const, errorMessage: error instanceof Error ? error.message : String(error) }
  }
}

export async function hardDeleteProjectWithObjects(input: {
  projectId: string
  repository: ProjectRepository
  objectStorage: ProjectObjectStorage
  storageProvider?: ProjectStorageProvider
  now: string
}) {
  const assets = await input.repository.listAssets(input.projectId)
  const objectKeys = assets.flatMap(listAssetObjectKeys)
  const deleteResult = await input.objectStorage.deleteObjects(objectKeys)
  await input.repository.deleteProject(input.projectId)

  return {
    deletedProject: true,
    cleanupTasks: deleteResult.failed.map((failure): ProjectCleanupTask => ({
      id: createProjectStorageId(),
      project_id: input.projectId,
      storage_provider: input.storageProvider ?? 'local',
      object_key: failure.objectKey,
      status: 'pending',
      error_message: failure.errorMessage,
      created_at: input.now,
      updated_at: input.now,
    })),
  }
}
