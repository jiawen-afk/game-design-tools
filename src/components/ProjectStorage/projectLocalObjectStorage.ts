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
