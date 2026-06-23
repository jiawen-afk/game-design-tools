import { getDesktopApi } from '../../desktopApi'
import type { ProjectObjectDeleteResult, ProjectObjectStorage } from './projectObjectStorage'

export interface MemoryProjectObjectStorageOptions {
  failDeleteKeys?: Set<string>
}

export class MemoryProjectObjectStorage implements ProjectObjectStorage {
  private objects = new Map<string, Blob>()
  private readonly failDeleteKeys: Set<string>

  constructor(options: MemoryProjectObjectStorageOptions = {}) {
    this.failDeleteKeys = options.failDeleteKeys ?? new Set()
  }

  async putObject(objectKey: string, data: Blob) {
    this.objects.set(objectKey, data)
  }

  async getObject(objectKey: string) {
    const data = this.objects.get(objectKey)
    if (!data) throw new Error(`对象不存在：${objectKey}`)
    return data
  }

  async deleteObject(objectKey: string) {
    if (this.failDeleteKeys.has(objectKey)) throw new Error('删除对象失败')
    this.objects.delete(objectKey)
  }

  async deleteObjects(objectKeys: string[]): Promise<ProjectObjectDeleteResult> {
    const deletedKeys: string[] = []
    const failed: ProjectObjectDeleteResult['failed'] = []
    for (const objectKey of objectKeys) {
      try {
        await this.deleteObject(objectKey)
        deletedKeys.push(objectKey)
      } catch (error) {
        failed.push({ objectKey, errorMessage: error instanceof Error ? error.message : String(error) })
      }
    }
    return { deletedKeys, failed }
  }
}

export function createMemoryProjectObjectStorage(options?: MemoryProjectObjectStorageOptions) {
  return new MemoryProjectObjectStorage(options)
}

export class DesktopLocalProjectObjectStorage implements ProjectObjectStorage {
  private readonly fallbackStorage = createMemoryProjectObjectStorage()

  async putObject(objectKey: string, data: Blob) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      await this.fallbackStorage.putObject(objectKey, data)
      return
    }
    await desktopApi.putLocalProjectObject(
      objectKey,
      await data.arrayBuffer(),
      data.type || 'application/octet-stream',
    )
  }

  async getObject(objectKey: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return this.fallbackStorage.getObject(objectKey)
    const result = await desktopApi.getLocalProjectObject(objectKey)
    const bytes = result.data instanceof ArrayBuffer ? new Uint8Array(result.data) : result.data
    const data = new Uint8Array(bytes.byteLength)
    data.set(bytes)
    return new Blob([data.buffer], { type: result.mimeType || 'application/octet-stream' })
  }

  async deleteObject(objectKey: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      await this.fallbackStorage.deleteObject(objectKey)
      return
    }
    await desktopApi.deleteLocalProjectObject(objectKey)
  }

  async deleteObjects(objectKeys: string[]): Promise<ProjectObjectDeleteResult> {
    const deletedKeys: string[] = []
    const failed: ProjectObjectDeleteResult['failed'] = []
    for (const objectKey of objectKeys) {
      try {
        await this.deleteObject(objectKey)
        deletedKeys.push(objectKey)
      } catch (error) {
        failed.push({ objectKey, errorMessage: error instanceof Error ? error.message : String(error) })
      }
    }
    return { deletedKeys, failed }
  }
}

export function createDesktopLocalProjectObjectStorage() {
  return new DesktopLocalProjectObjectStorage()
}
