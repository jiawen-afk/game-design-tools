import type { ProjectObjectStorage } from './projectObjectStorage'
import type { ProjectMode } from './projectStorageTypes'
import type { ProjectAssetCacheStorage } from './projectAssetCacheStorage'
export {
  createDesktopProjectAssetCacheStorage,
  createMemoryProjectAssetCacheStorage,
  type ProjectAssetCacheStorage,
} from './projectAssetCacheStorage'

export type ProjectResourceRole = 'primary' | 'sprite_index' | 'cover'

export interface ProjectAssetResourceRef {
  projectId: string
  projectMode: ProjectMode
  assetId: string
  resourceId: string
  role: ProjectResourceRole
  objectKey: string
  mimeType?: string | null
  sizeBytes?: number | null
  hashSha256?: string | null
}

export interface ResolvedProjectAssetResourceSource {
  source: string
  objectUrl?: string
  blob?: Blob
}

export interface ProjectAssetManager {
  putResource(ref: ProjectAssetResourceRef, blob: Blob): Promise<void>
  getResourceBlob(ref: ProjectAssetResourceRef): Promise<Blob>
  resolveResourceSource(ref: ProjectAssetResourceRef): Promise<ResolvedProjectAssetResourceSource>
  deleteResources(refs: ProjectAssetResourceRef[]): Promise<void>
  deleteProjectCache(projectId: string): Promise<void>
}

export interface ProjectAssetManagerOptions {
  localObjectStorage: ProjectObjectStorage
  remoteObjectStorage: ProjectObjectStorage
  cacheStorage: ProjectAssetCacheStorage
}

function canCreateObjectUrl() {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
}

function createBlobSource(blob: Blob): ResolvedProjectAssetResourceSource {
  if (!canCreateObjectUrl()) return { source: '', blob }
  const objectUrl = URL.createObjectURL(blob)
  return { source: objectUrl, objectUrl, blob }
}

function normalizeHash(hashSha256?: string | null) {
  return hashSha256?.trim() ?? ''
}

export function createProjectAssetFingerprint(ref: ProjectAssetResourceRef) {
  const hash = normalizeHash(ref.hashSha256)
  if (hash) return `sha256:${hash}`
  if (typeof ref.sizeBytes === 'number') return `weak:${ref.objectKey}:${ref.sizeBytes}`
  return `weak:${ref.objectKey}`
}

function downloadKey(ref: ProjectAssetResourceRef, fingerprint: string) {
  return `${ref.projectId}/${ref.role}/${ref.resourceId}/${fingerprint}`
}

export class DefaultProjectAssetManager implements ProjectAssetManager {
  private readonly localObjectStorage: ProjectObjectStorage
  private readonly remoteObjectStorage: ProjectObjectStorage
  private readonly cacheStorage: ProjectAssetCacheStorage
  private readonly remoteReadsInFlight = new Map<string, Promise<Blob>>()

  constructor(options: ProjectAssetManagerOptions) {
    this.localObjectStorage = options.localObjectStorage
    this.remoteObjectStorage = options.remoteObjectStorage
    this.cacheStorage = options.cacheStorage
  }

  async putResource(ref: ProjectAssetResourceRef, blob: Blob) {
    if (ref.projectMode === 'local') {
      await this.localObjectStorage.putObject(ref.objectKey, blob)
      return
    }
    await this.remoteObjectStorage.putObject(ref.objectKey, blob)
    await this.cacheStorage.putCachedResource(ref, createProjectAssetFingerprint(ref), blob)
  }

  async getResourceBlob(ref: ProjectAssetResourceRef) {
    if (ref.projectMode === 'local') {
      return this.localObjectStorage.getObject(ref.objectKey)
    }

    const fingerprint = createProjectAssetFingerprint(ref)
    const cached = await this.cacheStorage.getCachedResource(ref, fingerprint)
    if (cached) return cached

    const key = downloadKey(ref, fingerprint)
    const existing = this.remoteReadsInFlight.get(key)
    if (existing) return existing

    const read = this.downloadAndCache(ref, fingerprint)
    this.remoteReadsInFlight.set(key, read)
    try {
      return await read
    } finally {
      this.remoteReadsInFlight.delete(key)
    }
  }

  async resolveResourceSource(ref: ProjectAssetResourceRef) {
    return createBlobSource(await this.getResourceBlob(ref))
  }

  async deleteResources(refs: ProjectAssetResourceRef[]) {
    await Promise.all(refs.map(async (ref) => {
      const objectStorage = ref.projectMode === 'local' ? this.localObjectStorage : this.remoteObjectStorage
      await objectStorage.deleteObject(ref.objectKey)
      await this.cacheStorage.deleteCachedResource(ref)
    }))
  }

  async deleteProjectCache(projectId: string) {
    await this.cacheStorage.deleteProjectCache(projectId)
  }

  private async downloadAndCache(ref: ProjectAssetResourceRef, fingerprint: string) {
    await this.cacheStorage.deleteCachedResource(ref)
    const blob = await this.remoteObjectStorage.getObject(ref.objectKey)
    await this.cacheStorage.putCachedResource(ref, fingerprint, blob)
    return blob
  }
}

export function createProjectAssetManager(options: ProjectAssetManagerOptions) {
  return new DefaultProjectAssetManager(options)
}
