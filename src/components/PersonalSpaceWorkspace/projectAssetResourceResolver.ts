import {
  isProjectObjectKey,
  resourceIdFromProjectObjectKey,
  type ProjectAssetManager,
  type ProjectAssetResourceRef,
  type ProjectMode,
  type ProjectObjectStorage,
} from '../ProjectStorage'
import type { PersonalSpaceAsset } from './personalSpaceModel'
import {
  getPersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  readStoredResourceBlob,
  setPersonalSpaceDirectoryHandle,
  type PersonalSpaceDirectoryHandle,
} from './personalSpaceFileStorage'

function canCreateObjectUrl() {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
}

export interface ProjectAssetResourceResolverOptions {
  directoryHandle?: PersonalSpaceDirectoryHandle | null
  projectObjectStorage?: ProjectObjectStorage | null
  projectAssetManager?: ProjectAssetManager | null
  resourceRef?: ProjectAssetResourceRef | null
}

export interface ResolvedProjectAssetResource {
  source: string
  objectUrl?: string
  blob?: Blob
}

async function readDirectoryResourceBlob(
  storedPath: string,
  directoryHandle?: PersonalSpaceDirectoryHandle | null,
) {
  const handle = directoryHandle
    ?? getPersonalSpaceDirectoryHandle()
    ?? await loadPersistedPersonalSpaceDirectoryHandle()
  if (!handle) return null
  setPersonalSpaceDirectoryHandle(handle)
  return readStoredResourceBlob(handle, storedPath)
}

function createBlobSource(blob: Blob): ResolvedProjectAssetResource {
  if (!canCreateObjectUrl()) return { source: '', blob }
  const objectUrl = URL.createObjectURL(blob)
  return { source: objectUrl, objectUrl, blob }
}

async function readUrlResourceBlob(path: string) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`读取资源失败：${response.status}`)
  return response.blob()
}

export function buildProjectAssetResourceRef(input: {
  asset: PersonalSpaceAsset
  resourceIndex: number
  projectId: string
  projectMode: ProjectMode
}): ProjectAssetResourceRef | null {
  const objectKey = input.asset.storageResourcePaths[input.resourceIndex] ?? input.asset.resourcePaths[input.resourceIndex] ?? ''
  if (!isProjectObjectKey(objectKey)) return null
  const role = input.resourceIndex === 1 ? 'sprite_index' : 'primary'
  return {
    projectId: input.projectId,
    projectMode: input.projectMode,
    assetId: input.asset.id,
    resourceId: input.asset.projectResourceIds?.[input.resourceIndex] ?? resourceIdFromProjectObjectKey(objectKey),
    role,
    objectKey,
    mimeType: input.asset.projectResourceMimeTypes?.[input.resourceIndex] ?? null,
    sizeBytes: input.asset.projectResourceSizes?.[input.resourceIndex] ?? null,
    hashSha256: input.asset.projectResourceHashes?.[input.resourceIndex] ?? null,
  }
}

export async function readProjectAssetResourceBlob(
  storedPath: string | undefined,
  resourcePath: string | undefined,
  options: ProjectAssetResourceResolverOptions = {},
) {
  if (options.projectAssetManager && options.resourceRef) {
    return options.projectAssetManager.getResourceBlob(options.resourceRef)
  }

  const objectKey = isProjectObjectKey(storedPath) ? storedPath : isProjectObjectKey(resourcePath) ? resourcePath : ''
  if (objectKey) {
    if (!options.projectObjectStorage) throw new Error('缺少项目对象存储，无法读取项目素材。')
    return options.projectObjectStorage.getObject(objectKey)
  }

  if (storedPath) {
    try {
      const blob = await readDirectoryResourceBlob(storedPath, options.directoryHandle)
      if (blob) return blob
    } catch (error) {
      if (!resourcePath) throw error
    }
  }

  if (!resourcePath) throw new Error('资源路径不存在')
  return readUrlResourceBlob(resourcePath)
}

export async function resolveProjectAssetResourceSource(
  storedPath: string | undefined,
  resourcePath: string | undefined,
  options: ProjectAssetResourceResolverOptions = {},
): Promise<ResolvedProjectAssetResource | null> {
  const hasProjectObjectKey = isProjectObjectKey(storedPath) || isProjectObjectKey(resourcePath)
  try {
    const blob = await readProjectAssetResourceBlob(storedPath, resourcePath, options)
    const blobSource = createBlobSource(blob)
    if (blobSource.source) return blobSource
  } catch {
    if (hasProjectObjectKey) return null
    // Fall back to a directly playable URL/path below when object or directory reads fail.
  }

  return resourcePath ? { source: resourcePath } : null
}
