import { readStoredResourceBlob, type PersonalSpaceDirectoryHandle } from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import type { PersonalSpaceAsset, PersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
import type { ProjectAssetManager, ProjectResourceRole } from './projectAssetManager'
import {
  copyAssetResourceFields,
  resourceMatchesExistingBlob,
  setAssetResourceBlobMetadata,
} from './projectAssetResourceMetadata'
import { assetObjectKeyForRole, buildProjectAssetResourceRef } from './projectAssetResourceRefs'
import type { LegacyProjectRows } from './projectLegacyMigration'
import type { ProjectObjectStorage } from './projectObjectStorage'
import { isProjectObjectKey } from './projectStorageModel'
import type { Asset, ProjectStorageProvider } from './projectStorageTypes'

export interface ProjectAssetObjectWriteInput {
  state: PersonalSpaceState
  objectStorage?: ProjectObjectStorage
  localObjectStorage?: ProjectObjectStorage
  assetManager?: ProjectAssetManager
  storageProvider?: ProjectStorageProvider
  directoryHandle?: PersonalSpaceDirectoryHandle | null
}

interface AssetResourceSyncPlan {
  role: ProjectResourceRole
  shouldSync: (asset: Asset) => boolean
  hasProjectObjectSource: (asset: PersonalSpaceAsset) => boolean
  readBlob: (
    asset: PersonalSpaceAsset,
    directoryHandle?: PersonalSpaceDirectoryHandle | null,
  ) => Promise<Blob>
}

async function putAssetResourceObject(
  input: ProjectAssetObjectWriteInput,
  asset: Asset,
  role: ProjectResourceRole,
  blob: Blob,
) {
  const ref = buildProjectAssetResourceRef(input.storageProvider === 'qiniu_kodo' ? 'remote' : 'local', asset, role)
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

const assetResourceSyncPlans: AssetResourceSyncPlan[] = [
  {
    role: 'primary',
    shouldSync: () => true,
    hasProjectObjectSource: (asset) => (
      isProjectObjectKey(asset.storageResourcePaths[0])
      && isProjectObjectKey(asset.resourcePaths[0])
    ),
    readBlob: (asset, directoryHandle) => readAssetResourceBlob(asset, 0, directoryHandle),
  },
  {
    role: 'sprite_index',
    shouldSync: (asset) => Boolean(asset.sprite_index_object_key),
    hasProjectObjectSource: (asset) => (
      isProjectObjectKey(asset.storageResourcePaths[1])
      && isProjectObjectKey(asset.resourcePaths[1])
    ),
    readBlob: (asset, directoryHandle) => readAssetResourceBlob(asset, 1, directoryHandle),
  },
  {
    role: 'cover',
    shouldSync: (asset) => Boolean(asset.cover_object_key),
    hasProjectObjectSource: (asset) => (
      isProjectObjectKey(asset.coverStorageResourcePath)
      && isProjectObjectKey(asset.coverResourcePath)
    ),
    readBlob: readAssetCoverBlob,
  },
]

function replaceAssetInRows(rows: LegacyProjectRows, asset: Asset) {
  rows.assets = rows.assets.map((item) => (item.id === asset.id ? asset : item))
}

function normalizeNullable(value: string | null | undefined) {
  return value?.trim() || null
}

function canReuseExistingAssetResources(asset: Asset, existingAsset: Asset | undefined) {
  if (!existingAsset) return false
  return asset.kind === existingAsset.kind
    && normalizeNullable(asset.source_key) === normalizeNullable(existingAsset.source_key)
}

async function hashBlobSha256(blob: Blob) {
  try {
    if (!globalThis.crypto?.subtle) return null
    const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

async function writeAssetResourceObject(
  input: ProjectAssetObjectWriteInput,
  asset: Asset,
  existingAsset: Asset | undefined,
  role: ProjectResourceRole,
  blob: Blob,
) {
  const hashSha256 = await hashBlobSha256(blob)
  if (existingAsset && resourceMatchesExistingBlob(existingAsset, role, blob, hashSha256)) {
    return copyAssetResourceFields(asset, existingAsset, role)
  }
  const nextAsset = setAssetResourceBlobMetadata(asset, role, blob, hashSha256)
  await putAssetResourceObject(input, nextAsset, role, blob)
  return nextAsset
}

async function syncAssetResourceObject(
  input: ProjectAssetObjectWriteInput,
  asset: Asset,
  sourceAsset: PersonalSpaceAsset,
  existingAsset: Asset | undefined,
  plan: AssetResourceSyncPlan,
) {
  if (!plan.shouldSync(asset)) return asset
  if (!plan.hasProjectObjectSource(sourceAsset)) {
    const blob = await plan.readBlob(sourceAsset, input.directoryHandle)
    return writeAssetResourceObject(input, asset, existingAsset, plan.role, blob)
  }
  if (existingAsset && assetObjectKeyForRole(asset, plan.role) === assetObjectKeyForRole(existingAsset, plan.role)) {
    return copyAssetResourceFields(asset, existingAsset, plan.role)
  }
  return asset
}

export async function writeAssetObjects(
  input: ProjectAssetObjectWriteInput,
  rows: LegacyProjectRows,
  existingRows?: LegacyProjectRows | null,
) {
  const objectStorage = input.objectStorage ?? input.localObjectStorage
  if (!objectStorage && !input.assetManager) throw new Error('缺少项目对象存储。')
  const existingAssets = new Map((existingRows?.assets ?? []).map((asset) => [asset.id, asset]))
  for (let index = 0; index < rows.assets.length; index += 1) {
    let asset = rows.assets[index]!
    const sourceAsset = input.state.assets[index]
    if (!sourceAsset) continue
    const existingAsset = existingAssets.get(asset.id)
    const reusableExistingAsset = canReuseExistingAssetResources(asset, existingAsset) ? existingAsset : undefined

    for (const plan of assetResourceSyncPlans) {
      asset = await syncAssetResourceObject(input, asset, sourceAsset, reusableExistingAsset, plan)
    }

    replaceAssetInRows(rows, asset)
  }
}
