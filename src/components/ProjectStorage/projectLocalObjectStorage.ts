import { getDesktopApi } from '../../desktopApi'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import { deleteProjectObjectsIndividually, type ProjectObjectStorage } from './projectObjectStorage'

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

  async deleteObjects(objectKeys: string[]) {
    return deleteProjectObjectsIndividually(objectKeys, (objectKey) => this.deleteObject(objectKey))
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
    return blobFromDesktopBinaryData(result.data, result.mimeType || 'application/octet-stream')
  }

  async deleteObject(objectKey: string) {
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      await this.fallbackStorage.deleteObject(objectKey)
      return
    }
    await desktopApi.deleteLocalProjectObject(objectKey)
  }

  async deleteObjects(objectKeys: string[]) {
    return deleteProjectObjectsIndividually(objectKeys, (objectKey) => this.deleteObject(objectKey))
  }
}

export function createDesktopLocalProjectObjectStorage() {
  return new DesktopLocalProjectObjectStorage()
}
