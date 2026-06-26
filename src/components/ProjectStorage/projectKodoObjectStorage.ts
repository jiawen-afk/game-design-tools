import { getDesktopApi } from '../../desktopApi'
import { blobFromDesktopBinaryData } from '../../desktopBinaryData'
import {
  deleteProjectObjectsIndividually,
  type ProjectObjectStorage,
  type ProjectObjectStorageContext,
} from './projectObjectStorage'

export class DesktopKodoProjectObjectStorage implements ProjectObjectStorage {
  private readonly getProfileId: (objectKey?: string, projectId?: string) => string

  constructor(getProfileId: (objectKey?: string, projectId?: string) => string) {
    this.getProfileId = getProfileId
  }

  async putObject(objectKey: string, data: Blob, context: ProjectObjectStorageContext = {}) {
    const desktopApi = this.requireDesktopApi()
    await desktopApi.putProjectKodoObject(
      this.requireProfileId(objectKey, context.projectId),
      objectKey,
      await data.arrayBuffer(),
      data.type || 'application/octet-stream',
    )
  }

  async getObject(objectKey: string, context: ProjectObjectStorageContext = {}): Promise<Blob> {
    const desktopApi = this.requireDesktopApi()
    const result = await desktopApi.getProjectKodoObject(this.requireProfileId(objectKey, context.projectId), objectKey)
    return blobFromDesktopBinaryData(result.data, result.mimeType || 'application/octet-stream')
  }

  async deleteObject(objectKey: string, context: ProjectObjectStorageContext = {}) {
    const desktopApi = this.requireDesktopApi()
    await desktopApi.deleteProjectKodoObject(this.requireProfileId(objectKey, context.projectId), objectKey)
  }

  async deleteObjects(objectKeys: string[]) {
    return deleteProjectObjectsIndividually(objectKeys, (objectKey) => this.deleteObject(objectKey))
  }

  private requireDesktopApi() {
    const desktopApi = getDesktopApi()
    if (!desktopApi) throw new Error('当前桌面运行时不可用，无法访问七牛 Kodo。')
    return desktopApi
  }

  private requireProfileId(objectKey?: string, projectId?: string) {
    const profileId = this.getProfileId(objectKey, projectId).trim()
    if (!profileId) throw new Error('缺少七牛 Kodo 配置。')
    return profileId
  }
}

export function createDesktopKodoProjectObjectStorage(getProfileId: (objectKey?: string, projectId?: string) => string) {
  return new DesktopKodoProjectObjectStorage(getProfileId)
}
