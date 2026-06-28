import {
  validateDatabaseProfileInput,
  validateKodoProfileInput,
} from '../ProjectStorage'
import { getDesktopApiForRemoteProfileAction } from './projectRemoteProfileActionGuards'
import type { ProjectRemoteProfileActionsOptions } from './projectRemoteProfileActionTypes'
import type { ProjectRemoteProfileLists } from './projectRemoteProfileRefreshActions'

type ProjectRemoteProfileVerificationActionsOptions = Pick<
  ProjectRemoteProfileActionsOptions,
  | 'messageApi'
  | 'selectedDatabaseProfileId'
  | 'selectedKodoProfileId'
  | 'databaseProfileDraft'
  | 'kodoProfileDraft'
  | 'databaseDraftStatus'
  | 'kodoDraftStatus'
  | 'setDatabaseVerification'
  | 'setKodoVerification'
  | 'setKodoVerificationProjectId'
  | 'setDatabaseSchemaReady'
  | 'setDatabaseDraftTestState'
  | 'setKodoDraftTestState'
> & {
  refreshProfiles: () => Promise<ProjectRemoteProfileLists>
}

export function createProjectRemoteProfileVerificationActions(
  options: ProjectRemoteProfileVerificationActionsOptions,
) {
  const verifyDatabaseProfile = async () => {
    const desktopApi = getDesktopApiForRemoteProfileAction({
      messageApi: options.messageApi,
      validationErrors: validateDatabaseProfileInput(options.databaseProfileDraft, {
        existing: options.databaseDraftStatus.isExisting,
      }),
      runtimeUnavailableMessage: '当前桌面运行时不可用，无法测试远程数据库配置',
    })
    if (desktopApi === null) return
    const result = await desktopApi.verifyProjectDatabaseProfileDraft(
      options.databaseProfileDraft,
      options.databaseDraftStatus.isExisting ? options.selectedDatabaseProfileId : undefined,
    )
    options.setDatabaseVerification(result)
    options.setDatabaseDraftTestState(result.ok ? 'passed' : 'failed')
    if (!result.ok) options.setDatabaseSchemaReady(false)
    await options.refreshProfiles()
    void (result.ok ? options.messageApi.success(result.message) : options.messageApi.warning(result.message))
  }

  const initializeDatabaseSchema = async () => {
    if (!options.selectedDatabaseProfileId) {
      void options.messageApi.warning('请先保存并选择远程数据库配置')
      return
    }
    const desktopApi = getDesktopApiForRemoteProfileAction({
      messageApi: options.messageApi,
      runtimeUnavailableMessage: '当前桌面运行时不可用，无法初始化远程数据库表结构。',
    })
    if (desktopApi === null) return
    const result = await desktopApi.initializeProjectDatabaseSchema(
      options.selectedDatabaseProfileId,
      options.databaseProfileDraft.provider,
    )
    options.setDatabaseSchemaReady(result.ok)
    if (result.ok) await options.refreshProfiles()
    void (result.ok ? options.messageApi.success(result.message) : options.messageApi.warning(result.message))
  }

  const verifyKodoProfile = async (projectId: string) => {
    const desktopApi = getDesktopApiForRemoteProfileAction({
      messageApi: options.messageApi,
      validationErrors: validateKodoProfileInput(options.kodoProfileDraft, {
        existing: options.kodoDraftStatus.isExisting,
      }),
      runtimeUnavailableMessage: '当前桌面运行时不可用，无法验证七牛 Kodo 配置',
    })
    if (desktopApi === null) return
    const result = await desktopApi.verifyProjectKodoProfileDraft(
      options.kodoProfileDraft,
      projectId,
      options.kodoDraftStatus.isExisting ? options.selectedKodoProfileId : undefined,
    )
    options.setKodoVerification(result)
    options.setKodoDraftTestState(result.ok ? 'passed' : 'failed')
    options.setKodoVerificationProjectId(result.ok ? projectId : '')
    await options.refreshProfiles()
    void (result.ok ? options.messageApi.success(result.message) : options.messageApi.warning(result.message))
  }

  return {
    initializeDatabaseSchema,
    verifyDatabaseProfile,
    verifyKodoProfile,
  }
}
