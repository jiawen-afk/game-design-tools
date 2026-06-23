import { createProjectStorageId } from './projectId'
import type { LegacyProjectRows } from './projectLegacyMigration'
import type { ProjectObjectStorage } from './projectObjectStorage'
import type { ProjectRepository } from './projectSqliteRepository'
import type { Asset, CleanupTaskStatus, ProjectStorageProvider } from './projectStorageTypes'

export interface LocalToRemoteMigrationInput {
  projectId: string
  localRepository: ProjectRepository
  remoteRepository: ProjectRepository
  uploadObject: (objectKey: string) => Promise<void>
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

function emptyMigratedProjectRows(rows: LegacyProjectRows): LegacyProjectRows {
  return {
    project: rows.project,
    settings: rows.settings,
    assetGroups: [],
    assets: rows.assets,
    characters: [],
    characterAssetLinks: [],
    storyboardGroups: [],
    storyboardVoiceEntries: [],
    assetRelations: [],
  }
}

export async function migrateLocalProjectToRemote(input: LocalToRemoteMigrationInput) {
  const source = await input.localRepository.getProject(input.projectId)
  if (!source) throw new Error('项目不存在')
  const assets = await input.localRepository.listAssets(input.projectId)

  try {
    for (const asset of assets) {
      for (const objectKey of listAssetObjectKeys(asset)) {
        await input.uploadObject(objectKey)
      }
    }

    await input.remoteRepository.importProjectRows(emptyMigratedProjectRows({
      project: {
        ...source.project,
        mode: 'remote',
        updated_at: input.now,
      },
      settings: {
        ...source.settings,
        storage_provider: 'qiniu_kodo',
        database_provider: source.settings.database_provider === 'sqlite' ? 'postgresql' : source.settings.database_provider,
        local_object_root: null,
        updated_at: input.now,
      },
      assetGroups: [],
      assets,
      characters: [],
      characterAssetLinks: [],
      storyboardGroups: [],
      storyboardVoiceEntries: [],
      assetRelations: [],
    }))

    return { status: 'succeeded' as const, errorMessage: '' }
  } catch (error) {
    return { status: 'failed' as const, errorMessage: error instanceof Error ? error.message : String(error) }
  }
}

export async function hardDeleteProjectWithObjects(input: {
  projectId: string
  repository: ProjectRepository
  objectStorage: ProjectObjectStorage
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
      storage_provider: 'local',
      object_key: failure.objectKey,
      status: 'pending',
      error_message: failure.errorMessage,
      created_at: input.now,
      updated_at: input.now,
    })),
  }
}
