import {
  createEditableDatabaseProfileDraft,
  validateDatabaseProfileInput,
  validateKodoProfileInput,
} from '../ProjectStorage'
import {
  createDatabaseProfileSaveInput,
  createKodoProfileSaveInput,
} from './projectRemoteProfileDraftModel'
import { getDesktopApiForRemoteProfileAction } from './projectRemoteProfileActionGuards'
import type { ProjectRemoteProfileActionsOptions } from './projectRemoteProfileActionTypes'

type ProjectRemoteProfileSaveActionsOptions = Pick<
  ProjectRemoteProfileActionsOptions,
  | 'messageApi'
  | 'databaseProfileMode'
  | 'kodoProfileMode'
  | 'selectedDatabaseProfileId'
  | 'selectedKodoProfileId'
  | 'selectedDatabaseProfile'
  | 'databaseProfileDraft'
  | 'kodoProfileDraft'
  | 'databaseVerification'
  | 'kodoVerification'
  | 'databaseDraftStatus'
  | 'kodoDraftStatus'
  | 'previousDatabaseProfileDraftRef'
  | 'skipNextDatabaseProfileLoadRef'
  | 'skipNextKodoProfileLoadRef'
  | 'setDatabaseProfiles'
  | 'setKodoProfiles'
  | 'setSelectedDatabaseProfileId'
  | 'setSelectedKodoProfileId'
  | 'setDatabaseProfileMode'
  | 'setKodoProfileMode'
  | 'setDatabaseSchemaReady'
>

export function createProjectRemoteProfileSaveActions(options: ProjectRemoteProfileSaveActionsOptions) {
  const saveDatabaseProfile = async () => {
    const desktopApi = getDesktopApiForRemoteProfileAction({
      messageApi: options.messageApi,
      validationErrors: validateDatabaseProfileInput(options.databaseProfileDraft, {
        existing: options.databaseDraftStatus.isExisting,
      }),
      draftTested: options.databaseDraftStatus.draftTested,
      untestedMessage: '请先测试远程数据库配置',
      runtimeUnavailableMessage: '当前桌面运行时不可用，无法保存远程数据库配置。',
    })
    if (desktopApi === null) return false
    const summary = await desktopApi.saveProjectConnectionProfile(createDatabaseProfileSaveInput({
      mode: options.databaseProfileMode,
      selectedProfileId: options.selectedDatabaseProfileId,
      selectedProfile: options.selectedDatabaseProfile,
      draft: options.databaseProfileDraft,
      previousDraft: options.previousDatabaseProfileDraftRef.current,
      verification: options.databaseVerification,
    }))
    options.previousDatabaseProfileDraftRef.current = createEditableDatabaseProfileDraft(options.databaseProfileDraft)
    options.setDatabaseProfiles((current) => [...current.filter((profile) => profile.id !== summary.id), summary])
    options.skipNextDatabaseProfileLoadRef.current = options.databaseProfileMode === 'create'
    options.setSelectedDatabaseProfileId(summary.id)
    options.setDatabaseProfileMode('edit')
    options.setDatabaseSchemaReady(Boolean(summary.schemaInitializedAt))
    void options.messageApi.success('已保存远程数据库配置')
    return true
  }

  const saveKodoProfile = async () => {
    const desktopApi = getDesktopApiForRemoteProfileAction({
      messageApi: options.messageApi,
      validationErrors: validateKodoProfileInput(options.kodoProfileDraft, {
        existing: options.kodoDraftStatus.isExisting,
      }),
      draftTested: options.kodoDraftStatus.draftTested,
      untestedMessage: '请先验证七牛 Kodo 配置',
      runtimeUnavailableMessage: '当前桌面运行时不可用，无法保存七牛 Kodo 配置。',
    })
    if (desktopApi === null) return false
    const summary = await desktopApi.saveProjectConnectionProfile(createKodoProfileSaveInput({
      mode: options.kodoProfileMode,
      selectedProfileId: options.selectedKodoProfileId,
      draft: options.kodoProfileDraft,
      verification: options.kodoVerification,
    }))
    options.setKodoProfiles((current) => [...current.filter((profile) => profile.id !== summary.id), summary])
    options.skipNextKodoProfileLoadRef.current = options.kodoProfileMode === 'create'
    options.setSelectedKodoProfileId(summary.id)
    options.setKodoProfileMode('edit')
    void options.messageApi.success('已保存七牛 Kodo 配置')
    return true
  }

  return {
    saveDatabaseProfile,
    saveKodoProfile,
  }
}
