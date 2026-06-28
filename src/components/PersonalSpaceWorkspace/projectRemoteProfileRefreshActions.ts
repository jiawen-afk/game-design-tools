import type { ProjectConnectionProfileSummary } from '../../desktopApi'
import {
  getDesktopApiForRemoteProfileAction,
  type RemoteProfileActionMessageApi,
} from './projectRemoteProfileActionGuards'

type StateSetter<T> = (next: T | ((current: T) => T)) => void

export interface ProjectRemoteProfileRefreshOptions {
  messageApi: RemoteProfileActionMessageApi
  setDatabaseProfiles: StateSetter<ProjectConnectionProfileSummary[]>
  setKodoProfiles: StateSetter<ProjectConnectionProfileSummary[]>
}

export interface ProjectRemoteProfileLists {
  databaseProfiles: ProjectConnectionProfileSummary[]
  kodoProfiles: ProjectConnectionProfileSummary[]
}

export async function refreshProjectConnectionProfiles(
  options: ProjectRemoteProfileRefreshOptions,
): Promise<ProjectRemoteProfileLists> {
  const desktopApi = getDesktopApiForRemoteProfileAction({
    messageApi: options.messageApi,
    runtimeUnavailableMessage: '当前桌面运行时不可用，无法刷新远程连接配置。',
  })
  if (desktopApi === null) return { databaseProfiles: [], kodoProfiles: [] }

  const [nextDatabaseProfiles, nextKodoProfiles] = await Promise.all([
    desktopApi.listProjectConnectionProfiles('database'),
    desktopApi.listProjectConnectionProfiles('qiniu_kodo'),
  ])
  options.setDatabaseProfiles(nextDatabaseProfiles)
  options.setKodoProfiles(nextKodoProfiles)
  return { databaseProfiles: nextDatabaseProfiles, kodoProfiles: nextKodoProfiles }
}
