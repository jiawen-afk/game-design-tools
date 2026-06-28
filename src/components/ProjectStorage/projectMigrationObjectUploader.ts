import type { ProjectAssetManager, ProjectResourceRole } from './projectAssetManager'
import { buildProjectAssetResourceRef } from './projectAssetResourceRefs'
import type { ProjectObjectStorage } from './projectObjectStorage'
import type { Asset } from './projectStorageTypes'

export interface ProjectMigrationObjectUploadInput {
  uploadObject?: (objectKey: string) => Promise<void>
  sourceObjectStorage?: ProjectObjectStorage
  remoteObjectStorage?: ProjectObjectStorage
  assetManager?: ProjectAssetManager
}

async function uploadProjectObject(input: ProjectMigrationObjectUploadInput, objectKey: string) {
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

export async function uploadAssetResource(
  input: ProjectMigrationObjectUploadInput,
  asset: Asset,
  role: ProjectResourceRole,
) {
  const ref = buildProjectAssetResourceRef('remote', asset, role)
  const objectKey = ref?.objectKey ?? (role === 'primary' ? asset.primary_object_key : null)
  if (!objectKey) return
  if (input.assetManager && ref && input.sourceObjectStorage) {
    const objectData = await input.sourceObjectStorage.getObject(objectKey)
    await input.assetManager.putResource(ref, objectData)
    return
  }
  await uploadProjectObject(input, objectKey)
}
