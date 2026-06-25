import { getDesktopApi } from '../../desktopApi'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import type { ProjectObjectDeleteResult, ProjectObjectStorage } from './projectObjectStorage'

export class DesktopKodoProjectObjectStorage implements ProjectObjectStorage {
  private readonly getProfileId: (objectKey?: string) => string

  constructor(getProfileId: (objectKey?: string) => string) {
    this.getProfileId = getProfileId
  }

  async putObject(objectKey: string, data: Blob) {
    const desktopApi = this.requireDesktopApi()
    await desktopApi.putProjectKodoObject(
      this.requireProfileId(objectKey),
      objectKey,
      await data.arrayBuffer(),
      data.type || 'application/octet-stream',
    )
  }

  async getObject(objectKey: string): Promise<Blob> {
    const desktopApi = this.requireDesktopApi()
    const result = await desktopApi.getProjectKodoObject(this.requireProfileId(objectKey), objectKey)
    return blobFromDesktopBinaryData(result.data, result.mimeType || 'application/octet-stream')
  }

  async deleteObject(objectKey: string) {
    const desktopApi = this.requireDesktopApi()
    await desktopApi.deleteProjectKodoObject(this.requireProfileId(objectKey), objectKey)
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

  private requireDesktopApi() {
    const desktopApi = getDesktopApi()
    if (!desktopApi) throw new Error('当前桌面运行时不可用，无法访问七牛 Kodo。')
    return desktopApi
  }

  private requireProfileId(objectKey?: string) {
    const profileId = this.getProfileId(objectKey).trim()
    if (!profileId) throw new Error('缺少七牛 Kodo 配置。')
    return profileId
  }
}

export function createDesktopKodoProjectObjectStorage(getProfileId: (objectKey?: string) => string) {
  return new DesktopKodoProjectObjectStorage(getProfileId)
}
