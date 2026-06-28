import type { ProjectConnectionVerificationResult } from '../../desktopApi'
import {
  createInitialDatabaseProfileDraft,
  createInitialKodoProfileDraft,
  type DatabaseProfileDraft,
  type DraftTestState,
  type KodoProfileDraft,
  type ProfileEditMode,
} from './projectRemoteProfileDraftModel'
import {
  getDesktopApiForRemoteProfileAction,
} from './projectRemoteProfileActionGuards'
import type {
  MutableValue,
  RemoteProfileMessageApi,
  StateSetter,
} from './projectRemoteProfileActionTypes'
import type { ProjectRemoteProfileLists } from './projectRemoteProfileRefreshActions'

export interface ProjectRemoteProfileDeleteActionsOptions {
  messageApi: RemoteProfileMessageApi
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  previousDatabaseProfileDraftRef: MutableValue<DatabaseProfileDraft | null>
  refreshProfiles: () => Promise<ProjectRemoteProfileLists>
  setSelectedDatabaseProfileId: StateSetter<string>
  setSelectedKodoProfileId: StateSetter<string>
  setDatabaseProfileMode: StateSetter<ProfileEditMode>
  setKodoProfileMode: StateSetter<ProfileEditMode>
  setDatabaseVerification: StateSetter<ProjectConnectionVerificationResult | null>
  setKodoVerification: StateSetter<ProjectConnectionVerificationResult | null>
  setKodoVerificationProjectId: StateSetter<string>
  setDatabaseProfileDraft: StateSetter<DatabaseProfileDraft>
  setKodoProfileDraft: StateSetter<KodoProfileDraft>
  setDatabaseSchemaReady: StateSetter<boolean>
  setDatabaseDraftTestState: StateSetter<DraftTestState>
  setKodoDraftTestState: StateSetter<DraftTestState>
}

export function createProjectRemoteProfileDeleteActions(options: ProjectRemoteProfileDeleteActionsOptions) {
  const deleteDatabaseProfile = async () => {
    if (!options.selectedDatabaseProfileId) {
      void options.messageApi.warning('请先选择远程数据库配置')
      return
    }
    const desktopApi = getDesktopApiForRemoteProfileAction({
      messageApi: options.messageApi,
      runtimeUnavailableMessage: '当前桌面运行时不可用，无法删除远程数据库配置。',
    })
    if (desktopApi === null) return
    const deletedProfileId = options.selectedDatabaseProfileId
    const deleted = await desktopApi.deleteProjectConnectionProfile(deletedProfileId)
    const { databaseProfiles: nextDatabaseProfiles } = await options.refreshProfiles()
    if (!deleted) {
      void options.messageApi.warning('远程数据库配置不存在或已删除')
      return
    }
    options.setDatabaseProfileMode(nextDatabaseProfiles.length > 0 ? 'edit' : 'create')
    options.setSelectedDatabaseProfileId((current) => (
      current === deletedProfileId ? nextDatabaseProfiles[0]?.id || '' : current
    ))
    options.setDatabaseVerification(null)
    options.setDatabaseSchemaReady(false)
    options.setDatabaseDraftTestState('untested')
    if (nextDatabaseProfiles.length === 0) {
      options.previousDatabaseProfileDraftRef.current = null
      options.setDatabaseProfileDraft(createInitialDatabaseProfileDraft())
    }
    void options.messageApi.success('已删除远程数据库配置')
  }

  const deleteKodoProfile = async () => {
    if (!options.selectedKodoProfileId) {
      void options.messageApi.warning('请先选择七牛 Kodo 配置')
      return
    }
    const desktopApi = getDesktopApiForRemoteProfileAction({
      messageApi: options.messageApi,
      runtimeUnavailableMessage: '当前桌面运行时不可用，无法删除七牛 Kodo 配置。',
    })
    if (desktopApi === null) return
    const deletedProfileId = options.selectedKodoProfileId
    const deleted = await desktopApi.deleteProjectConnectionProfile(deletedProfileId)
    const { kodoProfiles: nextKodoProfiles } = await options.refreshProfiles()
    if (!deleted) {
      void options.messageApi.warning('七牛 Kodo 配置不存在或已删除')
      return
    }
    options.setKodoProfileMode(nextKodoProfiles.length > 0 ? 'edit' : 'create')
    options.setSelectedKodoProfileId((current) => (
      current === deletedProfileId ? nextKodoProfiles[0]?.id || '' : current
    ))
    options.setKodoVerification(null)
    options.setKodoVerificationProjectId('')
    options.setKodoDraftTestState('untested')
    if (nextKodoProfiles.length === 0) {
      options.setKodoProfileDraft(createInitialKodoProfileDraft())
    }
    void options.messageApi.success('已删除七牛 Kodo 配置')
  }

  return {
    deleteDatabaseProfile,
    deleteKodoProfile,
  }
}
