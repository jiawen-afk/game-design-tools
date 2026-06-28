import type { ProjectAssetResourceRef } from './components/ProjectStorage'

export interface DesktopProjectObjectReadResult {
  data: ArrayBuffer | Uint8Array
  mimeType: string
}

export interface DesktopProjectObjectApi {
  putLocalProjectObject(objectKey: string, data: ArrayBuffer, mimeType?: string): Promise<boolean>
  getLocalProjectObject(objectKey: string): Promise<DesktopProjectObjectReadResult>
  deleteLocalProjectObject(objectKey: string): Promise<boolean>
  getProjectAssetCacheResource(ref: ProjectAssetResourceRef, expectedFingerprint: string): Promise<DesktopProjectObjectReadResult | null>
  putProjectAssetCacheResource(ref: ProjectAssetResourceRef, fingerprint: string, data: ArrayBuffer, mimeType?: string): Promise<boolean>
  deleteProjectAssetCacheResource(ref: ProjectAssetResourceRef): Promise<boolean>
  deleteProjectAssetCacheForProject(projectId: string): Promise<boolean>
  putProjectKodoObject(profileId: string, objectKey: string, data: ArrayBuffer, mimeType?: string): Promise<boolean>
  getProjectKodoObject(profileId: string, objectKey: string): Promise<DesktopProjectObjectReadResult>
  deleteProjectKodoObject(profileId: string, objectKey: string): Promise<boolean>
}
