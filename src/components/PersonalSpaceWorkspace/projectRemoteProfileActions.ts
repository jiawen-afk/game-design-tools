import type {
  ProjectConnectionProfileSummary,
  ProjectConnectionVerificationResult,
} from '../../desktopApi'
import { getDesktopApi } from '../../desktopApi'
import {
  createEditableDatabaseProfileDraft,
  validateDatabaseProfileInput,
  validateKodoProfileInput,
} from '../ProjectStorage'
import {
  createDatabaseProfileSaveInput,
  createKodoProfileSaveInput,
  type DatabaseProfileDraft,
  type DraftTestState,
  type KodoProfileDraft,
  type ProfileEditMode,
} from './projectRemoteProfileDraftModel'

interface RemoteProfileMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
}

interface RemoteProfileDraftStatus {
  isExisting: boolean
  draftTested: boolean
}

type StateSetter<T> = (next: T | ((current: T) => T)) => void

interface MutableValue<T> {
  current: T
}

export interface ProjectRemoteProfileActionsOptions {
  messageApi: RemoteProfileMessageApi
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  selectedDatabaseProfile?: ProjectConnectionProfileSummary
  databaseProfileMode: ProfileEditMode
  kodoProfileMode: ProfileEditMode
  databaseProfileDraft: DatabaseProfileDraft
  kodoProfileDraft: KodoProfileDraft
  databaseVerification: ProjectConnectionVerificationResult | null
  kodoVerification: ProjectConnectionVerificationResult | null
  databaseDraftStatus: RemoteProfileDraftStatus
  kodoDraftStatus: RemoteProfileDraftStatus
  previousDatabaseProfileDraftRef: MutableValue<DatabaseProfileDraft | null>
  skipNextDatabaseProfileLoadRef: MutableValue<boolean>
  skipNextKodoProfileLoadRef: MutableValue<boolean>
  setDatabaseProfiles: StateSetter<ProjectConnectionProfileSummary[]>
  setKodoProfiles: StateSetter<ProjectConnectionProfileSummary[]>
  setSelectedDatabaseProfileId: StateSetter<string>
  setSelectedKodoProfileId: StateSetter<string>
  setDatabaseProfileMode: StateSetter<ProfileEditMode>
  setKodoProfileMode: StateSetter<ProfileEditMode>
  setDatabaseVerification: StateSetter<ProjectConnectionVerificationResult | null>
  setKodoVerification: StateSetter<ProjectConnectionVerificationResult | null>
  setKodoVerificationProjectId: StateSetter<string>
  setDatabaseSchemaReady: StateSetter<boolean>
  setDatabaseDraftTestState: StateSetter<DraftTestState>
  setKodoDraftTestState: StateSetter<DraftTestState>
}

export function createProjectRemoteProfileActions(options: ProjectRemoteProfileActionsOptions) {
  const refreshProjectConnectionProfiles = async () => {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return { databaseProfiles: [], kodoProfiles: [] }
    const [nextDatabaseProfiles, nextKodoProfiles] = await Promise.all([
      desktopApi.listProjectConnectionProfiles('database'),
      desktopApi.listProjectConnectionProfiles('qiniu_kodo'),
    ])
    options.setDatabaseProfiles(nextDatabaseProfiles)
    options.setKodoProfiles(nextKodoProfiles)
    return { databaseProfiles: nextDatabaseProfiles, kodoProfiles: nextKodoProfiles }
  }

  const saveDatabaseProfile = async () => {
    const errors = validateDatabaseProfileInput(options.databaseProfileDraft, {
      existing: options.databaseDraftStatus.isExisting,
    })
    if (errors.length > 0) {
      void options.messageApi.warning(errors[0]!)
      return false
    }
    if (!options.databaseDraftStatus.draftTested) {
      void options.messageApi.warning('请先测试远程数据库配置')
      return false
    }
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      void options.messageApi.warning('当前桌面运行时不可用，无法保存远程数据库配置。')
      return false
    }
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

  const deleteDatabaseProfile = async () => {
    const desktopApi = getDesktopApi()
    if (!desktopApi || !options.selectedDatabaseProfileId) {
      void options.messageApi.warning('请先选择远程数据库配置')
      return
    }
    const deletedProfileId = options.selectedDatabaseProfileId
    const deleted = await desktopApi.deleteProjectConnectionProfile(deletedProfileId)
    const { databaseProfiles: nextDatabaseProfiles } = await refreshProjectConnectionProfiles()
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
    void options.messageApi.success('已删除远程数据库配置')
  }

  const saveKodoProfile = async () => {
    const errors = validateKodoProfileInput(options.kodoProfileDraft, {
      existing: options.kodoDraftStatus.isExisting,
    })
    if (errors.length > 0) {
      void options.messageApi.warning(errors[0]!)
      return false
    }
    if (!options.kodoDraftStatus.draftTested) {
      void options.messageApi.warning('请先验证七牛 Kodo 配置')
      return false
    }
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      void options.messageApi.warning('当前桌面运行时不可用，无法保存七牛 Kodo 配置。')
      return false
    }
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

  const deleteKodoProfile = async () => {
    const desktopApi = getDesktopApi()
    if (!desktopApi || !options.selectedKodoProfileId) {
      void options.messageApi.warning('请先选择七牛 Kodo 配置')
      return
    }
    const deletedProfileId = options.selectedKodoProfileId
    const deleted = await desktopApi.deleteProjectConnectionProfile(deletedProfileId)
    const { kodoProfiles: nextKodoProfiles } = await refreshProjectConnectionProfiles()
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
    void options.messageApi.success('已删除七牛 Kodo 配置')
  }

  const verifyDatabaseProfile = async () => {
    const desktopApi = getDesktopApi()
    const errors = validateDatabaseProfileInput(options.databaseProfileDraft, {
      existing: options.databaseDraftStatus.isExisting,
    })
    if (errors.length > 0) {
      void options.messageApi.warning(errors[0]!)
      return
    }
    if (!desktopApi) {
      void options.messageApi.warning('当前桌面运行时不可用，无法测试远程数据库配置')
      return
    }
    const result = await desktopApi.verifyProjectDatabaseProfileDraft(
      options.databaseProfileDraft,
      options.databaseDraftStatus.isExisting ? options.selectedDatabaseProfileId : undefined,
    )
    options.setDatabaseVerification(result)
    options.setDatabaseDraftTestState(result.ok ? 'passed' : 'failed')
    if (!result.ok) options.setDatabaseSchemaReady(false)
    await refreshProjectConnectionProfiles()
    void (result.ok ? options.messageApi.success(result.message) : options.messageApi.warning(result.message))
  }

  const initializeDatabaseSchema = async () => {
    const desktopApi = getDesktopApi()
    if (!desktopApi || !options.selectedDatabaseProfileId) {
      void options.messageApi.warning('请先保存并选择远程数据库配置')
      return
    }
    const result = await desktopApi.initializeProjectDatabaseSchema(
      options.selectedDatabaseProfileId,
      options.databaseProfileDraft.provider,
    )
    options.setDatabaseSchemaReady(result.ok)
    if (result.ok) await refreshProjectConnectionProfiles()
    void (result.ok ? options.messageApi.success(result.message) : options.messageApi.warning(result.message))
  }

  const verifyKodoProfile = async (projectId: string) => {
    const desktopApi = getDesktopApi()
    const errors = validateKodoProfileInput(options.kodoProfileDraft, {
      existing: options.kodoDraftStatus.isExisting,
    })
    if (errors.length > 0) {
      void options.messageApi.warning(errors[0]!)
      return
    }
    if (!desktopApi) {
      void options.messageApi.warning('当前桌面运行时不可用，无法验证七牛 Kodo 配置')
      return
    }
    const result = await desktopApi.verifyProjectKodoProfileDraft(
      options.kodoProfileDraft,
      projectId,
      options.kodoDraftStatus.isExisting ? options.selectedKodoProfileId : undefined,
    )
    options.setKodoVerification(result)
    options.setKodoDraftTestState(result.ok ? 'passed' : 'failed')
    options.setKodoVerificationProjectId(result.ok ? projectId : '')
    await refreshProjectConnectionProfiles()
    void (result.ok ? options.messageApi.success(result.message) : options.messageApi.warning(result.message))
  }

  return {
    deleteDatabaseProfile,
    deleteKodoProfile,
    initializeDatabaseSchema,
    saveDatabaseProfile,
    saveKodoProfile,
    verifyDatabaseProfile,
    verifyKodoProfile,
  }
}
