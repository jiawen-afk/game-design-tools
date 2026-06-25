import { getDesktopApi } from '../../desktopApi'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import type { ProjectAssetResourceRef } from './projectAssetManager'

export interface ProjectAssetCacheStorage {
  getCachedResource(ref: ProjectAssetResourceRef, expectedFingerprint: string): Promise<Blob | null>
  putCachedResource(ref: ProjectAssetResourceRef, fingerprint: string, blob: Blob): Promise<void>
  deleteCachedResource(ref: ProjectAssetResourceRef): Promise<void>
  deleteProjectCache(projectId: string): Promise<void>
}

interface CachedResourceEntry {
  ref: ProjectAssetResourceRef
  fingerprint: string
  blob: Blob
}

function cacheKey(ref: ProjectAssetResourceRef) {
  return `${ref.projectId}/${ref.role}/${ref.resourceId}`
}

export class MemoryProjectAssetCacheStorage implements ProjectAssetCacheStorage {
  private readonly entries = new Map<string, CachedResourceEntry>()

  async getCachedResource(ref: ProjectAssetResourceRef, expectedFingerprint: string) {
    const entry = this.entries.get(cacheKey(ref))
    if (!entry) return null
    if (entry.ref.objectKey !== ref.objectKey) return null
    if (entry.fingerprint !== expectedFingerprint) return null
    return entry.blob
  }

  async putCachedResource(ref: ProjectAssetResourceRef, fingerprint: string, blob: Blob) {
    this.entries.set(cacheKey(ref), { ref: { ...ref }, fingerprint, blob })
  }

  async deleteCachedResource(ref: ProjectAssetResourceRef) {
    this.entries.delete(cacheKey(ref))
  }

  async deleteProjectCache(projectId: string) {
    for (const [key, entry] of this.entries.entries()) {
      if (entry.ref.projectId === projectId) this.entries.delete(key)
    }
  }
}

export function createMemoryProjectAssetCacheStorage() {
  return new MemoryProjectAssetCacheStorage()
}

export class DesktopProjectAssetCacheStorage implements ProjectAssetCacheStorage {
  private readonly fallbackStorage = createMemoryProjectAssetCacheStorage()

  async getCachedResource(ref: ProjectAssetResourceRef, expectedFingerprint: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi?.getProjectAssetCacheResource) {
      return this.fallbackStorage.getCachedResource(ref, expectedFingerprint)
    }
    const result = await desktopApi.getProjectAssetCacheResource(ref, expectedFingerprint)
    if (!result) return null
    return blobFromDesktopBinaryData(result.data, result.mimeType || ref.mimeType || 'application/octet-stream')
  }

  async putCachedResource(ref: ProjectAssetResourceRef, fingerprint: string, blob: Blob) {
    const desktopApi = getDesktopApi()
    if (!desktopApi?.putProjectAssetCacheResource) {
      await this.fallbackStorage.putCachedResource(ref, fingerprint, blob)
      return
    }
    await desktopApi.putProjectAssetCacheResource(ref, fingerprint, await blob.arrayBuffer(), blob.type || ref.mimeType || 'application/octet-stream')
  }

  async deleteCachedResource(ref: ProjectAssetResourceRef) {
    const desktopApi = getDesktopApi()
    if (!desktopApi?.deleteProjectAssetCacheResource) {
      await this.fallbackStorage.deleteCachedResource(ref)
      return
    }
    await desktopApi.deleteProjectAssetCacheResource(ref)
  }

  async deleteProjectCache(projectId: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi?.deleteProjectAssetCacheForProject) {
      await this.fallbackStorage.deleteProjectCache(projectId)
      return
    }
    await desktopApi.deleteProjectAssetCacheForProject(projectId)
  }
}

export function createDesktopProjectAssetCacheStorage() {
  return new DesktopProjectAssetCacheStorage()
}
