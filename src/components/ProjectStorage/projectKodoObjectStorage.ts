import { getDesktopApi } from '../../desktopApi'
import type { ProjectObjectDeleteResult, ProjectObjectStorage } from './projectObjectStorage'

export class DesktopKodoProjectObjectStorage implements ProjectObjectStorage {
  private readonly getProfileId: () => string

  constructor(getProfileId: () => string) {
    this.getProfileId = getProfileId
  }

  async putObject(objectKey: string, data: Blob) {
    const desktopApi = this.requireDesktopApi()
    await desktopApi.putProjectKodoObject(
      this.requireProfileId(),
      objectKey,
      await data.arrayBuffer(),
      data.type || 'application/octet-stream',
    )
  }

  async getObject(_objectKey: string): Promise<Blob> {
    throw new Error('第一版远程对象存储不支持从 Kodo 读取对象。')
  }

  async deleteObject(objectKey: string) {
    const desktopApi = this.requireDesktopApi()
    await desktopApi.deleteProjectKodoObject(this.requireProfileId(), objectKey)
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

  private requireProfileId() {
    const profileId = this.getProfileId().trim()
    if (!profileId) throw new Error('缺少七牛 Kodo 配置。')
    return profileId
  }
}

export function createDesktopKodoProjectObjectStorage(getProfileId: () => string) {
  return new DesktopKodoProjectObjectStorage(getProfileId)
}
