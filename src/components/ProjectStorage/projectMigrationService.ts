import { createProjectStorageId } from './projectId'
import { isProjectObjectKey } from './projectStorageModel'
import { migratePersonalSpaceStateToProjectRows, type LegacyProjectRows } from './projectLegacyMigration'
import type { ProjectAssetManager, ProjectAssetResourceRef, ProjectResourceRole } from './projectAssetManager'
import type { ProjectObjectStorage } from './projectObjectStorage'
import type { ProjectRepository } from './projectSqliteRepository'
import type { Asset, ProjectCleanupTask, ProjectDatabaseProvider, ProjectStorageProvider } from './projectStorageTypes'
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

function listAssetObjectKeys(asset: Asset) {
  return [
    asset.primary_object_key,
    ...(asset.sprite_index_object_key ? [asset.sprite_index_object_key] : []),
    ...(asset.cover_object_key ? [asset.cover_object_key] : []),
  ]
}

function buildAssetResourceRef(
  projectMode: 'local' | 'remote',
  asset: Asset,
  role: ProjectResourceRole,
): ProjectAssetResourceRef | null {
  if (role === 'sprite_index') {
    if (!asset.sprite_index_resource_id || !asset.sprite_index_object_key) return null
    return {
      projectId: asset.project_id,
      projectMode,
      assetId: asset.id,
      resourceId: asset.sprite_index_resource_id,
      role,
      objectKey: asset.sprite_index_object_key,
      mimeType: asset.sprite_index_mime_type,
      sizeBytes: asset.sprite_index_size_bytes,
      hashSha256: asset.sprite_index_hash_sha256,
    }
  }
  if (role === 'cover') {
    if (!asset.cover_resource_id || !asset.cover_object_key) return null
    return {
      projectId: asset.project_id,
      projectMode,
      assetId: asset.id,
      resourceId: asset.cover_resource_id,
      role,
      objectKey: asset.cover_object_key,
      mimeType: asset.cover_mime_type,
      sizeBytes: asset.cover_size_bytes,
      hashSha256: asset.cover_hash_sha256,
    }
  }
  return {
    projectId: asset.project_id,
    projectMode,
    assetId: asset.id,
    resourceId: asset.primary_resource_id,
    role,
    objectKey: asset.primary_object_key,
    mimeType: asset.primary_mime_type,
    sizeBytes: asset.primary_size_bytes,
    hashSha256: asset.primary_hash_sha256,
  }
}

async function putAssetResourceObject(
  input: ProjectSpaceStateSyncInput,
  asset: Asset,
  role: ProjectResourceRole,
  blob: Blob,
) {
  const ref = buildAssetResourceRef(input.storageProvider === 'qiniu_kodo' ? 'remote' : 'local', asset, role)
  if (input.storageProvider === 'qiniu_kodo' && input.assetManager && ref) {
    await input.assetManager.putResource(ref, blob)
    return
  }
  const objectStorage = input.objectStorage ?? input.localObjectStorage
  if (!objectStorage) throw new Error('缺少项目对象存储。')
  await objectStorage.putObject(ref?.objectKey ?? asset.primary_object_key, blob)
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

async function readAssetCoverBlob(
  asset: PersonalSpaceAsset,
  directoryHandle?: PersonalSpaceDirectoryHandle | null,
) {
  const storedPath = asset.coverStorageResourcePath
  const resourcePath = asset.coverResourcePath
  if (directoryHandle && storedPath) {
    try {
      return await readStoredResourceBlob(directoryHandle, storedPath)
    } catch (error) {
      if (!resourcePath) throw error
    }
  }
  if (!resourcePath) throw new Error(`素材“${asset.name}”缺少封面资源文件。`)
  const response = await fetch(resourcePath)
  if (!response.ok) throw new Error(`读取素材“${asset.name}”封面失败：${response.status}`)
  return response.blob()
}

function replaceAssetInRows(rows: LegacyProjectRows, asset: Asset) {
  rows.assets = rows.assets.map((item) => (item.id === asset.id ? asset : item))
}

async function writeAssetObjects(input: ProjectSpaceStateSyncInput, rows: LegacyProjectRows) {
  const objectStorage = input.objectStorage ?? input.localObjectStorage
  if (!objectStorage && !input.assetManager) throw new Error('缺少项目对象存储。')
  for (let index = 0; index < rows.assets.length; index += 1) {
    let asset = rows.assets[index]!
    const sourceAsset = input.state.assets[index]
    if (!sourceAsset) continue

    if (!isProjectObjectKey(sourceAsset.storageResourcePaths[0]) || !isProjectObjectKey(sourceAsset.resourcePaths[0])) {
      const primaryBlob = await readAssetResourceBlob(sourceAsset, 0, input.directoryHandle)
      asset = {
        ...asset,
        primary_size_bytes: primaryBlob.size,
      }
      await putAssetResourceObject(input, asset, 'primary', primaryBlob)
    }

    if (asset.sprite_index_object_key) {
      if (!isProjectObjectKey(sourceAsset.storageResourcePaths[1]) || !isProjectObjectKey(sourceAsset.resourcePaths[1])) {
        const spriteIndexBlob = await readAssetResourceBlob(sourceAsset, 1, input.directoryHandle)
        asset = {
          ...asset,
          sprite_index_size_bytes: spriteIndexBlob.size,
        }
        await putAssetResourceObject(input, asset, 'sprite_index', spriteIndexBlob)
      }
    }

    if (asset.cover_object_key) {
      if (!isProjectObjectKey(sourceAsset.coverStorageResourcePath) || !isProjectObjectKey(sourceAsset.coverResourcePath)) {
        const coverBlob = await readAssetCoverBlob(sourceAsset, input.directoryHandle)
        asset = {
          ...asset,
          cover_size_bytes: coverBlob.size,
        }
        await putAssetResourceObject(input, asset, 'cover', coverBlob)
      }
    }

    replaceAssetInRows(rows, asset)
  }
}

export async function syncProjectSpaceStateToLocalProjectStorage(input: ProjectSpaceStateSyncInput) {
  const repository = input.repository ?? input.localRepository
  if (!repository) throw new Error('缺少项目数据库仓储。')
  const existing = await repository.getProject(input.projectId)
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

  await writeAssetObjects(input, rows)
  await repository.importProjectRows(rows)
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

async function uploadAssetResource(input: LocalToRemoteMigrationInput, asset: Asset, role: ProjectResourceRole) {
  const ref = buildAssetResourceRef('remote', asset, role)
  const objectKey = ref?.objectKey ?? (role === 'primary' ? asset.primary_object_key : null)
  if (!objectKey) return
  if (input.assetManager && ref && input.sourceObjectStorage) {
    const objectData = await input.sourceObjectStorage.getObject(objectKey)
    await input.assetManager.putResource(ref, objectData)
    return
  }
  await uploadProjectObject(input, objectKey)
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
